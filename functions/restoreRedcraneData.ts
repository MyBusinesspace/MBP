import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getOrCreateBranch(base44, name) {
  const all = await base44.asServiceRole.entities.Branch.list();
  const found = (all || []).find(b => (b.name || '').toLowerCase() === name.toLowerCase());
  if (found) return found;
  return await base44.asServiceRole.entities.Branch.create({ name });
}

async function reassignAllToBranch(base44, entityName, branchId) {
  let updated = 0;
  // Fetch up to 10k records; SDK doesn't support offset paging
  const items = await base44.asServiceRole.entities[entityName]
    .filter({}, '-updated_date', 10000)
    .catch(async () => await base44.asServiceRole.entities[entityName].list('-updated_date', 10000)) || [];
  for (const item of items) {
    if (item && item.id && item.branch_id !== branchId) {
      try {
        await base44.asServiceRole.entities[entityName].update(item.id, { branch_id: branchId });
        updated += 1;
      } catch (_) {
        // ignore single record failures
      }
    }
  }
  return updated;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const redCraneName = payload?.redcrane_name || 'RedCrane';
    const redLineName = payload?.redline_name || 'RedLine';

    const redcrane = await getOrCreateBranch(base44, redCraneName);
    // Ensure RedLine exists too, but do not assign data to it
    await getOrCreateBranch(base44, redLineName);

    const targetBranchId = redcrane.id;

    const entitiesToUpdate = [
      'Project',
      'Customer',
      'Asset',
      'TimeEntry',
      'PayrollRun'
    ];

    const results = {};
    for (const name of entitiesToUpdate) {
      try {
        results[name] = await reassignAllToBranch(base44, name, targetBranchId);
      } catch (e) {
        results[name] = 0;
      }
    }

    // Optionally set current user's preferred branch
    try { await base44.auth.updateMe({ preferred_branch_id: targetBranchId }); } catch (_) {}

    return Response.json({
      status: 'ok',
      branch: { id: redcrane.id, name: redcrane.name },
      updated_counts: results
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
});