import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Backfills missing/invalid work_order_number using created_date (open date) and branch_id
// Format: NNNN/YY where YY is year from created_date, sequence is per branch+year (atomic)
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

    let payload = {};
    try { payload = await req.json(); } catch {}
    const { branch_ids = null, years = null, dry_run = false } = payload || {};

    // Load entries (use service role to avoid permission pagination issues)
    const entries = await base44.asServiceRole.entities.TimeEntry.list('-created_date', 5000) || [];

    // Preload projects once to resolve branch fallbacks
    const projects = await base44.asServiceRole.entities.Project.list('-updated_date', 5000) || [];
    const projectMap = new Map(projects.map(p => [p.id, p]));

    const isInvalidWON = (won) => {
      if (!won) return true;
      return !/^\d{4}\/\d{2}$/.test(String(won).trim());
    };

    // Filter candidates: missing or invalid WON
    const candidates = entries.filter(e => {
      if (branch_ids && !branch_ids.includes(e.branch_id)) return false;
      // Optional year filter using created_date
      if (years && e.created_date) {
        const y = new Date(e.created_date).getFullYear();
        if (!years.includes(y)) return false;
      }
      return isInvalidWON(e.work_order_number);
    });

    const results = { scanned: entries.length, candidates: candidates.length, updated: 0, skipped_no_branch: 0, errors: 0, details: [] };

    for (const e of candidates) {
      // Resolve branch
      let branchId = e.branch_id;
      if (!branchId && e.project_id && projectMap.has(e.project_id)) {
        branchId = projectMap.get(e.project_id)?.branch_id || null;
      }
      if (!branchId) {
        results.skipped_no_branch += 1;
        results.details.push({ id: e.id, reason: 'missing_branch', project_id: e.project_id });
        continue;
      }
      if (!e.created_date) {
        results.errors += 1;
        results.details.push({ id: e.id, reason: 'missing_created_date' });
        continue;
      }

      try {
        // Ask atomic counter for this branch/year based on created_date
        const resp = await base44.functions.invoke('getNextWorkOrderNumberAtomic', {
          branch_id: branchId,
          date: e.created_date,
        });
        const won = typeof resp.data === 'string' ? resp.data : (resp.data?.work_order_number || resp.data?.won || resp.data?.number);
        if (!won || !/^\d{4}\/\d{2}$/.test(String(won))) {
          results.errors += 1;
          results.details.push({ id: e.id, reason: 'generator_returned_invalid', got: resp.data });
          continue;
        }

        if (!dry_run) {
          const activity_log = Array.isArray(e.activity_log) ? [...e.activity_log] : [];
          activity_log.push({
            timestamp: new Date().toISOString(),
            action: 'Edited',
            user_email: user.email || 'unknown',
            user_name: user.full_name || user.email || 'unknown',
            details: `Assigned work_order_number ${won} (backfill)`
          });
          await base44.asServiceRole.entities.TimeEntry.update(e.id, {
            work_order_number: won,
            branch_id: branchId,
            updated_by: user.email || 'unknown',
            activity_log,
          });
        }
        results.updated += 1;
      } catch (err) {
        results.errors += 1;
        results.details.push({ id: e.id, reason: 'update_failed', error: err?.message });
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});