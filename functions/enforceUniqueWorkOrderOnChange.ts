import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getYear(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.getFullYear();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }

    const event = payload?.event;
    const data = payload?.data;

    if (!data?.id) {
      return Response.json({ ok: true, skipped: 'no data in payload' });
    }

    const createdISO = data.created_date || new Date().toISOString();
    const year = getYear(createdISO);

    // Resolve branch
    let branchId = data.branch_id || null;
    if (!branchId && data.project_id) {
      try {
        const proj = await base44.asServiceRole.entities.Project.get(data.project_id);
        branchId = proj?.branch_id || null;
      } catch {
        // ignore
      }
    }
    if (!branchId) {
      return Response.json({ ok: true, skipped: 'no branch_id resolved' });
    }

    const won = data.work_order_number;
    const isFormatted = typeof won === 'string' && /^\d{4}\/\d{2}$/.test(won);
    if (!isFormatted) {
      // Not in target format; creation hook assigns numbers. Do nothing here.
      return Response.json({ ok: true, skipped: 'won not formatted' });
    }

    // Check for duplicates of this exact number within branch
    const dupes = await base44.asServiceRole.entities.TimeEntry.filter({
      work_order_number: won,
      branch_id: branchId
    }, undefined, 3);

    if (Array.isArray(dupes) && dupes.length > 1) {
      // Prevent loops with a short KV lock per branch+year
      const kv = await Deno.openKv();
      const lockKey = ['wo_renumber_lock', branchId, String(year)];
      const existing = await kv.get(lockKey);
      if (existing.value) {
        return Response.json({ ok: true, locked: true });
      }
      const tx = kv.atomic();
      tx.check(existing);
      tx.set(lockKey, { at: Date.now() }, { expireIn: 30000 });
      const committed = await tx.commit();
      if (!committed.ok) {
        return Response.json({ ok: true, locked: true });
      }

      // Invoke centralized renumber for this branch+year (anchored to created_date)
      const res = await base44.functions.invoke('renumberWorkOrders', {
        dry_run: false,
        years: [year],
        branch_ids: [branchId]
      });

      // Log on the triggering entry
      try {
        const now = new Date().toISOString();
        const entry = await base44.asServiceRole.entities.TimeEntry.get(data.id);
        const activity = Array.isArray(entry?.activity_log) ? entry.activity_log : [];
        activity.push({
          timestamp: now,
          action: 'Edited',
          user_email: 'system@base44',
          user_name: 'Auto-Renumber',
          details: `Auto renumber triggered due to duplicate ${won} in ${branchId}/${year}`
        });
        await base44.asServiceRole.entities.TimeEntry.update(data.id, { activity_log: activity });
      } catch {
        // ignore log errors
      }

      return Response.json({ ok: true, invoked: true, result: res?.data || null });
    }

    return Response.json({ ok: true, no_duplicates: true });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || 'failed' }, { status: 500 });
  }
});