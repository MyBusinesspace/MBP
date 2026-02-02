import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileUp, UploadCloud, Trash2, CheckCircle2, AlertCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const MAX_FILES = 6;

export default function DocumentUploader() {
  const [defaultTitle, setDefaultTitle] = useState("");
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [clientDocTypes, setClientDocTypes] = useState([]);
  const [projectDocTypes, setProjectDocTypes] = useState([]);
  const [assetDocTypes, setAssetDocTypes] = useState([]);
  const [employeeDocTypes, setEmployeeDocTypes] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [defaultSource, setDefaultSource] = useState("client");

  const [items, setItems] = useState([]);
  // items: [{ id, file, title, sourceType: 'client'|'project'|'asset'|'user', targetId, docTypeId, selected, status: 'idle'|'uploading'|'done'|'error', message, tmp_file_uri?, analysis_status?: 'idle'|'running'|'done'|'error', analysis_message?: string }]

  useEffect(() => {
    async function load() {
      setLoadingLists(true);
      try {
        const [cust, projs, assts, usrs, cliTypes, prjTypes, astTypes, empTypes] = await Promise.all([
          base44.entities.Customer.list("name", 1000).catch(() => []),
          base44.entities.Project.list("name", 2000).catch(() => []),
          base44.entities.Asset.list("name", 2000).catch(() => []),
          base44.entities.User.list("full_name", 1000).catch(() => []),
          base44.entities.DocumentType.list("sort_order", 1000).catch(() => []),
          base44.entities.ProjectDocumentType.list("sort_order", 1000).catch(() => []),
          base44.entities.AssetDocumentType.list("sort_order", 1000).catch(() => []),
          base44.entities.EmployeeDocumentType.list("sort_order", 1000).catch(() => []),
        ]);
        setCustomers(Array.isArray(cust) ? cust : []);
        setProjects(Array.isArray(projs) ? projs : []);
        setAssets(Array.isArray(assts) ? assts : []);
        setUsers(Array.isArray(usrs) ? usrs : []);
        setClientDocTypes(Array.isArray(cliTypes) ? cliTypes : []);
        setProjectDocTypes(Array.isArray(prjTypes) ? prjTypes : []);
        setAssetDocTypes(Array.isArray(astTypes) ? astTypes : []);
        setEmployeeDocTypes(Array.isArray(empTypes) ? empTypes : []);
      } finally {
        setLoadingLists(false);
      }
    }
    load();
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    addFiles(files);
  };

  const openPicker = () => fileInputRef.current?.click();

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    // reset so selecting the same files again still triggers change
    e.target.value = "";
  };

  const addFiles = (files) => {
    if (!files.length) return;
    const remaining = MAX_FILES - items.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} files`);
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`Only ${remaining} files will be added (limit ${MAX_FILES})`);
    }
    const next = accepted.map((f, idx) => ({
      id: `${Date.now()}_${idx}_${Math.random().toString(36).slice(2)}`,
      file: f,
      title: defaultTitle || stripExt(f.name),
      sourceType: defaultSource,
      targetId: "",
      docTypeId: "",
      selected: true,
      status: "idle",
      message: "",
      tmp_file_uri: "",
      analysis_status: "idle",
      analysis_message: "",
    }));
    setItems((prev) => [...prev, ...next]);
    // Lanzar análisis con IA para autocompletar
    next.forEach((n) => analyzeDocument(n));
  };

  const stripExt = (name) => name.replace(/\.[^.]+$/, "");

  // === IA: análisis de documentos para autocompletar ===
  const normalize = (s) => (s || "").toString().toLowerCase().trim();
  const personName = (u) => (u?.full_name || `${u?.first_name || ''} ${u?.last_name || ''}` || '').trim();
  const getDocTypesFor = (src) => src === 'client' ? clientDocTypes : src === 'project' ? projectDocTypes : src === 'asset' ? assetDocTypes : employeeDocTypes;
  const findByName = (name, list, labelFn) => {
    const n = normalize(name);
    if (!n) return null;
    return (
      list.find((r) => normalize(labelFn(r)) === n) ||
      list.find((r) => normalize(labelFn(r)).includes(n)) ||
      null
    );
  };

  async function analyzeDocument(newItem) {
    let toastId;
    try {
      // esperar a tener listas cargadas
      if (loadingLists) { toast.info(`Preparing analysis: ${newItem.file.name}`); return; }
      // marcar en ejecución
      setItems((prev) => prev.map((x) => x.id === newItem.id ? { ...x, analysis_status: 'running', analysis_message: '' } : x));
      toastId = toast.loading(`Analyzing: ${newItem.file.name}...`);

      // Subir temporalmente de forma privada y firmar URL para lectura por IA
      const up = await base44.integrations.Core.UploadPrivateFile({ file: newItem.file });
      const file_uri = up?.file_uri;
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });

      // Skip AI extraction for large PDFs to avoid provider limit messages
      const isPDF = (newItem.file?.type || '').includes('pdf') || (newItem.file?.name || '').toLowerCase().endsWith('.pdf');
      const isLarge = typeof newItem.file?.size === 'number' && newItem.file.size > 10 * 1024 * 1024; // >10MB
      if (isPDF && isLarge) {
        const suggestedTitle = stripExt(newItem.file.name);
        setItems((prev) => prev.map((x) => x.id === newItem.id ? { ...x, tmp_file_uri: file_uri, title: x.title || suggestedTitle, analysis_status: 'done', analysis_message: 'Skipped AI analysis for large file' } : x));
        if (toastId) { toast.success(`Analysis completed for ${newItem.file.name}: Skipped AI for large file`, { id: toastId }); } else { toast.success(`Analysis completed for ${newItem.file.name}: Skipped AI for large file`); }
        return;
      }

      // Request extraction
      const json_schema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          source_type: { type: 'string', enum: ['client','project','asset','user'] },
          source_name: { type: 'string' },
          source_email: { type: 'string' },
          document_type_name: { type: 'string' }
        }
      };

      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: signed_url, json_schema });
      const out = (res && res.status === 'success') ? (res.output || {}) : {};

      // Heurísticas y normalización
      const CERT_KEYWORDS = ['certificate','certificado','certificación','certification','cert','training','formación','entrenamiento','capacitacion','capacitación','course','curso','safety','hse'];
      const textBank = [newItem.file?.name || '', out.title || ''].join(' ').toLowerCase();
      const includesAny = (txt, arr) => arr.some(k => txt.includes(k));
      const userDisplay = (u) => personName(u).toLowerCase();
      const fuzzyFindUserByText = (txt) => {
        const t = normalize(txt);
        // coincidencia directa/substring
        let found = users.find(u => t.includes(normalize(userDisplay(u))) || normalize(userDisplay(u)).includes(t));
        if (found) return found;
        // token match (nombre + apellido)
        const tokens = (t.split(/[^a-zA-Záéíóúñü0-9]+/).filter(Boolean));
        return users.find(u => {
          const ud = normalize(userDisplay(u));
          const okTokens = tokens.filter(tok => tok.length > 2 && ud.includes(tok));
          return okTokens.length >= 2; // al menos 2 tokens coinciden
        }) || null;
      };

      // Determinar fuente
      let sourceType = out.source_type || newItem.sourceType || defaultSource;
      if (!['client','project','asset','user'].includes(sourceType)) sourceType = defaultSource;

      // Match entidad inicial
      let targetId = '';
      if (sourceType === 'client') {
        const found = findByName(out.source_name, customers, (c) => c.name);
        targetId = found?.id || '';
      } else if (sourceType === 'project') {
        const found = findByName(out.source_name, projects, (p) => p.name);
        targetId = found?.id || '';
      } else if (sourceType === 'asset') {
        const found = findByName(out.source_name, assets, (a) => a.name);
        targetId = found?.id || '';
      } else if (sourceType === 'user') {
        const byEmail = (out.source_email ? users.find((u) => (u.email || '').toLowerCase() === out.source_email.toLowerCase()) : null);
        const found = byEmail || findByName(out.source_name, users, (u) => personName(u));
        targetId = found?.id || '';
      }

      // Si no se detectó, intentar inferir USUARIO desde el nombre del archivo/título
      if (!targetId) {
        const candidateUser = fuzzyFindUserByText(textBank);
        if (candidateUser) {
          sourceType = 'user';
          targetId = candidateUser.id;
        }
      }

      // Match tipo de documento
      let docTypeId = '';
      const types = getDocTypesFor(sourceType);
      if (Array.isArray(types) && types.length) {
        let typeFromOut = null;
        if (out.document_type_name) {
          typeFromOut = findByName(out.document_type_name, types, (t) => t.name);
        }
        if (!typeFromOut) {
          // Heurística: si parece certificado/entrenamiento, escoger tipo adecuado (preferir "Training" si existe)
          if (includesAny(textBank, CERT_KEYWORDS)) {
            const preferTraining = types.find(t => normalize(t.name).includes('training'));
            const preferCert = types.find(t => normalize(t.name).includes('cert'));
            typeFromOut = preferTraining || preferCert || types.find(t => includesAny(normalize(t.name), CERT_KEYWORDS));
          }
        }
        docTypeId = typeFromOut?.id || '';
      }

      // Título sugerido
      const suggestedTitle = out.title || stripExt(newItem.file.name);

      // Mensaje
      const userNameMsg = (() => {
        if (sourceType === 'user' && targetId) {
          const u = users.find(u => u.id === targetId);
          return u ? personName(u) : '';
        }
        return '';
      })();
      const typeMsg = (() => {
        const ts = getDocTypesFor(sourceType);
        const t = ts.find(t => t.id === docTypeId);
        return t?.name || '';
      })();
      const message = [userNameMsg && `Usuario: ${userNameMsg}`, typeMsg && `Tipo: ${typeMsg}`].filter(Boolean).join(' • ');

      // Aplicar sugerencias sin molestar ediciones del usuario
      setItems((prev) => prev.map((x) => {
        if (x.id !== newItem.id) return x;
        const keepUserTitle = x.title && x.title !== stripExt(newItem.file.name) && x.title !== (defaultTitle || '');
        return {
          ...x,
          tmp_file_uri: file_uri,
          sourceType: sourceType || x.sourceType,
          targetId: x.targetId || targetId,
          docTypeId: x.docTypeId || docTypeId,
          title: keepUserTitle ? x.title : (suggestedTitle || x.title),
          analysis_status: 'done',
          analysis_message: message || 'Suggestions applied'
        };
      }));
      if (toastId) { toast.success(`Analysis completed for ${newItem.file.name}${message ? `: ${message}` : ''}`, { id: toastId }); } else { toast.success(`Analysis completed for ${newItem.file.name}${message ? `: ${message}` : ''}`); }
    } catch (e) {
      if (toastId) { toast.error(`Failed to analyze ${newItem.file.name}: ${e?.message || 'Error'}`, { id: toastId }); } else { toast.error(`Failed to analyze ${newItem.file.name}: ${e?.message || 'Error'}`); }
      setItems((prev) => prev.map((x) => x.id === newItem.id ? { ...x, analysis_status: 'error', analysis_message: e?.message || 'Failed to analyze' } : x));
    }
  }

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const clearCompleted = () => setItems((prev) => prev.filter((it) => it.status !== "done"));

  // Auto-proceso: cuando las listas estén listas, analizamos ítems pendientes
  React.useEffect(() => {
    if (loadingLists) return;
    const pending = items.filter((it) => it.analysis_status === 'idle');
    if (!pending.length) return;
    pending.forEach((it) => analyzeDocument(it));
  }, [loadingLists, items]);

  const canUpload = items.some(
    (it) => it.selected && it.targetId && it.docTypeId && it.status !== "uploading"
  );

  const uploadSelected = async () => {
    const toUpload = items.filter((it) => it.selected);
    if (!toUpload.length) {
      toast.error("Select at least one item");
      return;
    }
    // validar requeridos
    const invalid = toUpload.find((it) => !it.targetId || !it.docTypeId || !it.sourceType);
    if (invalid) {
      toast.error("Source, entity and document type are required per file");
      return;
    }

    setUploading(true);
    try {
      const updated = [...items];
      for (let i = 0; i < toUpload.length; i++) {
        const it = toUpload[i];
        const idx = updated.findIndex((x) => x.id === it.id);
        updated[idx] = { ...updated[idx], status: "uploading", message: "" };
        setItems([...updated]);

        try {
          let file_uri = it.tmp_file_uri;
          if (!file_uri) {
            const up = await base44.integrations.Core.UploadPrivateFile({ file: it.file });
            file_uri = up.file_uri;
          }

          if (it.sourceType === 'client') {
            await base44.entities.CustomerDocument.create({
              customer_id: it.targetId,
              document_type_id: it.docTypeId,
              file_urls: [file_uri],
              file_names: [it.title || it.file.name],
              upload_date: new Date().toISOString(),
            });
          } else if (it.sourceType === 'project') {
            await base44.entities.ProjectDocument.create({
              project_id: it.targetId,
              document_type_id: it.docTypeId,
              file_urls: [file_uri],
              file_names: [it.title || it.file.name],
              upload_date: new Date().toISOString(),
            });
          } else if (it.sourceType === 'asset') {
            await base44.entities.AssetDocument.create({
              owner_type: 'asset',
              owner_id: it.targetId,
              document_type_id: it.docTypeId,
              file_urls: [file_uri],
              file_names: [it.title || it.file.name],
              upload_date: new Date().toISOString(),
            });
          } else if (it.sourceType === 'user') {
            await base44.entities.EmployeeDocument.create({
              employee_id: it.targetId,
              document_type_id: it.docTypeId,
              file_urls: [file_uri],
              file_names: [it.title || it.file.name],
              upload_date: new Date().toISOString(),
            });
          }

          updated[idx] = { ...updated[idx], status: "done", message: "Uploaded" };
        } catch (err) {
          console.error(err);
          updated[idx] = { ...updated[idx], status: "error", message: err?.message || "Error" };
        }
        setItems([...updated]);
      }
      const ok = updated.filter((i) => i.status === "done").length;
      if (ok) toast.success(`${ok} document(s) uploaded`);
      const ko = updated.filter((i) => i.status === "error").length;
      if (ko) toast.error(`${ko} upload(s) failed`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileUp className="w-4 h-4" /> Document Uploader
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-slate-600">Default title (optional)</label>
              <Input
                value={defaultTitle}
                onChange={(e) => setDefaultTitle(e.target.value)}
                placeholder="Default title for new files"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Default source</label>
              <Select value={defaultSource} onValueChange={setDefaultSource}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end justify-between">
              <div className="text-sm text-slate-600">Files: {items.length}/{MAX_FILES}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openPicker}>
                  <UploadCloud className="w-4 h-4 mr-2" /> Select files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={onFileChange}
                  className="hidden"
                />
                <Button size="sm" onClick={uploadSelected} disabled={!canUpload || uploading || loadingLists} className="bg-indigo-600 hover:bg-indigo-700">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Upload selected
                </Button>
                <Button size="sm" variant="ghost" onClick={clearCompleted} disabled={!items.some(i=>i.status==='done')}>
                  Clear completed
                </Button>
              </div>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={onDrop}
            className="mt-2 border-2 border-dashed rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="text-slate-600">Drag and drop here (max. {MAX_FILES} files) or click "Select files"</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No files in the queue</div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => {
                const entityLabel = it.sourceType === 'client' ? 'Customer' : it.sourceType === 'project' ? 'Project' : it.sourceType === 'asset' ? 'Asset' : 'User';
                const entityOptions = it.sourceType === 'client' ? customers : it.sourceType === 'project' ? projects : it.sourceType === 'asset' ? assets : users;
                const types = it.sourceType === 'client' ? clientDocTypes : it.sourceType === 'project' ? projectDocTypes : it.sourceType === 'asset' ? assetDocTypes : employeeDocTypes;
                const entityName = (row) => row?.name || row?.full_name || `${row?.first_name || ''} ${row?.last_name || ''}` || '';
                return (
                <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border rounded-lg p-3">
                  <div className="md:col-span-1">
                    <input
                      type="checkbox"
                      checked={it.selected}
                      onChange={(e) => setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, selected: e.target.checked } : x))}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-sm font-medium truncate" title={it.file.name}>{it.file.name}</div>
                    <div className="text-xs text-slate-500">{Math.round(it.file.size/1024)} KB</div>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      value={it.title}
                      onChange={(e) => setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, title: e.target.value } : x))}
                      placeholder="Title"
                      className="h-9"
                    />
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      {it.analysis_status === 'running' && (<><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>)}
                      {it.analysis_status === 'done' && (<><Wand2 className="w-3 h-3 text-indigo-600" /> {it.analysis_message || 'Suggestions applied'}</>)}
                      {it.analysis_status === 'error' && (<><AlertCircle className="w-3 h-3 text-red-600" /> {it.analysis_message || 'Failed to analyze'}</>)}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      value={it.sourceType}
                      onValueChange={(v) => setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, sourceType: v, targetId: '', docTypeId: '' } : x))}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      value={it.targetId || ""}
                      onValueChange={(v) => setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, targetId: v } : x))}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder={entityLabel} /></SelectTrigger>
                      <SelectContent>
                        {entityOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{entityName(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1">
                    <Select
                      value={it.docTypeId || ""}
                      onValueChange={(v) => setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, docTypeId: v } : x))}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Doc type" /></SelectTrigger>
                      <SelectContent>
                        {types.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1 flex items-center justify-end gap-2">
                    {it.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                    {it.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    {it.status === "error" && <AlertCircle className="w-4 h-4 text-red-600" title={it.message} />}
                    <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)} disabled={it.status === "uploading"}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}