import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const { working_report_id, time_entry_id, dryRun = false, limit = 5000 } = payload || {};

    // Helper: resolve branch for a WR using WR, its TimeEntry, or Project
    async function resolveBranchForWR(wr) {
      if (wr?.branch_id) return wr.branch_id;
      const teId = wr?.time_entry_id || time_entry_id || null;
      if (teId) {
        const teArr = await base44.asServiceRole.entities.TimeEntry.filter({ id: teId }, '-updated_date', 1).catch(() => []);
        const te = Array.isArray(teArr) ? teArr[0] : null;
        if (te?.branch_id) return te.branch_id;
        if (te?.project_id) {
          const projArr = await base44.asServiceRole.entities.Project.filter({ id: te.project_id }, '-updated_date', 1).catch(() => []);
          const proj = Array.isArray(projArr) ? projArr[0] : null;
          if (proj?.branch_id) return proj.branch_id;
        }
      }
      return null;
    }

    // Load candidate WRs
    let wrs = [];
    if (working_report_id) {
      const arr = await base44.asServiceRole.entities.WorkingReport.filter({ id: working_report_id }, '-updated_date', 1).catch(() => []);
      wrs = Array.isArray(arr) ? arr : [];
    } else if (time_entry_id) {
      const arr = await base44.asServiceRole.entities.WorkingReport.filter({ time_entry_id }, '-updated_date', 100).catch(() => []);
      wrs = Array.isArray(arr) ? arr : [];
    } else {
      // Pull a large batch and filter locally for missing/invalid numbers
      const list = await base44.asServiceRole.entities.WorkingReport.list('-updated_date', limit).catch(() => []);
      wrs = (Array.isArray(list) ? list : []).filter(w => !w?.report_number || String(w.report_number).trim() === '' || String(w.report_number).toLowerCase() === 'null');
    }

    let updated = 0;
    const processed = [];

    for (const wr of wrs) {
      // Skip if already has a properly formatted number
      if (wr?.report_number && String(wr.report_number).trim() !== '' && String(wr.report_number).toLowerCase() !== 'null') {
        continue;
      }

      const branchId = await resolveBranchForWR(wr);
      const dateRef = wr?.start_time || wr?.created_date || new Date().toISOString();
      if (!branchId) {
        processed.push({ id: wr.id, status: 'skipped_no_branch' });
        continue;
      }

      // Get next number via existing function
      const res = await base44.asServiceRole.functions.invoke('getNextWorkingReportNumber', { branch_id: branchId, date: dateRef }).catch(() => null);
      const code = res?.data || null;
      if (!code) {
        processed.push({ id: wr.id, status: 'skipped_no_code' });
        continue;
      }

      if (!dryRun) {
        const updateData = { report_number: code };
        if (!wr.branch_id) updateData.branch_id = branchId;
        await base44.asServiceRole.entities.WorkingReport.update(wr.id, updateData);
      }
      updated += 1;
      processed.push({ id: wr.id, status: dryRun ? 'would_update' : 'updated', report_number: code });
    }

    return Response.json({ success: true, updated, count: wrs.length, dryRun, processed });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});