import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }

    const event = payload?.event || null;
    const data = payload?.data || null;

    // Expect entity automation on create of TimeEntry
    if (!event || event.type !== 'create' || !data) {
      return Response.json({ ok: true, skipped: true, reason: 'Not a create event' });
    }

    // If a number exists but is invalid, we will override it
    const existing = data.work_order_number;
    const isValidExisting = typeof existing === 'string' && /^\d{4}\/\d{2}$/.test(existing);
    if (isValidExisting) {
      return Response.json({ ok: true, skipped: true, reason: 'Already numbered (valid format)' });
    }

    // Resolve branch
    let branchId = data.branch_id || null;
    if (!branchId && data.project_id) {
      try {
        const projArr = await base44.asServiceRole.entities.Project.filter({ id: data.project_id }, '-updated_date', 1);
        const project = (projArr && projArr[0]) || null;
        branchId = project?.branch_id || null;
      } catch { /* ignore */ }
    }
    if (!branchId) {
      return Response.json({ ok: false, error: 'branch_id not found on WO' }, { status: 400 });
    }

    // Anclar EXCLUSIVAMENTE a la fecha/hora real de creación del registro
    const date = data.created_date || new Date().toISOString();

    const res = await base44.functions.invoke('getNextWorkOrderNumberAtomic', { branch_id: branchId, date });
    let number = res?.data;
    if (!number) {
      return Response.json({ ok: false, error: 'Failed to get next WO number' }, { status: 500 });
    }
    // Ensure uniqueness in case counters are behind
    for (let i = 0; i < 5; i++) {
      const clashes = await base44.asServiceRole.entities.TimeEntry.filter({ work_order_number: number }, '-updated_date', 1);
      if (!Array.isArray(clashes) || clashes.length === 0) break;
      const next = await base44.functions.invoke('getNextWorkOrderNumberAtomic', { branch_id: branchId, date });
      number = next?.data;
      if (!number) break;
    }

    await base44.asServiceRole.entities.TimeEntry.update(data.id, { work_order_number: number });

    return Response.json({ ok: true, assigned: number });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to assign WO number' }, { status: 500 });
  }
});