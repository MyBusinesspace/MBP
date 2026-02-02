import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function isValidWON(won) {
  return typeof won === 'string' && /^\d{4}\/\d{2}$/.test(String(won).trim());
}

function normalize(str) {
  return (str || '').toString().toLowerCase();
}

async function pickDefaultBranch(base44, user) {
  try {
    // 1) Try user's own branch
    if (user?.branch_id) {
      const b = await base44.asServiceRole.entities.Branch.get(user.branch_id).catch(() => null);
      if (b?.id) return b;
    }
    // 2) Prefer REDCRANE-like names
    const all = await base44.asServiceRole.entities.Branch.list('name', 1000).catch(() => []);
    if (Array.isArray(all) && all.length > 0) {
      const preferred = all.find(b => normalize(b.short_name || b.name).includes('redcrane'));
      if (preferred) return preferred;
      // 3) Fallback: first alphabetically by name
      const sorted = [...all].sort((a,b) => (a.name || '').localeCompare(b.name || ''));
      return sorted[0];
    }
  } catch (_) {}
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    // Load data
    const [entries, projects] = await Promise.all([
      base44.asServiceRole.entities.TimeEntry.list('-created_date', 50000).catch(() => []),
      base44.asServiceRole.entities.Project.list('-updated_date', 50000).catch(() => [])
    ]);

    const projectMap = new Map(Array.isArray(projects) ? projects.map(p => [p.id, p]) : []);
    const defaultBranch = await pickDefaultBranch(base44, user);

    const summary = {
      scanned: Array.isArray(entries) ? entries.length : 0,
      already_valid: 0,
      invalid_format: 0,
      missing_number: 0,
      missing_branch: 0,
      fixed_assigned: 0,
      fixed_replaced: 0,
      skipped_no_branch_even_with_default: 0,
      errors: 0,
      details: []
    };

    for (const e of (entries || [])) {
      const record = {
        id: e.id,
        previous_number: e.work_order_number || null,
        causes: [],
        action: 'none',
        branch_before: e.branch_id || null,
        branch_after: null,
        new_number: null
      };

      const hasValid = isValidWON(e.work_order_number);
      if (hasValid) {
        summary.already_valid += 1;
        record.causes.push('already_numbered_valid');
        summary.details.push(record);
        continue;
      }

      if (e.work_order_number && !hasValid) {
        summary.invalid_format += 1;
        record.causes.push('invalid_format');
      } else {
        summary.missing_number += 1;
        record.causes.push('missing_number');
      }

      // Resolve branch: entry.branch_id -> project.branch_id -> defaultBranch
      let branchId = e.branch_id || null;
      if (!branchId && e.project_id && projectMap.has(e.project_id)) {
        branchId = projectMap.get(e.project_id)?.branch_id || null;
      }
      if (!branchId) {
        record.causes.push('missing_branch');
        summary.missing_branch += 1;
        branchId = defaultBranch?.id || null;
      }

      if (!branchId) {
        // Cannot fix without branch
        record.action = 'skipped';
        summary.skipped_no_branch_even_with_default += 1;
        summary.details.push(record);
        continue;
      }

      const anchorDate = e.created_date || new Date().toISOString();

      try {
        const res = await base44.functions.invoke('getNextWorkOrderNumberAtomic', {
          branch_id: branchId,
          date: anchorDate
        });
        const won = typeof res.data === 'string' ? res.data : (res.data?.work_order_number || res.data?.won || res.data?.number);
        if (!isValidWON(won)) {
          record.action = 'error_generator_invalid';
          summary.errors += 1;
          summary.details.push(record);
          continue;
        }

        const activity_log = Array.isArray(e.activity_log) ? [...e.activity_log] : [];
        activity_log.push({
          timestamp: new Date().toISOString(),
          action: 'Edited',
          user_email: user.email || 'system',
          user_name: user.full_name || user.email || 'system',
          details: `Assigned work_order_number ${won} via analyzeAndFixWon`
        });

        await base44.asServiceRole.entities.TimeEntry.update(e.id, {
          work_order_number: won,
          branch_id: branchId,
          updated_by: user.email || 'system',
          activity_log
        });

        record.new_number = won;
        record.branch_after = branchId;
        record.action = e.work_order_number ? 'replaced_invalid' : 'assigned_missing';
        if (e.work_order_number) summary.fixed_replaced += 1; else summary.fixed_assigned += 1;
        summary.details.push(record);
      } catch (err) {
        record.action = 'error_update_failed';
        record.error = err?.message || 'update_failed';
        summary.errors += 1;
        summary.details.push(record);
      }
    }

    return Response.json({ success: true, ...summary, default_branch_used: defaultBranch?.id || null });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || 'failed' }, { status: 500 });
  }
});