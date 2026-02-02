import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const res = await base44.functions.invoke('renumberWorkOrders', { dry_run: true });
    return Response.json({ ok: true, mode: 'dry_run', result: res?.data || null });
  } catch (err) {
    return Response.json({ ok: false, error: err?.message || 'failed' }, { status: 500 });
  }
});