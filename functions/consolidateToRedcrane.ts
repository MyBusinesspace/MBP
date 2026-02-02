import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalize(s){return (s||'').toString().trim().toLowerCase();}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const TARGET_NAME = 'Redcrane Loading And Lifting Equipment Rental LLC';

    // 1) Find target branch
    const branches = await base44.asServiceRole.entities.Branch.list('name', 1000).catch(() => []);
    const target = (branches || []).find(b => normalize(b.name) === normalize(TARGET_NAME));
    if (!target) {
      return Response.json({ success:false, error: `Target branch not found: ${TARGET_NAME}` }, { status: 404 });
    }

    const otherBranches = (branches || []).filter(b => b.id !== target.id);

    const ENTITIES_WITH_BRANCH = [
      'Project',
      'Customer',
      'Asset',
      'TimeEntry',
      'WorkOrderCategory',
      'ShiftType',
      'PayrollRun'
    ];

    const summary = {
      target_branch_id: target.id,
      target_branch_name: target.name,
      reassign: {},
      deleted_branches: 0,
      backfill_result: null,
    };

    // 2) Reassign all records to target branch
    for (const entityName of ENTITIES_WITH_BRANCH) {
      try {
        const items = await base44.asServiceRole.entities[entityName].list('-updated_date', 50000).catch(() => []);
        let updated = 0;
        for (const it of (items || [])) {
          const bid = it.branch_id || null;
          if (bid && bid !== target.id) {
            await base44.asServiceRole.entities[entityName].update(it.id, { branch_id: target.id });
            updated++;
          }
        }
        summary.reassign[entityName] = { scanned: (items||[]).length, updated };
      } catch (e) {
        summary.reassign[entityName] = { error: e?.message || 'failed' };
      }
    }

    // 3) Delete other branches
    for (const b of otherBranches) {
      try {
        await base44.asServiceRole.entities.Branch.delete(b.id);
        summary.deleted_branches++;
      } catch(_){/* ignore single failures */}
    }

    // 4) Backfill / fix missing or invalid WO numbers (based on created_date)
    try {
      const res = await base44.functions.invoke('backfillMissingWorkOrderNumbers', {
        branch_ids: [target.id],
        dry_run: false
      });
      summary.backfill_result = res?.data || null;
    } catch (e) {
      summary.backfill_result = { error: e?.message || 'backfill_failed' };
    }

    return Response.json({ success: true, summary });
  } catch (error) {
    return Response.json({ success:false, error: error?.message || 'failed' }, { status: 500 });
  }
});