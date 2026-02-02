import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Old -> New mapping (by ID)
// RedCrane (no logo) -> Redcrane Loading And Lifting Equipment Rental LLC
// RedLine  (no logo) -> Redline Structural Steel Manufacturing Co LLC
const BRANCH_MAP = {
  '696a4998195ded9e95884434': '691bfdc1a0a7316f947facbb',
  '696a49985332606a5ca25136': '691bfe268e3b160ff83d2b85',
};

const ENTITIES_WITH_BRANCH = ['Project', 'Asset', 'Customer', 'TimeEntry'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry(fn, { retries = 5, baseDelay = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      const msg = e?.message || '';
      if (attempt >= retries || !/429|Rate limit/i.test(msg)) throw e;
      const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await sleep(delay);
      attempt++;
    }
  }
}

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

async function updateEntityBranch(base44, entity, oldId, newId) {
  // fetch all referencing records with retry
  const items = await withRetry(() => base44.asServiceRole.entities[entity].filter({ branch_id: oldId }, '-updated_date', 10000));
  const list = Array.isArray(items) ? items : [];
  let updated = 0;
  if (!list.length) return { count: 0 };
  // process in batches to avoid rate limits
  const batches = chunk(list, 25);
  for (const b of batches) {
    await Promise.all(b.map(rec => withRetry(() => base44.asServiceRole.entities[entity].update(rec.id, { branch_id: newId }))));
    updated += b.length;
    await sleep(150); // small gap between batches
  }
  return { count: updated };
}

async function branchExists(base44, branchId) {
  const rows = await withRetry(() => base44.asServiceRole.entities.Branch.filter({ id: branchId }, '-updated_date', 5));
  return Array.isArray(rows) && rows.length > 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const summary = { updated: {}, deletedBranches: [], skippedDeletes: [], errors: [] };

    for (const [oldId, newId] of Object.entries(BRANCH_MAP)) {
      for (const entity of ENTITIES_WITH_BRANCH) {
        try {
          const { count } = await updateEntityBranch(base44, entity, oldId, newId);
          summary.updated[entity] = (summary.updated[entity] || 0) + count;
        } catch (e) {
          summary.errors.push({ scope: `${entity}(${oldId}→${newId})`, message: e?.message || String(e) });
        }
      }
      try {
        const exists = await branchExists(base44, oldId);
        if (exists) {
          await withRetry(() => base44.asServiceRole.entities.Branch.delete(oldId));
          summary.deletedBranches.push(oldId);
        } else {
          summary.skippedDeletes.push(oldId);
        }
      } catch (e) {
        summary.errors.push({ scope: `Branch.delete(${oldId})`, message: e?.message || String(e) });
      }
    }

    return Response.json({ ok: true, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});