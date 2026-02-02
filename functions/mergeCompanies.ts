import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function includesAny(name, needles) {
  const n = (name || '').toLowerCase();
  return needles.some((k) => n.includes(k));
}

async function reassignEntity(base44, entityName, fromBranchId, toBranchId) {
  const updated = { count: 0 };
  try {
    const Entity = base44.asServiceRole.entities[entityName];
    if (!Entity) return updated;
    // Fetch in batches to avoid huge payloads
    let page = 0;
    const pageSize = 200;
    // The SDK filter can accept limit; we loop until less than pageSize returned
    while (true) {
      const items = await Entity.filter({ branch_id: fromBranchId }, '-updated_date', pageSize);
      if (!items || items.length === 0) break;
      for (const item of items) {
        try {
          await Entity.update(item.id, { ...item, branch_id: toBranchId });
          updated.count += 1;
        } catch (_e) {
          // continue
        }
      }
      if (items.length < pageSize) break;
      page += 1;
    }
  } catch (_e) {
    // ignore per-entity errors
  }
  return updated;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const branches = await base44.asServiceRole.entities.Branch.list();

    // Decide official branches (with logo) and duplicates (without logo)
    const redcraneOfficial = branches.find((b) => includesAny(b.name, ['redcrane']) && b.logo_url);
    const redlineOfficial = branches.find((b) => includesAny(b.name, ['redline']) && b.logo_url);

    const redcraneDups = branches.filter((b) => includesAny(b.name, ['redcrane']) && !b.logo_url);
    const redlineDups = branches.filter((b) => includesAny(b.name, ['redline']) && !b.logo_url);

    const reassigned = [];
    const entities = ['Project', 'Customer', 'Asset', 'TimeEntry', 'PayrollRun'];

    // Reassign Redcrane duplicates
    if (redcraneOfficial) {
      for (const dup of redcraneDups) {
        for (const en of entities) {
          const r = await reassignEntity(base44, en, dup.id, redcraneOfficial.id);
          reassigned.push({ entity: en, from: dup.id, to: redcraneOfficial.id, count: r.count });
        }
      }
    }

    // Reassign Redline duplicates
    if (redlineOfficial) {
      for (const dup of redlineDups) {
        for (const en of entities) {
          const r = await reassignEntity(base44, en, dup.id, redlineOfficial.id);
          reassigned.push({ entity: en, from: dup.id, to: redlineOfficial.id, count: r.count });
        }
      }
    }

    // Delete duplicates after reassign
    const deleted = [];
    for (const dup of [...redcraneDups, ...redlineDups]) {
      try {
        await base44.asServiceRole.entities.Branch.delete(dup.id);
        deleted.push({ id: dup.id, name: dup.name });
      } catch (_e) {
        // ignore if cannot delete
      }
    }

    return Response.json({ success: true, redcraneOfficial: redcraneOfficial?.id || null, redlineOfficial: redlineOfficial?.id || null, reassigned, deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});