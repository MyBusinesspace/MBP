import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useData } from "@/components/DataProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Ban, Loader2, Search, Settings, ArrowUpDown } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import DocumentViewer from "@/components/shared/DocumentViewer";
import AssetDocumentTypeManager from "./AssetDocumentTypeManager";

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return null;
  try {
    const today = new Date();
    const expiry = parseISO(expiryDate);
    const days = differenceInDays(expiry, today);
    if (days < 0) return { color: "red", text: "Expired" };
    if (days <= 30) return { color: "red", text: `Expires in ${days} days` };
    if (days <= 60) return { color: "orange", text: `Expires in ${days} days` };
    return { color: "green", text: "Valid" };
  } catch { return null; }
};

export default function AssetDocumentMatrixTab({ isAdmin }) {
  const { loadAssets, loadClientEquipments, loadCustomers } = useData();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [types, setTypes] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [onlyWithDocs, setOnlyWithDocs] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [viewingDocs, setViewingDocs] = useState(null);

  const reload = async () => {
    setLoading(true);
    const [a, e, c, t, d] = await Promise.all([
      loadAssets().catch(()=>[]),
      loadClientEquipments().catch(()=>[]),
      loadCustomers().catch(()=>[]),
      base44.entities.AssetDocumentType.list("sort_order", 5000),
      base44.entities.AssetDocument.list("-updated_date", 5000)
    ]);
    let aa = Array.isArray(a) ? a : [];
    if (aa.length === 0) {
      try {
        const allA = await base44.entities.Asset.list('-updated_date', 1000);
        aa = Array.isArray(allA) ? allA : [];
      } catch {}
    }
    setAssets(aa);
    setEquipments(Array.isArray(e) ? e : []);
    setCustomers(Array.isArray(c) ? c : []);
    setTypes(Array.isArray(t) ? t : []);
    setDocuments(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const customerMap = useMemo(() => {
    const map = new Map();
    (customers || []).forEach(c => { if (c?.id) map.set(c.id, c.name || c.full_name || ""); });
    return map;
  }, [customers]);

  const rows = useMemo(() => {
    const assetRows = (assets || []).map(a => ({ id: `asset:${a.id}`, rawId: a.id, owner_type: 'asset', name: a.name || 'Unnamed Asset', subtitle: a.category || a.subcategory || '-', customer: null }));
    const eqRows = (equipments || []).map(eq => ({ id: `client_equipment:${eq.id}`, rawId: eq.id, owner_type: 'client_equipment', name: eq.name || eq.title || 'Equipment', subtitle: customerMap.get(eq.customer_id) || '-', customer: customerMap.get(eq.customer_id) || null }));
    return [...assetRows, ...eqRows];
  }, [assets, equipments, customerMap]);

  const docsByOwner = useMemo(() => {
    const map = new Map();
    (documents || []).forEach(d => {
      if (!d) return;
      const key = `${d.owner_type}:${d.owner_id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    });
    return map;
  }, [documents]);

  const q = searchTerm.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    let data = rows;
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      data = data.filter(r => {
        const text = [r.name, r.subtitle, r.customer].filter(Boolean).join(' ').toLowerCase();
        return words.every(w => text.includes(w));
      });
    }
    if (onlyWithDocs) {
      data = data.filter(r => {
        const list = docsByOwner.get(r.id) || [];
        return list.some(d => (Array.isArray(d.file_urls) && d.file_urls.length) || (typeof d.file_url === 'string' && d.file_url.length));
      });
    }
    if (sortBy === 'name') {
      data = [...data].sort((a,b) => (a.name||'').localeCompare(b.name||''));
    }
    return data;
  }, [rows, q, onlyWithDocs, docsByOwner, sortBy]);

  const counts = useMemo(() => ({
    assets: (assets || []).length,
    equipments: (equipments || []).length,
    totalRows: (rows || []).length,
    filteredRows: (filteredRows || []).length,
    filteredAssets: (filteredRows || []).filter(r => r.owner_type === 'asset').length,
    filteredEquipments: (filteredRows || []).filter(r => r.owner_type === 'client_equipment').length,
  }), [assets, equipments, rows, filteredRows]);

  const getOwnerDocs = (rowId) => docsByOwner.get(rowId) || [];
  const formatMaybe = (dateStr) => { try { if (!dateStr) return null; const dt=parseISO(dateStr); if (isNaN(dt.getTime())) return null; return format(dt,'MMM d, yyyy'); } catch { return null; } };

  const handleUpload = async (row, typeId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,.doc,.docx';
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      setUploadingFor({ rowId: row.id, typeId });
      try {
        const uploads = await Promise.all(files.map(file => base44.integrations.Core.UploadPrivateFile({ file })));
        const uris = uploads.map(u => u.file_uri);
        const names = files.map(f => f.name);
        const existing = (documents || []).find(d => d.owner_type === row.owner_type && d.owner_id === row.rawId && d.document_type_id === typeId);
        let expiry_date; const promptVal = window.prompt('Expiry date (YYYY-MM-DD) - optional:', existing?.expiry_date || '');
        if (promptVal && /^\d{4}-\d{2}-\d{2}$/.test(promptVal)) expiry_date = promptVal;
        if (existing) {
          const updated = await base44.entities.AssetDocument.update(existing.id, {
            file_urls: [...(existing.file_urls || []), ...uris],
            file_names: [...(existing.file_names || []), ...names],
            ...(expiry_date ? { expiry_date } : {}),
            last_updated_date: new Date().toISOString(),
          });
          setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
        } else {
          const created = await base44.entities.AssetDocument.create({
            owner_type: row.owner_type,
            owner_id: row.rawId,
            document_type_id: typeId,
            file_urls: uris,
            file_names: names,
            ...(expiry_date ? { expiry_date } : {}),
            upload_date: new Date().toISOString(),
            last_updated_date: new Date().toISOString(),
          });
          setDocuments(prev => [...prev, created]);
        }
      } finally { setUploadingFor(null); }
    };
    input.click();
  };

  const handleToggleNA = async (row, typeId) => {
    const current = (documents || []).find(d => d.owner_type === row.owner_type && d.owner_id === row.rawId && d.document_type_id === typeId);
    const newVal = !current?.is_not_applicable;
    if (current) {
      const updated = await base44.entities.AssetDocument.update(current.id, { is_not_applicable: newVal, last_updated_date: new Date().toISOString() });
      setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    } else {
      const created = await base44.entities.AssetDocument.create({ owner_type: row.owner_type, owner_id: row.rawId, document_type_id: typeId, is_not_applicable: newVal, upload_date: new Date().toISOString(), last_updated_date: new Date().toISOString() });
      setDocuments(prev => [...prev, created]);
    }
  };

  const handleView = (row, type) => {
    const docs = getOwnerDocs(row.id).filter(d => d.document_type_id === type.id);
    const files = docs.flatMap(doc => {
      const urls = Array.isArray(doc.file_urls) ? doc.file_urls : [];
      const names = Array.isArray(doc.file_names) ? doc.file_names : [];
      return urls.map((url, idx) => ({ document_id: doc.id, file_url: url, file_name: names[idx] || `Document ${idx+1}`, upload_date: doc.upload_date, expiry_date: doc.expiry_date }));
    });
    setViewingDocs({ row, type, files });
  };

  const handleRemoveFile = async (fileUrl) => {
    const doc = (documents || []).find(d => d.file_urls?.includes(fileUrl));
    if (!doc) return;
    if (doc.file_urls.length > 1) {
      const idx = doc.file_urls.indexOf(fileUrl);
      const updated = await base44.entities.AssetDocument.update(doc.id, {
        file_urls: doc.file_urls.filter(u => u !== fileUrl),
        file_names: (doc.file_names || []).filter((_,i)=> i !== idx),
        last_updated_date: new Date().toISOString(),
      });
      setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    } else {
      await base44.entities.AssetDocument.delete(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    }
    if (viewingDocs) {
      const fresh = await base44.entities.AssetDocument.list('-updated_date', 5000);
      setDocuments(Array.isArray(fresh) ? fresh : []);
      const docsForViewer = (fresh || []).filter(d => d.owner_type === viewingDocs.row.owner_type && d.owner_id === viewingDocs.row.rawId && d.document_type_id === viewingDocs.type.id);
      const files = docsForViewer.flatMap(doc => {
        const urls = Array.isArray(doc.file_urls) ? doc.file_urls : [];
        const names = Array.isArray(doc.file_names) ? doc.file_names : [];
        return urls.map((url, idx) => ({ document_id: doc.id, file_url: url, file_name: names[idx] || `Document ${idx+1}`, upload_date: doc.upload_date, expiry_date: doc.expiry_date }));
      });
      setViewingDocs(prev => ({ ...prev, files }));
    }
  };

  const handleUpdateDoc = async (documentId, updates) => {
    await base44.entities.AssetDocument.update(documentId, { ...updates, last_updated_date: new Date().toISOString() });
    const fresh = await base44.entities.AssetDocument.list('-updated_date', 5000);
    setDocuments(Array.isArray(fresh) ? fresh : []);
    if (viewingDocs) {
      const docsForViewer = (fresh || []).filter(d => d.owner_type === viewingDocs.row.owner_type && d.owner_id === viewingDocs.row.rawId && d.document_type_id === viewingDocs.type.id);
      const files = docsForViewer.flatMap(doc => {
        const urls = Array.isArray(doc.file_urls) ? doc.file_urls : [];
        const names = Array.isArray(doc.file_names) ? doc.file_names : [];
        return urls.map((url, idx) => ({ document_id: doc.id, file_url: url, file_name: names[idx] || `Document ${idx+1}`, upload_date: doc.upload_date, expiry_date: doc.expiry_date }));
      });
      setViewingDocs(prev => ({ ...prev, files }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar asset o equipo..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={reload}>Recargar</Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Checkbox id="only-docs" checked={onlyWithDocs} onCheckedChange={setOnlyWithDocs} />
            <label htmlFor="only-docs" className="text-sm text-slate-600">Only with documents</label>
          </div>
          {isAdmin && (
            <Button onClick={()=>setShowTypeManager(true)} size="sm" variant="default" className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-sm">
              <Settings className="w-4 h-4 mr-2" /> Manage Types
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 text-xs text-slate-600">
        <div className="px-2 py-1 rounded bg-white border">Assets: <span className="font-semibold">{counts.assets}</span></div>
        <div className="px-2 py-1 rounded bg-white border">Equipment: <span className="font-semibold">{counts.equipments}</span></div>
        <div className="px-2 py-1 rounded bg-white border">Rows: <span className="font-semibold">{counts.totalRows}</span></div>
        <div className="px-2 py-1 rounded bg-blue-50 border border-blue-200">Filtered • Assets: <span className="font-semibold">{counts.filteredAssets}</span> • Equip: <span className="font-semibold">{counts.filteredEquipments}</span> • Total: <span className="font-semibold">{counts.filteredRows}</span></div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-4 text-xs text-blue-800 flex-wrap">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /> Valid (60+ days)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /> Expires in 60 days</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> Expires in 30 days or less</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-0">
                <TableHead className="px-2 py-1 text-left text-xs font-semibold text-slate-700 sticky left-0 bg-slate-50 z-20 w-[260px] h-8 border-r border-slate-200">Item</TableHead>
                <TableHead className="px-2 py-1 text-center text-xs font-semibold text-slate-700 w-[80px] min-w-[80px] h-8">Complete</TableHead>
                {(types || []).map((type) => (
                  <TableHead key={type.id} className="px-2 py-1 text-center text-xs font-semibold text-slate-700 min-w-[120px] h-8">{type?.name || 'Unnamed Type'}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2 + (types?.length || 0)} className="h-24 text-center text-slate-500">No items found.</TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, idx) => {
                  const ownerDocs = getOwnerDocs(row.id);
                  const completedTypes = new Set(ownerDocs.filter(d => ((Array.isArray(d.file_urls) && d.file_urls.length) || d.is_not_applicable)).map(d => d.document_type_id));
                  const completion = types.length ? Math.round((completedTypes.size / types.length) * 100) : 0;
                  return (
                    <TableRow key={row.id} className={cn("border-b border-slate-100 hover:bg-slate-50 h-9", idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
                      <TableCell className="px-2 py-1 sticky left-0 z-10 bg-inherit border-r border-slate-100">
                        <div className="min-w-0">
                          <p className="font-medium text-xs text-slate-900 truncate">{row.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{row.owner_type === 'asset' ? '(Asset)' : row.customer ? `(${row.customer})` : '(Client equipment)'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn("text-xs font-bold",
                            completion >= 100 ? 'text-green-600' : completion >= 75 ? 'text-blue-600' : completion >= 50 ? 'text-orange-600' : 'text-red-600')}>{completion}%</span>
                          <div className="w-10 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all",
                              completion >= 100 ? 'bg-green-500' : completion >= 75 ? 'bg-blue-500' : completion >= 50 ? 'bg-orange-500' : 'bg-red-500')} style={{ width: `${completion}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      {types.map((dt) => {
                        const doc = ownerDocs.find(d => d.document_type_id === dt.id);
                        const fileCount = doc ? (Array.isArray(doc.file_urls) ? doc.file_urls.length : 0) : 0;
                        const expiry = doc?.expiry_date ? getExpiryStatus(doc.expiry_date) : null;
                        return (
                          <TableCell key={dt.id} className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1 h-full w-full min-h-[32px]">
                              {doc?.is_not_applicable ? (
                                <div onClick={() => handleToggleNA(row, dt.id)} className="h-6 px-2 text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 hover:border-red-200 cursor-pointer rounded-md inline-flex items-center justify-center border border-slate-200 transition-colors" title="Click to mark as required">
                                  N/A
                                </div>
                              ) : fileCount > 0 ? (
                                <>
                                  {expiry && (<div className={cn("w-2 h-2 rounded-full", expiry.color === 'green' ? 'bg-green-500' : expiry.color === 'orange' ? 'bg-orange-500' : 'bg-red-500')} title={expiry.text} />)}
                                  <Button variant="outline" size="sm" onClick={() => handleView(row, dt)} className="h-6 px-2 text-[10px]">View ({fileCount})</Button>
                                  {(() => { const txt = formatMaybe(doc?.expiry_date); return txt ? (<span className="text-[10px] text-slate-500 ml-1">{txt}</span>) : null; })()}
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleUpload(row, dt.id)} disabled={uploadingFor?.rowId === row.id && uploadingFor?.typeId === dt.id} className="h-6 px-2 text-[10px]">{uploadingFor?.rowId === row.id && uploadingFor?.typeId === dt.id ? (<Loader2 className="w-3 h-3 animate-spin" />) : (<Upload className="w-3 h-3" />)}</Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleToggleNA(row, dt.id)} className="h-6 w-6 p-0 text-slate-300 hover:text-slate-500" title="Mark as N/A"><Ban className="w-3 h-3" /></Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AssetDocumentTypeManager isOpen={showTypeManager} onClose={()=>{ setShowTypeManager(false); (async()=>{ const t = await base44.entities.AssetDocumentType.list('sort_order', 5000); setTypes(Array.isArray(t)?t:[]); })(); }} />

      {Boolean(viewingDocs) && (
        <DocumentViewer
          isOpen={!!viewingDocs}
          onClose={() => setViewingDocs(null)}
          title={`${viewingDocs.row?.name || 'Item'} - ${viewingDocs.type?.name || 'Document'}`}
          documents={viewingDocs.files || []}
          onUpload={async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,application/pdf,.doc,.docx';
            input.onchange = async (e) => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;
              const uploads = await Promise.all(files.map((file) => base44.integrations.Core.UploadPrivateFile({ file })));
              const uris = uploads.map((u) => u.file_uri);
              const names = files.map((f) => f.name);
              const anyDoc = (documents || []).find((d) => d.owner_type === viewingDocs.row.owner_type && d.owner_id === viewingDocs.row.rawId && d.document_type_id === viewingDocs.type.id);
              let expiry_date; const expiryInput = window.prompt('Expiry date (YYYY-MM-DD) - optional:', anyDoc?.expiry_date || '');
              if (expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput)) expiry_date = expiryInput;
              if (anyDoc) {
                await base44.entities.AssetDocument.update(anyDoc.id, {
                  file_urls: [...(anyDoc.file_urls || []), ...uris],
                  file_names: [...(anyDoc.file_names || []), ...names],
                  ...(expiry_date ? { expiry_date } : {}),
                  last_updated_date: new Date().toISOString(),
                });
              } else {
                await base44.entities.AssetDocument.create({
                  owner_type: viewingDocs.row.owner_type,
                  owner_id: viewingDocs.row.rawId,
                  document_type_id: viewingDocs.type.id,
                  file_urls: uris,
                  file_names: names,
                  ...(expiry_date ? { expiry_date } : {}),
                  upload_date: new Date().toISOString(),
                  last_updated_date: new Date().toISOString(),
                });
              }
              const fresh = await base44.entities.AssetDocument.list('-updated_date', 5000);
              setDocuments(fresh || []);
              const docsForViewer = (fresh || []).filter((d) => d.owner_type === viewingDocs.row.owner_type && d.owner_id === viewingDocs.row.rawId && d.document_type_id === viewingDocs.type.id);
              const filesNew = docsForViewer.flatMap((d) => {
                const urls = Array.isArray(d.file_urls) ? d.file_urls : [];
                const nms = Array.isArray(d.file_names) ? d.file_names : [];
                return urls.map((url, idx) => ({ document_id: d.id, file_url: url, file_name: nms[idx] || `Document ${idx + 1}`, upload_date: d.upload_date, expiry_date: d.expiry_date }));
              });
              setViewingDocs((prev) => ({ ...prev, files: filesNew }));
            };
            input.click();
          }}
          onRemove={handleRemoveFile}
          onUpdate={handleUpdateDoc}
          canEdit={isAdmin}
        />
      )}
    </div>
  );
}