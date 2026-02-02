import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function yearFromISO(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.getFullYear();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }

    const years = Array.isArray(payload?.years) && payload.years.length > 0
      ? payload.years
      : [new Date().getFullYear() - 1, new Date().getFullYear()];

    let woAssigned = 0;
    let wrAssigned = 0;

    // Backfill + Renumber WO numbers (uniqueness by branch+year; preserve date order)
    try {
      const allWO = await base44.asServiceRole.entities.TimeEntry.list();
      const withDates = allWO.filter(w => (yearFromISO(w.planned_start_time) || yearFromISO(w.created_date)) && w.branch_id);

      const groups = new Map(); // key: branch_id::year(4)
      for (const w of withDates) {
        const y = yearFromISO(w.planned_start_time) || yearFromISO(w.created_date);
        const key = `${w.branch_id}::${y}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(w);
      }

      for (const [key, items] of groups) {
        const [branchId, y4] = key.split('::');
        const yy = String(y4).slice(-2);

        // Only process requested years
        if (!years.includes(Number(y4))) continue;

        // Sort by planned_start_time then created_date (asc)
        items.sort((a,b) => {
          const ta = new Date(a.planned_start_time || a.created_date).getTime();
          const tb = new Date(b.planned_start_time || b.created_date).getTime();
          return ta - tb;
        });

        const parseNum = (s) => {
          if (!s) return null;
          const m = String(s).trim().match(/^(\d{3,4})\/(\d{2})$/);
          if (!m) return null;
          if (m[2] !== yy) return null;
          return parseInt(m[1], 10);
        };

        const used = new Set();
        const firstSeen = new Map(); // num -> id
        let maxNum = 0;

        // Pre-scan valid numbers
        for (const it of items) {
          const n = parseNum(it.work_order_number);
          if (n) {
            if (!used.has(n)) {
              used.add(n);
              firstSeen.set(n, it.id);
              if (n > maxNum) maxNum = n;
            }
          }
        }

        let counter = maxNum;
        const updates = [];

        for (const it of items) {
          const n = parseNum(it.work_order_number);
          const legacyLike = !n && typeof it.work_order_number === 'string' && /^N\d+/i.test(it.work_order_number.trim());
          const isDupBeyondFirst = n ? firstSeen.get(n) !== it.id : false;
          const invalid = !n || isDupBeyondFirst || legacyLike;

          if (invalid) {
            counter += 1;
            const newNumber = String(counter).padStart(4, '0') + '/' + yy;
            updates.push({ id: it.id, work_order_number: newNumber });
          }
        }

        for (const u of updates) {
          await base44.asServiceRole.entities.TimeEntry.update(u.id, { work_order_number: u.work_order_number });
          woAssigned++;
        }

        // Sync counter entity to new max
        if (counter > maxNum) {
          try {
            let ctrArr = await base44.asServiceRole.entities.WorkOrderCounter.filter({ branch_id: branchId, year: String(y4) }, '-updated_date', 1);
            let ctr = ctrArr?.[0] || null;
            if (!ctr) {
              await base44.asServiceRole.entities.WorkOrderCounter.create({ branch_id: branchId, year: String(y4), last_number: counter });
            } else if ((ctr.last_number || 0) < counter) {
              await base44.asServiceRole.entities.WorkOrderCounter.update(ctr.id, { last_number: counter });
            }
          } catch (_) { /* ignore */ }
        }
      }
    } catch (_) { /* ignore */ }

    // Backfill WR numbers (only if entity exists)
    try {
      const allWR = await base44.asServiceRole.entities.WorkingReport.list();
      // Only number WR if there is a real clock-in (start_time)
      const candidatesWR = allWR.filter(wr => !wr.report_number && wr.start_time && yearFromISO(wr.start_time) && wr.branch_id);
      candidatesWR.sort((a,b) => {
        if (a.branch_id !== b.branch_id) return (a.branch_id||'').localeCompare(b.branch_id||'');
        const ya = yearFromISO(a.start_time);
        const yb = yearFromISO(b.start_time);
        if (ya !== yb) return (ya||0) - (yb||0);
        const ta = new Date(a.start_time).getTime();
        const tb = new Date(b.start_time).getTime();
        return ta - tb;
      });

      for (const wr of candidatesWR) {
        const y = yearFromISO(wr.start_time);
        if (!years.includes(y)) continue;
        const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: wr.branch_id, date: wr.start_time });
        const number = res?.data;
        if (number) {
          await base44.asServiceRole.entities.WorkingReport.update(wr.id, { report_number: number });
          wrAssigned++;
        }
      }
    } catch (_) { /* ignore */ }

    return Response.json({ success: true, years, woAssigned, wrAssigned });
  } catch (error) {
    return Response.json({ error: error?.message || 'Backfill failed' }, { status: 500 });
  }
});