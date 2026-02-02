import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getYearParts(iso) {
  const d = iso ? new Date(iso) : new Date();
  const full = d.getFullYear();
  const yy = String(full).slice(-2);
  return { full: String(full), yy };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }

    const branchId = payload?.branch_id;
    const date = payload?.date || new Date().toISOString();
    if (!branchId) return Response.json({ error: 'branch_id is required' }, { status: 400 });

    const { full, yy } = getYearParts(date);

    // Fetch/create counter per branch+year (4-digit year)
    let counters = await base44.asServiceRole.entities.WorkOrderCounter.filter({ branch_id: branchId, year: String(full) }, '-updated_date', 1);
    let counter = counters?.[0] || null;

    if (!counter) {
      counter = await base44.asServiceRole.entities.WorkOrderCounter.create({ branch_id: branchId, year: String(full), last_number: 0 });
    }

    const next = (counter.last_number || 0) + 1;
    await base44.asServiceRole.entities.WorkOrderCounter.update(counter.id, { last_number: next });

    const formatted = String(next).padStart(4, '0') + '/' + yy;
    return Response.json(formatted);
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to get next WO number' }, { status: 500 });
  }
});