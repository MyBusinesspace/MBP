import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const event = payload?.event || null;
    const data = payload?.data || null;
    const oldData = payload?.old_data || null;

    // Support manual invocation (optional): payload.timeEntryId
    let timeEntryId = event?.entity_id || data?.id || payload?.timeEntryId || null;

    if (!event || event.type !== 'update' || !data) {
      return Response.json({ ok: true, skipped: true, reason: 'Not an update event with data' });
    }

    // Only assign if clock-in happened now and there is no number yet
    const justClockedIn = !!data.start_time && (!oldData?.start_time || oldData.start_time === null);
    const hasNumber = !!data.work_order_number;

    if (!justClockedIn || hasNumber) {
      return Response.json({ ok: true, skipped: true });
    }

    // Resolve branch id for numbering
    let branchId = data.branch_id || null;
    if (!branchId && data.project_id) {
      try {
        const project = await base44.entities.Project.get(data.project_id);
        branchId = project?.branch_id || null;
      } catch (_) { /* ignore */ }
    }

    // Ask existing function for next number
    const res = await base44.functions.invoke('getNextWorkOrderNumber', { branch_id: branchId });
    const number = res?.data || null;
    if (!number) {
      return Response.json({ ok: false, error: 'Failed to get next number' }, { status: 500 });
    }

    // Append activity log message
    const activity_log = Array.isArray(data.activity_log) ? [...data.activity_log] : [];
    const userName = user.nickname || user.first_name || user.full_name || user.email || 'Unknown';
    activity_log.push({
      timestamp: new Date().toISOString(),
      action: 'Edited',
      user_email: user.email || 'unknown',
      user_name: userName,
      details: `${number} assigned on clock-in.`
    });

    // Update as service role to ensure permission
    await base44.asServiceRole.entities.TimeEntry.update(timeEntryId, {
      work_order_number: number,
      activity_log
    });

    return Response.json({ ok: true, assigned: number });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});