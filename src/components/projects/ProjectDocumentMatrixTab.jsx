import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Ban, Loader2, Search, Settings, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import DocumentViewer from "@/components/shared/DocumentViewer";
import ProjectDocumentTypeManager from "./ProjectDocumentTypeManager";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useData } from "@/components/DataProvider";





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
  } catch (e) {
    return null;
  }
};

export default function ProjectDocumentMatrixTab({ branchId, isAdmin, projects: projectsProp }) {
  console.log('[ProjectDocumentMatrixTab] 📨 props', { branchId, isAdmin, projectsProp: Array.isArray(projectsProp) ? projectsProp.length : 'none' });
  const { loadProjects, loadCustomers } = useData();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Prefer projectsProp when provided to avoid waiting for local state hydration
  const baseProjects = (Array.isArray(projectsProp) && projectsProp.length) ? projectsProp : projects;

  const [searchTerm, setSearchTerm] = useState("");
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [viewingDocs, setViewingDocs] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [onlyWithDocs, setOnlyWithDocs] = useState(false);

  useEffect(() => {
    loadData();
  }, [branchId]);

  useEffect(() => {
    let unsubType = null;
    let unsubDoc = null;

    const refreshTypes = () => base44.entities.ProjectDocumentType.list("sort_order", 5000).then((types) => setDocumentTypes(types || []));
    const refreshDocs = () => base44.entities.ProjectDocument.list("-updated_date", 5000).then((docs) => setDocuments(docs || []));

    const canTypeSub = typeof base44.entities.ProjectDocumentType?.subscribe === 'function';
    const canDocSub = typeof base44.entities.ProjectDocument?.subscribe === 'function';

    if (canTypeSub) {
      unsubType = base44.entities.ProjectDocumentType.subscribe((event) => {
        console.log('[ProjectDocumentMatrixTab] 🔔 type event', event);
        refreshTypes();
      });
    } else {
      refreshTypes();
    }

    if (canDocSub) {
      unsubDoc = base44.entities.ProjectDocument.subscribe((event) => {
        console.log('[ProjectDocumentMatrixTab] 🔔 doc event', event);
        refreshDocs();
      });
    } else {
      refreshDocs();
    }

    return () => {
      try { if (typeof unsubType === 'function') unsubType(); } catch {}
      try { if (typeof unsubDoc === 'function') unsubDoc(); } catch {}
    };
  }, []);

  // Debug state changes
  useEffect(() => {
    console.log('[ProjectDocumentMatrixTab] 🧮 state change', {
      projects: Array.isArray(projects) ? projects.length : null,
      documentTypes: Array.isArray(documentTypes) ? documentTypes.length : null,
      documents: Array.isArray(documents) ? documents.length : null,
    });
  }, [projects, documentTypes, documents]);

  const loadData = async () => {
    console.log('[ProjectDocumentMatrixTab] ▶️ loadData start', { branchId, hasProjectsProp: Array.isArray(projectsProp), projectsPropLen: Array.isArray(projectsProp) ? projectsProp.length : null });
    setLoading(true);
    try {
      const [projCandidates, types, docs, custs] = await Promise.all([
        (async () => {
          try {
            const cached = await loadProjects();
            if (Array.isArray(cached) && cached.length) return cached;
          } catch (e) {
            console.warn('[Matrix] cache fail', e?.message);
          }
          return branchId
            ? base44.entities.Project.filter({ branch_id: branchId }, "-updated_date", 5000)
            : base44.entities.Project.list("-updated_date", 5000);
        })(),
        base44.entities.ProjectDocumentType.list("sort_order", 5000),
        base44.entities.ProjectDocument.list("-updated_date", 5000),
        loadCustomers().catch(() => [])
      ]);

      console.log('[ProjectDocumentMatrixTab] ✅ fetched', { projCandidates: Array.isArray(projCandidates) ? projCandidates.length : null, types: Array.isArray(types) ? types.length : null, docs: Array.isArray(docs) ? docs.length : null, branchId });
      const pAll = Array.isArray(projectsProp) ? projectsProp : (Array.isArray(projCandidates) ? projCandidates : []);
      
      // Safe reduce with null check for branch_id
      const branchBreakdown = pAll.reduce((acc, p) => {
        const key = p?.branch_id || 'none';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log('[ProjectDocumentMatrixTab] 🔎 branchBreakdown', branchBreakdown);

      let filteredByBranch = pAll;
      if (!Array.isArray(projectsProp)) {
        console.log('[ProjectDocumentMatrixTab] 🧭 projectsProp not provided, applying branch filter', { branchId });
        const entries = Object.entries(branchBreakdown);
        const topBranchId = entries.sort((a, b) => (b[1] - a[1]))[0]?.[0];
        console.log('[ProjectDocumentMatrixTab] 🏷️ topBranchId', topBranchId);

        if (branchId) {
          const matches = pAll.filter(p => p && p.branch_id === branchId);
          if (matches.length > 0) {
            filteredByBranch = matches;
          } else if (topBranchId && topBranchId !== 'none') {
            filteredByBranch = pAll.filter(p => p && p.branch_id === topBranchId);
          }
        } else if (topBranchId && topBranchId !== 'none') {
          // If no branch provided, default to dominant branch for consistency with Clients matrix behavior
          filteredByBranch = pAll.filter(p => p && p.branch_id === topBranchId);
        }
        console.log('[ProjectDocumentMatrixTab] 📦 filteredByBranch size', filteredByBranch.length);
      }

      const nonArchived = filteredByBranch.filter((x) => x && x.status !== "archived");
      setProjects(nonArchived);
      setDocumentTypes(Array.isArray(types) ? types : []);
      setDocuments(Array.isArray(docs) ? docs : []);
      setCustomers(Array.isArray(custs) ? custs : []);
      console.log('[ProjectDocumentMatrixTab] ✅ state set', { projects: (nonArchived || []).length, documentTypes: (types || []).length, documents: (docs || []).length, usingProps: Array.isArray(projectsProp) && projectsProp.length });
    } catch (e) {
      console.error("Failed to load matrix data", e);
    } finally {
      setLoading(false);
    }
  };

  const customerMap = useMemo(() => {
    const map = new Map();
    (customers || []).forEach(c => { if (c?.id) map.set(c.id, c.name || c.full_name || ''); });
    return map;
  }, [customers]);

  const sortedProjects = useMemo(() => {
    if (!Array.isArray(baseProjects)) return [];
    
    const q = searchTerm.trim().toLowerCase();
    console.log('[ProjectDocumentMatrixTab] 🔄 sortedProjects', { projects: baseProjects.length, q, sortBy, onlyWithDocs, documents: documents?.length, source: (Array.isArray(projectsProp) && projectsProp.length) ? 'props' : 'state' });

    let filtered = baseProjects.filter((prj) => {
      if (!prj) return false;
      if (!q) return true;
      // Handle nulls in search fields
      const customerName = customerMap.get(prj.customer_id) || "";
      return [prj.name, prj.location_name, prj.address, prj.notes, customerName]
        .map(v => (v || "").toString().toLowerCase())
        .some(v => v.includes(q));
    });

    console.log('[ProjectDocumentMatrixTab] 🔎 after search filter', { count: filtered.length });

    if (sortBy === "name") {
      filtered.sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    }

    if (onlyWithDocs) {
      const withDocsSet = new Set(
        (documents || [])
          .filter(d => d && ((Array.isArray(d.file_urls) && d.file_urls.length > 0) || (typeof d.file_url === 'string' && d.file_url.length > 0)))
          .map(d => d.project_id)
      );
      filtered = filtered.filter(prj => prj && withDocsSet.has(prj.id));
      console.log('[ProjectDocumentMatrixTab] 📄 onlyWithDocs applied', { withDocs: withDocsSet.size, remaining: filtered.length });
    }

    return filtered;
  }, [baseProjects, projectsProp, searchTerm, sortBy, onlyWithDocs, documents]);

  // Display projects: fallback to baseProjects if sorted is empty
  const displayProjects = (Array.isArray(sortedProjects) && sortedProjects.length > 0)
    ? sortedProjects
    : (Array.isArray(baseProjects) ? baseProjects : []);

  useEffect(() => {
    console.log('[ProjectDocumentMatrixTab] ✅ memo ready', { sortedLen: sortedProjects.length, displayProjects: displayProjects.length, projectsFrom: (Array.isArray(projectsProp) && projectsProp.length) ? 'props' : 'state', projectsLen: (Array.isArray(projectsProp) && projectsProp.length) ? projectsProp.length : (projects?.length || 0), docs: documents?.length || 0 });
  }, [sortedProjects, displayProjects, baseProjects, projectsProp, documents]);

  const getProjectDocuments = (projectId) => (documents || []).filter((d) => d && d.project_id === projectId);
  
  // Safe date formatter (prevents crash on invalid dates)
  const formatMaybe = (dateStr) => {
    try {
      if (!dateStr) return null;
      const dt = parseISO(dateStr);
      if (isNaN(dt.getTime())) return null;
      return format(dt, 'MMM d, yyyy');
    } catch {
      return null;
    }
  };
  
  // Safe doc types alias
  const docTypes = Array.isArray(documentTypes) ? documentTypes : [];
  
  // Extra debug: first 5 projects snapshot
  useEffect(() => {
    if (Array.isArray(projects) && projects.length) {
      console.log('[ProjectDocumentMatrixTab] 🧩 sample projects', projects.slice(0, 5).map(p => ({ id: p?.id, name: p?.name })));
    }
  }, [projects]);

  const handleUploadDocument = async (projectId, documentTypeId) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,application/pdf,.doc,.docx";
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      console.log('[ProjectDocumentMatrixTab] ⬆️ upload', { projectId, documentTypeId, files: files.length });
      if (!files.length) return;
      setUploadingFor({ projectId, typeId: documentTypeId });
      try {
        const uploads = await Promise.all(files.map((file) => base44.integrations.Core.UploadPrivateFile({ file })));
        const uris = uploads.map((u) => u.file_uri);
        const names = files.map((f) => f.name);
        const existingDoc = (documents || []).find((d) => d && d.project_id === projectId && d.document_type_id === documentTypeId);

        let expiry_date;
        const expiryInput = window.prompt("Expiry date (YYYY-MM-DD) - optional:", existingDoc?.expiry_date || "");
        if (expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput)) expiry_date = expiryInput;

        if (existingDoc) {
          const updated = await base44.entities.ProjectDocument.update(existingDoc.id, {
            file_urls: [...(existingDoc.file_urls || []), ...uris],
            file_names: [...(existingDoc.file_names || []), ...names],
            ...(expiry_date ? { expiry_date } : {}),
            last_updated_date: new Date().toISOString(),
          });
          setDocuments((prev) => (prev || []).map((d) => (d.id === updated.id ? updated : d)));
        } else {
          const created = await base44.entities.ProjectDocument.create({
            project_id: projectId,
            document_type_id: documentTypeId,
            file_urls: uris,
            file_names: names,
            ...(expiry_date ? { expiry_date } : {}),
            upload_date: new Date().toISOString(),
            last_updated_date: new Date().toISOString(),
          });
          setDocuments((prev) => [...(prev || []), created]);
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setUploadingFor(null);
      }
    };
    input.click();
  };

  const handleToggleNotApplicable = async (projectId, docTypeId, currentDoc) => {
    try {
      console.log('[ProjectDocumentMatrixTab] 🚫 toggle N/A', { projectId, docTypeId, currentDocId: currentDoc?.id, isNA: !currentDoc?.is_not_applicable });
      const isNA = !currentDoc?.is_not_applicable;
      if (currentDoc) {
        const updated = await base44.entities.ProjectDocument.update(currentDoc.id, {
          is_not_applicable: isNA,
          last_updated_date: new Date().toISOString(),
        });
        setDocuments((prev) => (prev || []).map((d) => (d.id === updated.id ? updated : d)));
      } else {
        const created = await base44.entities.ProjectDocument.create({
          project_id: projectId,
          document_type_id: docTypeId,
          is_not_applicable: isNA,
          upload_date: new Date().toISOString(),
          last_updated_date: new Date().toISOString(),
        });
        setDocuments((prev) => [...(prev || []), created]);
      }
    } catch (e) {
      console.error("Toggle N/A failed", e);
    }
  };

  const handleViewDocuments = (project, docType) => {
    if (!project || !docType) return;
    const docs = (documents || []).filter((d) => d && d.project_id === project.id && d.document_type_id === docType.id);
    console.log('[ProjectDocumentMatrixTab] 👁️ View docs', { project: project.id, type: docType.id, docs: docs.length });
    const files = docs.flatMap((doc) => {
      const urls = Array.isArray(doc.file_urls) ? doc.file_urls : [];
      const names = Array.isArray(doc.file_names) ? doc.file_names : [];
      return urls.map((url, idx) => ({
        document_id: doc.id,
        file_url: url,
        file_name: names[idx] || `Document ${idx + 1}`,
        upload_date: doc.upload_date,
        expiry_date: doc.expiry_date,
      }));
    });
    console.log('[ProjectDocumentMatrixTab] 👁️ files', files.length);
    setViewingDocs({ project, type: docType, files, documentTypeId: docType.id });
  };

  const handleRemoveDocument = async (fileUrl) => {
    try {
      console.log('[ProjectDocumentMatrixTab] 🗑️ remove file', fileUrl);
      const doc = (documents || []).find((d) => d && d.file_urls?.includes(fileUrl));
      if (!doc) return;
      if (doc.file_urls && doc.file_urls.length > 1) {
        const idx = doc.file_urls.indexOf(fileUrl);
        const updatedUrls = doc.file_urls.filter((u) => u !== fileUrl);
        const updatedNames = (doc.file_names || []).filter((_, i) => i !== idx);
        await base44.entities.ProjectDocument.update(doc.id, {
          file_urls: updatedUrls,
          file_names: updatedNames.length ? updatedNames : null,
          last_updated_date: new Date().toISOString(),
        });
      } else {
        await base44.entities.ProjectDocument.delete(doc.id);
      }
      const fresh = await base44.entities.ProjectDocument.list("-updated_date", 5000);
      setDocuments(fresh || []);
      if (viewingDocs) {
        const docsForViewer = (fresh || []).filter((d) => d && d.project_id === viewingDocs.project.id && d.document_type_id === viewingDocs.type.id);
        const files = docsForViewer.flatMap((d) => {
          const urls = d.file_urls || [];
          const names = d.file_names || [];
          return urls.map((url, idx) => ({ document_id: d.id, file_url: url, file_name: names[idx] || `Document ${idx + 1}`, upload_date: d.upload_date, expiry_date: d.expiry_date }));
        });
        setViewingDocs(files.length ? { ...viewingDocs, files } : null);
      }
    } catch (e) {
      console.error("Remove failed", e);
    }
  };

  const handleUpdateDocument = async (documentId, updates) => {
    try {
      console.log('[ProjectDocumentMatrixTab] ✏️ update doc', { documentId, updates });
      await base44.entities.ProjectDocument.update(documentId, { ...updates, last_updated_date: new Date().toISOString() });
      const fresh = await base44.entities.ProjectDocument.list("-updated_date", 5000);
      setDocuments(fresh || []);
      if (viewingDocs) {
        const docsForViewer = (fresh || []).filter((d) => d && d.project_id === viewingDocs.project.id && d.document_type_id === viewingDocs.type.id);
        const files = docsForViewer.flatMap((d) => {
          const urls = d.file_urls || [];
          const names = d.file_names || [];
          return urls.map((url, idx) => ({ document_id: d.id, file_url: url, file_name: names[idx] || `Document ${idx + 1}`, upload_date: d.upload_date, expiry_date: d.expiry_date }));
        });
        setViewingDocs((prev) => ({ ...prev, files }));
      }
    } catch (e) {
      console.error("Update failed", e);
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
      {console.log('[ProjectDocumentMatrixTab] 🖨️ render', { baseProjects: baseProjects?.length || 0, projectsState: projects?.length || 0, projectsProp: Array.isArray(projectsProp) ? projectsProp.length : 0, documentTypes: documentTypes?.length || 0, documents: documents?.length || 0 })}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 items-center">
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
            <Button onClick={() => setShowTypeManager(true)} size="sm" variant="default" className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-sm">
              <Settings className="w-4 h-4 mr-2" /> Manage Types
            </Button>
          )}
        </div>
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
                <TableHead className="px-2 py-1 text-left text-xs font-semibold text-slate-700 sticky left-0 bg-slate-50 z-20 w-[240px] h-8 border-r border-slate-200">Project</TableHead>
                <TableHead className="px-2 py-1 text-center text-xs font-semibold text-slate-700 w-[80px] min-w-[80px] h-8">Complete</TableHead>
                {(documentTypes || []).map((type) => (
                  <TableHead key={type.id} className="px-2 py-1 text-center text-xs font-semibold text-slate-700 min-w-[120px] h-8">{type?.name || 'Unnamed Type'}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const shouldWarn = (Array.isArray(projects) && projects.length > 0) && (Array.isArray(docTypes) && docTypes.length > 0) && (sortedProjects.length === 0) && (!searchTerm) && (!onlyWithDocs);
                if (shouldWarn) {
                  console.warn('[ProjectDocumentMatrixTab] ⚠️ sortedProjects is 0 despite data', {
                    projects: projects.length,
                    documentTypes: documentTypes.length,
                    documents: documents?.length || 0,
                    sample: projects.slice(0,3).map(p => ({ id: p.id, name: p.name }))
                  });
                }
                return null;
              })()}
              {console.log('[ProjectDocumentMatrixTab] 🧾 rows', { rows: displayProjects?.length || 0, docTypes: docTypes.length })}
              {(!Array.isArray(displayProjects) || displayProjects.length === 0) ? (
                <TableRow>
                  {console.log('[ProjectDocumentMatrixTab] ⚠️ No projects found to render', { baseProjects: baseProjects?.length || 0, projectsState: projects?.length || 0, projectsProp: Array.isArray(projectsProp) ? projectsProp.length : 0 })}
                  <TableCell colSpan={2 + docTypes.length} className="h-24 text-center text-slate-500">No projects found.</TableCell>
                </TableRow>
              ) : (
                displayProjects.map((project, rowIdx) => {
                  if (!project) return null;
                  const projDocs = getProjectDocuments(project.id);
                  const completedTypes = new Set(projDocs.filter(d => d && ( (Array.isArray(d.file_urls) && d.file_urls.length > 0) || d.is_not_applicable)).map(d => d.document_type_id));
                  const completion = docTypes.length ? Math.round((completedTypes.size / docTypes.length) * 100) : 0;
                  return (
                    <TableRow key={project.id} className={cn("border-b border-slate-100 hover:bg-slate-50 h-9", rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
                      <TableCell className="px-2 py-1 sticky left-0 z-10 bg-inherit border-r border-slate-100">
                        <div className="min-w-0">
                          <p className="font-medium text-xs text-slate-900 truncate">{project.name || 'Unnamed Project'}</p>
                          <p className="text-[10px] text-slate-500 truncate">{customerMap.get(project.customer_id) ? `(${customerMap.get(project.customer_id)})` : '-'}</p>
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
                      {docTypes.map((dt) => {
                        // Debug per-cell rendering minimal overhead
                        // console.debug('[ProjectDocumentMatrixTab] cell render', { project: project.id, type: dt.id });
                        const doc = projDocs.find((d) => d.document_type_id === dt.id);
                        const fileCount = doc ? (Array.isArray(doc.file_urls) ? doc.file_urls.length : 0) : 0;
                        const expiry = doc?.expiry_date ? getExpiryStatus(doc.expiry_date) : null;
                        return (
                          <TableCell key={dt.id} className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1 h-full w-full min-h-[32px]">
                              {doc?.is_not_applicable ? (
                                <div onClick={() => handleToggleNotApplicable(project.id, dt.id, doc)} className="h-6 px-2 text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 hover:border-red-200 cursor-pointer rounded-md inline-flex items-center justify-center border border-slate-200 transition-colors" title="Click to mark as required">
                                  N/A
                                </div>
                              ) : fileCount > 0 ? (
                                <>
                                  {expiry && (<div className={cn("w-2 h-2 rounded-full", expiry.color === 'green' ? 'bg-green-500' : expiry.color === 'orange' ? 'bg-orange-500' : 'bg-red-500')} title={expiry.text} />)}
                                  <Button variant="outline" size="sm" onClick={() => handleViewDocuments(project, dt)} className="h-6 px-2 text-[10px]">View ({fileCount})</Button>
                                  {(() => { const txt = formatMaybe(doc?.expiry_date); return txt ? (<span className="text-[10px] text-slate-500 ml-1">{txt}</span>) : null; })()}
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleUploadDocument(project.id, dt.id)} disabled={uploadingFor?.projectId === project.id && uploadingFor?.typeId === dt.id} className="h-6 px-2 text-[10px]">{uploadingFor?.projectId === project.id && uploadingFor?.typeId === dt.id ? (<Loader2 className="w-3 h-3 animate-spin" />) : (<Upload className="w-3 h-3" />)}</Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleToggleNotApplicable(project.id, dt.id, doc)} className="h-6 w-6 p-0 text-slate-300 hover:text-slate-500" title="Mark as N/A"><Ban className="w-3 h-3" /></Button>
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

      <ProjectDocumentTypeManager isOpen={showTypeManager} onClose={() => { setShowTypeManager(false); loadData(); }} />

      {Boolean(viewingDocs) && (
        <DocumentViewer
          isOpen={!!viewingDocs}
          onClose={() => { console.log('[ProjectDocumentMatrixTab] 🔒 close viewer'); setViewingDocs(null); }}
          title={`${viewingDocs.project?.name || 'Project'} - ${viewingDocs.type?.name || 'Document'}`}
          documents={viewingDocs.files || []}
          onUpload={async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,application/pdf,.doc,.docx';
            input.onchange = async (e) => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;
              try {
                const uploads = await Promise.all(files.map((file) => base44.integrations.Core.UploadPrivateFile({ file })));
                const uris = uploads.map((u) => u.file_uri);
                const names = files.map((f) => f.name);
                const anyDoc = (documents || []).find((d) => d && d.project_id === viewingDocs.project.id && d.document_type_id === viewingDocs.type.id);
                let expiry_date;
                const expiryInput = window.prompt('Expiry date (YYYY-MM-DD) - optional:', anyDoc?.expiry_date || '');
                if (expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput)) expiry_date = expiryInput;
                if (anyDoc) {
                  await base44.entities.ProjectDocument.update(anyDoc.id, {
                    file_urls: [...(anyDoc.file_urls || []), ...uris],
                    file_names: [...(anyDoc.file_names || []), ...names],
                    ...(expiry_date ? { expiry_date } : {}),
                    last_updated_date: new Date().toISOString(),
                  });
                } else {
                  await base44.entities.ProjectDocument.create({
                    project_id: viewingDocs.project.id,
                    document_type_id: viewingDocs.type.id,
                    file_urls: uris,
                    file_names: names,
                    ...(expiry_date ? { expiry_date } : {}),
                    upload_date: new Date().toISOString(),
                    last_updated_date: new Date().toISOString(),
                  });
                }
                const fresh = await base44.entities.ProjectDocument.list('-updated_date', 5000);
                setDocuments(fresh || []);
                const docsForViewer = (fresh || []).filter((d) => d && d.project_id === viewingDocs.project.id && d.document_type_id === viewingDocs.type.id);
                const filesNew = docsForViewer.flatMap((d) => {
                  const urls = Array.isArray(d.file_urls) ? d.file_urls : [];
                  const nms = Array.isArray(d.file_names) ? d.file_names : [];
                  return urls.map((url, idx) => ({ document_id: d.id, file_url: url, file_name: nms[idx] || `Document ${idx + 1}`, upload_date: d.upload_date, expiry_date: d.expiry_date }));
                });
                setViewingDocs((prev) => ({ ...prev, files: filesNew }));
              } catch (err) {
                console.error('Upload failed', err);
              }
            };
            input.click();
          }}
          onRemove={handleRemoveDocument}
          onUpdate={handleUpdateDocument}
          canEdit={isAdmin}
        />
      )}
    </div>
  );
}