import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalizeName(name) {
  return (name || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Request options
    let options = {};
    try { options = await req.json(); } catch (_e) { /* ignore body parse errors */ }
    const full = Boolean(options.full);

    const defaults = [
      { name: 'ID', sort_order: 1, is_required: true },
      { name: 'Passport', sort_order: 2, is_required: true },
      { name: 'Visa', sort_order: 3, is_required: true },
      { name: 'Safety Certificates', sort_order: 4 },
      { name: 'Driver License', sort_order: 5 },
      { name: 'Work Permit', sort_order: 6 },
    ];

    // Load current types and docs
    const [types, docs] = await Promise.all([
      base44.asServiceRole.entities.EmployeeDocumentType.list('sort_order', 1000),
      base44.asServiceRole.entities.EmployeeDocument.list('-updated_date', 20000),
    ]);

    const typesArr = Array.isArray(types) ? types : [];
    const docsArr = Array.isArray(docs) ? docs : [];

    // Ensure default types exist
    const byNormName = new Map();
    typesArr.forEach((t) => byNormName.set(normalizeName(t.name), t));

    const createdTypes = [];
    for (const def of defaults) {
      const key = normalizeName(def.name);
      if (!byNormName.has(key)) {
        try {
          const created = await base44.asServiceRole.entities.EmployeeDocumentType.create(def);
          createdTypes.push(created);
          byNormName.set(key, created);
        } catch (_e) {
          // If concurrent creation happened, try to read it again
          const existing = await base44.asServiceRole.entities.EmployeeDocumentType.filter({ name: def.name });
          if (Array.isArray(existing) && existing[0]) {
            byNormName.set(key, existing[0]);
          }
        }
      }
    }

    // DEDUPE by name (merge duplicates to a single canonical type)
    const grouped = new Map();
    for (const t of typesArr) {
      const key = normalizeName(t.name);
      const arr = grouped.get(key) || [];
      arr.push(t);
      grouped.set(key, arr);
    }

    let dedupReassigned = 0;
    for (const [_, arr] of grouped) {
      if (!arr || arr.length <= 1) continue;
      arr.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || String(a.created_date || '').localeCompare(String(b.created_date || '')) || String(a.id).localeCompare(String(b.id)));
      const primary = arr[0];
      const dups = arr.slice(1);
      for (const dup of dups) {
        const docsToFix = await base44.asServiceRole.entities.EmployeeDocument.filter({ document_type_id: dup.id }, '-updated_date', full ? 20000 : 1000);
        for (const d of (docsToFix || [])) {
          await base44.asServiceRole.entities.EmployeeDocument.update(d.id, { document_type_id: primary.id });
          dedupReassigned++;
        }
        try { await base44.asServiceRole.entities.EmployeeDocumentType.delete(dup.id); } catch (_err) { /* already removed or in use */ }
      }
    }

    // Refresh types after dedupe/creates
    const currentTypes = await base44.asServiceRole.entities.EmployeeDocumentType.list('sort_order', 2000);
    const allTypes = Array.isArray(currentTypes) ? currentTypes : [];
    const typeById = new Map(allTypes.map((t) => [t.id, t]));
    const canonicalByName = new Map(allTypes.map((t) => [normalizeName(t.name), t]));

    let migrated = 0;
    let checked = 0;

    // Limit per run to reduce load
    const MAX_MIGRATIONS = full ? 20000 : 500;
    for (const doc of docsArr.slice(0, MAX_MIGRATIONS)) {
      checked++;
      const typeId = doc.document_type_id;
      if (!typeId) continue;

      if (typeById.has(typeId)) continue; // already valid EmployeeDocumentType

      // The doc likely points to the old Customer DocumentType. Fetch it to get the name.
      const res = await base44.asServiceRole.entities.DocumentType.filter({ id: typeId });
      const oldType = Array.isArray(res) ? res[0] : null;

      if (oldType && oldType.name) {
        const key = normalizeName(oldType.name);
        let target = canonicalByName.get(key);
        if (!target) {
          // Create a new employee type with the same name
          const created = await base44.asServiceRole.entities.EmployeeDocumentType.create({ name: oldType.name });
          target = created;
          canonicalByName.set(key, created);
          typeById.set(created.id, created);
        }

        if (target && target.id !== typeId) {
          await base44.asServiceRole.entities.EmployeeDocument.update(doc.id, { document_type_id: target.id });
          migrated++;
        }
      }
    }

    return Response.json({ success: true, migrated, checked, types_added: createdTypes.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});