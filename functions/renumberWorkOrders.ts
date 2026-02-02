import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function yearParts(iso) {
  const d = iso ? new Date(iso) : new Date();
  const full = d.getFullYear();
  const yy = String(full).slice(-2);
  return { full, yy };
}

function toISO(x) { try { return x ? new Date(x).toISOString() : null; } catch { return null; } }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Admin only – this rewrites serials
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const dryRun = body?.dry_run !== false; // default true
    const targetYears = Array.isArray(body?.years) ? body.years.map(String) : null; // e.g. ['2024','2025']
    const targetBranches = Array.isArray(body?.branch_ids) ? body.branch_ids : null;
    const scope = body?.scope === 'global_per_year' ? 'global_per_year' : 'per_branch_year';

    // Load all WOs (could be many; keep simple – platform limits apply)
    const all = await base44.asServiceRole.entities.TimeEntry.list('-created_date', 50000);

    // Helper to resolve branch when missing
    const projectCache = new Map();
    async function ensureBranchId(wo) {
      if (wo.branch_id) return wo.branch_id;
      if (!wo.project_id) return null;
      if (!projectCache.has(wo.project_id)) {
        try {
          const p = await base44.asServiceRole.entities.Project.get(wo.project_id);
          projectCache.set(wo.project_id, p || null);
        } catch { projectCache.set(wo.project_id, null); }
      }
      const p = projectCache.get(wo.project_id);
      return p?.branch_id || null;
    }

    // Build groups: { `${branchId}-${year}`: [wo,...] }
    const groups = new Map();
    for (const wo of all) {
      const branchId = await ensureBranchId(wo);
      if (!branchId) continue;
      if (targetBranches && !targetBranches.includes(branchId)) continue;

      // Anclar ÚNICAMENTE a la fecha/hora de creación real
      const created = toISO(wo.created_date);
      const anchor = created || new Date().toISOString();
      const { full, yy } = yearParts(anchor);
      if (targetYears && !targetYears.includes(String(full))) continue;

      const key = scope === 'global_per_year' ? `ALL-${full}` : `${branchId}-${full}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ wo, anchor, yy, branchId, year: full });
    }

    const updates = [];
    const summary = [];

    for (const [key, arr] of groups.entries()) {
      // Stable sort by anchor, then created_date, then id
      arr.sort((a, b) => {
        const at = new Date(a.anchor).getTime();
        const bt = new Date(b.anchor).getTime();
        if (at !== bt) return at - bt;
        const ac = new Date(a.wo.created_date || 0).getTime();
        const bc = new Date(b.wo.created_date || 0).getTime();
        if (ac !== bc) return ac - bc;
        return String(a.wo.id).localeCompare(String(b.wo.id));
      });

      let seq = 1;
      for (const r of arr) {
        const desired = String(seq).padStart(4, '0') + '/' + r.yy;
        if (r.wo.work_order_number !== desired) {
          updates.push({ id: r.wo.id, from: r.wo.work_order_number || null, to: desired, branch_id: r.branchId, year: r.year });
        }
        seq += 1;
      }
      summary.push({ group: key, total: arr.length });
    }

    if (!dryRun) {
      for (const u of updates) {
        await base44.asServiceRole.entities.TimeEntry.update(u.id, { work_order_number: u.to });
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      total_work_orders: all.length,
      groups: summary,
      changes: updates
    });
  } catch (e) {
    return Response.json({ success: false, error: e?.message || 'failed' }, { status: 500 });
  }
});