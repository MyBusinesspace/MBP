import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function formatCode(prefix, n, d, yearFull) {
  const yy = String(yearFull).slice(-2);
  return `${prefix}-${String(n).padStart(d, '0')}/${yy}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }

    const branchId = payload.branch_id;
    const dateStr = payload.date || null;
    if (!branchId) {
      return Response.json({ error: 'branch_id requerido' }, { status: 400 });
    }

    const now = dateStr ? new Date(dateStr) : new Date();
    const yearFull = now.getFullYear();

    const counters = await base44.asServiceRole.entities.WorkingReportCounter.filter({ branch_id: branchId, year: String(yearFull) }, '-updated_date', 1);

    let nextNumber = 1;
    if (!counters || counters.length === 0) {
      await base44.asServiceRole.entities.WorkingReportCounter.create({ branch_id: branchId, year: String(yearFull), last_number: 1 });
      nextNumber = 1;
    } else {
      const counter = counters[0];
      nextNumber = (counter.last_number || 0) + 1;
      await base44.asServiceRole.entities.WorkingReportCounter.update(counter.id, { last_number: nextNumber });
    }

    const code = formatCode('WR', nextNumber, 3, yearFull);
    return Response.json(code);
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to get next WR number' }, { status: 500 });
  }
});