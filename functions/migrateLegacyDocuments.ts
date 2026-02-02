import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Utility: safe array
function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

async function ensureType(base44, entityName, typeName) {
  const listFn = base44.asServiceRole.entities[entityName]?.list || base44.entities[entityName]?.list;
  const createFn = base44.asServiceRole.entities[entityName]?.create || base44.entities[entityName]?.create;
  const types = await listFn('sort_order', 5000).catch(() => []);
  const found = (types || []).find((t) => (t.name || '').toLowerCase() === typeName.toLowerCase());
  if (found) return found.id;
  const created = await createFn({ name: typeName, description: 'Auto-created for legacy docs', sort_order: 9999 });
  return created.id;
}

function addIfUrl(set, ownerKey, url) {
  if (!url) return false;
  const key = `${ownerKey}::${url}`;
  if (set.has(key)) return false;
  set.add(key);
  return true;
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

    // 1) Ensure "Others" exists across all type entities
    const [clientTypeId, projectTypeId, assetTypeId, employeeTypeId] = await Promise.all([
      ensureType(base44, 'DocumentType', 'Others'),
      ensureType(base44, 'ProjectDocumentType', 'Others'),
      ensureType(base44, 'AssetDocumentType', 'Others'),
      ensureType(base44, 'EmployeeDocumentType', 'Others'),
    ]);

    // 2) Build sets to avoid duplicates (owner+url)
    const existing = {
      customer: new Set(),
      project: new Set(),
      asset: new Set(),
      employee: new Set(),
    };

    const [customerDocs, projectDocs, assetDocs /*, employeeDocs*/] = await Promise.all([
      base44.asServiceRole.entities.CustomerDocument.list('-updated_date', 5000).catch(() => []),
      base44.asServiceRole.entities.ProjectDocument.list('-updated_date', 5000).catch(() => []),
      base44.asServiceRole.entities.AssetDocument.list('-updated_date', 5000).catch(() => []),
      // base44.asServiceRole.entities.EmployeeDocument.list('-updated_date', 5000).catch(() => [])
    ]);

    (customerDocs || []).forEach((d) => toArray(d.file_urls).forEach((u) => addIfUrl(existing.customer, d.customer_id, u)));
    (projectDocs || []).forEach((d) => toArray(d.file_urls).forEach((u) => addIfUrl(existing.project, d.project_id, u)));
    (assetDocs || []).forEach((d) => toArray(d.file_urls).forEach((u) => addIfUrl(existing.asset, `${d.owner_type}:${d.owner_id}`, u)));
    // (employeeDocs || []).forEach((d) => toArray(d.file_urls).forEach((u) => addIfUrl(existing.employee, d.employee_id, u)));

    // 3) Load source entities
    const [customers, projects, assets] = await Promise.all([
      base44.asServiceRole.entities.Customer.list('name', 5000).catch(() => []),
      base44.asServiceRole.entities.Project.list('name', 5000).catch(() => []),
      base44.asServiceRole.entities.Asset.list('name', 5000).catch(() => []),
    ]);

    const nowIso = new Date().toISOString();
    const results = { created: { customer: 0, project: 0, asset: 0 }, skipped: 0 };

    // 3.a) Customers -> CustomerDocument (Others)
    for (const c of customers || []) {
      // attached_documents: [{url,name,upload_date,notes}]
      const att = toArray(c.attached_documents);
      for (const item of att) {
        const ok = addIfUrl(existing.customer, c.id, item?.url);
        if (!ok) { results.skipped++; continue; }
        if (!item?.url) { continue; }
        await base44.asServiceRole.entities.CustomerDocument.create({
          customer_id: c.id,
          document_type_id: clientTypeId,
          file_urls: [item.url],
          file_names: [item.name || 'document'],
          upload_date: item.upload_date || nowIso,
          notes: item.notes || '',
        });
        results.created.customer++;
      }
      // legacy arrays document_urls + document_titles
      const urls = toArray(c.document_urls);
      const names = toArray(c.document_titles);
      urls.forEach(async (u, idx) => {
        const ok = addIfUrl(existing.customer, c.id, u);
        if (!ok || !u) { results.skipped++; return; }
        await base44.asServiceRole.entities.CustomerDocument.create({
          customer_id: c.id,
          document_type_id: clientTypeId,
          file_urls: [u],
          file_names: [names[idx] || 'document'],
          upload_date: nowIso,
        });
        results.created.customer++;
      });
    }

    // 3.b) Projects -> ProjectDocument (Others)
    for (const p of projects || []) {
      const att = toArray(p.attached_documents);
      for (const item of att) {
        const ok = addIfUrl(existing.project, p.id, item?.url);
        if (!ok) { results.skipped++; continue; }
        if (!item?.url) { continue; }
        await base44.asServiceRole.entities.ProjectDocument.create({
          project_id: p.id,
          document_type_id: projectTypeId,
          file_urls: [item.url],
          file_names: [item.name || 'document'],
          upload_date: item.upload_date || nowIso,
          notes: item.notes || '',
        });
        results.created.project++;
      }
      const urls = toArray(p.document_urls);
      const names = toArray(p.document_titles);
      urls.forEach(async (u, idx) => {
        const ok = addIfUrl(existing.project, p.id, u);
        if (!ok || !u) { results.skipped++; return; }
        await base44.asServiceRole.entities.ProjectDocument.create({
          project_id: p.id,
          document_type_id: projectTypeId,
          file_urls: [u],
          file_names: [names[idx] || 'document'],
          upload_date: nowIso,
        });
        results.created.project++;
      });
    }

    // 3.c) Assets -> AssetDocument (Others)
    for (const a of assets || []) {
      const att = toArray(a.attached_documents);
      for (const item of att) {
        const ok = addIfUrl(existing.asset, `asset:${a.id}`, item?.url);
        if (!ok) { results.skipped++; continue; }
        if (!item?.url) { continue; }
        await base44.asServiceRole.entities.AssetDocument.create({
          owner_type: 'asset',
          owner_id: a.id,
          document_type_id: assetTypeId,
          file_urls: [item.url],
          file_names: [item.name || 'document'],
          upload_date: item.upload_date || nowIso,
          notes: item.notes || '',
        });
        results.created.asset++;
      }
      const urls = toArray(a.document_urls);
      const names = toArray(a.document_titles);
      urls.forEach(async (u, idx) => {
        const ok = addIfUrl(existing.asset, `asset:${a.id}`, u);
        if (!ok || !u) { results.skipped++; return; }
        await base44.asServiceRole.entities.AssetDocument.create({
          owner_type: 'asset',
          owner_id: a.id,
          document_type_id: assetTypeId,
          file_urls: [u],
          file_names: [names[idx] || 'document'],
          upload_date: nowIso,
        });
        results.created.asset++;
      });
    }

    return Response.json({
      status: 'ok',
      others_ids: { clientTypeId, projectTypeId, assetTypeId, employeeTypeId },
      results,
    });
  } catch (error) {
    console.error('migrateLegacyDocuments error', error);
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});