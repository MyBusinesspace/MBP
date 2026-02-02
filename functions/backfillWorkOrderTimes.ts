import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Backfills TimeEntry (Work Order) start/end/duration from TimesheetEntry segments
// Payload options (JSON):
// {
//   "date": "YYYY-MM-DD" // single day
//   OR
//   "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" // inclusive range
//   OR
//   "work_order_id": "..." // limit to a single WO (optional, still constrained by date/range if provided)
// }
// Admin only

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const todayStr = new Date().toISOString().slice(0, 10);

    const dateStr = typeof body.date === 'string' ? body.date : null;
    const startStr = typeof body.start_date === 'string' ? body.start_date : null;
    const endStr = typeof body.end_date === 'string' ? body.end_date : null;
    const targetWO = typeof body.work_order_id === 'string' ? body.work_order_id : null;

    // Build date range (inclusive)
    let rangeStart = startStr ? new Date(startStr + 'T00:00:00') : null;
    let rangeEnd = endStr ? new Date(endStr + 'T23:59:59.999') : null;

    if (!rangeStart && !rangeEnd) {
      const d = new Date((dateStr || todayStr) + 'T00:00:00');
      rangeStart = d;
      rangeEnd = new Date((dateStr || todayStr) + 'T23:59:59.999');
    }

    // Helper: check if ISO date-time falls within range
    const inRange = (iso) => {
      if (!iso) return false;
      const t = new Date(iso);
      return t >= rangeStart && t <= rangeEnd;
    };

    // Load timesheets (limit reasonably high for one or few days)
    // We list and filter locally by date range
    let timesheets = await base44.asServiceRole.entities.TimesheetEntry.list('-clock_in_time', 3000);

    // Narrow by intersection with date range
    timesheets = timesheets.filter((ts) => {
      const ci = ts.clock_in_time ? new Date(ts.clock_in_time) : null;
      const co = ts.clock_out_time ? new Date(ts.clock_out_time) : null;
      const interClockTimes = (ci && ci <= rangeEnd && ci >= rangeStart) || (co && co <= rangeEnd && co >= rangeStart);

      // Or any segment intersecting range
      const segHit = Array.isArray(ts.work_order_segments)
        ? ts.work_order_segments.some((seg) => {
            if (!seg?.work_order_id) return false;
            const s = seg.start_time ? new Date(seg.start_time) : null;
            const e = seg.end_time ? new Date(seg.end_time) : null;
            const segIntersects = (s && s <= rangeEnd && s >= rangeStart) || (e && e <= rangeEnd && e >= rangeStart);
            return segIntersects;
          })
        : false;

      return interClockTimes || segHit;
    });

    // Build WO aggregates from segments
    const woMap = new Map();
    for (const ts of timesheets) {
      const segments = Array.isArray(ts.work_order_segments) ? ts.work_order_segments : [];
      for (const seg of segments) {
        if (!seg?.work_order_id) continue;
        // Respect optional WO filter
        if (targetWO && seg.work_order_id !== targetWO) continue;

        const sInRange = inRange(seg.start_time);
        const eInRange = inRange(seg.end_time);

        // Only consider segments that touch the range
        if (!sInRange && !eInRange) continue;

        const rec = woMap.get(seg.work_order_id) || {
          earliestStart: null,
          latestEnd: null,
          totalDuration: 0,
          firstTimesheetClockIn: null,
          firstTimesheetAddress: null,
        };

        if (sInRange) {
          const s = new Date(seg.start_time);
          if (!rec.earliestStart || s < new Date(rec.earliestStart)) {
            rec.earliestStart = seg.start_time;
            // Use the timesheet clock-in meta when this segment starts the day for this WO
            if (ts.clock_in_time && inRange(ts.clock_in_time)) {
              rec.firstTimesheetClockIn = ts.clock_in_time;
              rec.firstTimesheetAddress = ts.clock_in_address || null;
            }
          }
        }
        if (eInRange) {
          if (!rec.latestEnd || new Date(seg.end_time) > new Date(rec.latestEnd)) {
            rec.latestEnd = seg.end_time;
          }
        }

        // Prefer provided segment duration; otherwise compute if both ends exist
        if (typeof seg.duration_minutes === 'number' && seg.duration_minutes > 0) {
          rec.totalDuration += seg.duration_minutes;
        } else if (seg.start_time && seg.end_time) {
          const mins = Math.max(0, Math.round((new Date(seg.end_time) - new Date(seg.start_time)) / 60000));
          rec.totalDuration += mins;
        }

        woMap.set(seg.work_order_id, rec);
      }
    }

    const updates = [];
    for (const [woId, agg] of woMap.entries()) {
      try {
        const wo = await base44.asServiceRole.entities.TimeEntry.get(woId);
        if (!wo) continue;

        const patch = {};
        // Only backfill if missing to avoid overwriting manual data
        if (!wo.start_time && agg.earliestStart) {
          patch.start_time = agg.earliestStart;
          if (!wo.start_address && agg.firstTimesheetAddress) {
            patch.start_address = agg.firstTimesheetAddress;
          }
          patch.is_active = true; // started today
        }
        if (!wo.end_time && agg.latestEnd) {
          patch.end_time = agg.latestEnd;
          patch.is_active = false; // ended today
        }
        if ((!wo.duration_minutes || wo.duration_minutes === 0) && agg.totalDuration > 0) {
          patch.duration_minutes = agg.totalDuration;
        }

        if (Object.keys(patch).length === 0) continue;

        // Activity log
        const activity_log = Array.isArray(wo.activity_log) ? [...wo.activity_log] : [];
        activity_log.push({
          timestamp: new Date().toISOString(),
          action: 'Edited',
          user_email: user.email || 'system',
          user_name: user.nickname || user.first_name || user.full_name || user.email || 'Admin',
          details: 'Backfilled time data from timesheets'
        });
        patch.activity_log = activity_log;

        await base44.asServiceRole.entities.TimeEntry.update(woId, patch);
        updates.push({ id: woId, patch });
      } catch (e) {
        // ignore single WO errors and continue
      }
    }

    return Response.json({
      ok: true,
      updated_count: updates.length,
      range: {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});