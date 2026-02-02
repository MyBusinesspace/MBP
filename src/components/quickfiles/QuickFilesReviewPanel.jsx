import React, { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { bestMatches } from "./utils";
import { Loader2 } from "lucide-react";

function guessTarget(docType, analysis) {
  if (docType === "invoice" || docType === "contract") return "Customer";
  if (docType === "purchase_order") return "Project";
  if (docType === "technical_report") return analysis?.asset_identifier ? "Asset" : "Project";
  return analysis?.target_entity_type || "Customer";
}

export default function QuickFilesReviewPanel({ open, onClose, fileUrl, fileName, analysis, customers, projects, assets, loading }) {
  const detectedType = analysis?.doc_type || "invoice";
  const [docType, setDocType] = useState(detectedType);
  const [targetType, setTargetType] = useState(guessTarget(detectedType, analysis));
  const [search, setSearch] = useState(analysis?.customer_name || analysis?.project_name || analysis?.asset_identifier || "");
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const candidates = useMemo(() => {
    const list = targetType === 'Customer' ? customers : targetType === 'Project' ? projects : targetType === 'Asset' ? assets : [];
    if (!Array.isArray(list)) return [];
    if (!search?.trim()) {
      return list.map((it) => ({ item: it, score: 0 }));
    }
    return bestMatches(list, 'name', search, Math.min(200, list.length));
  }, [customers, projects, assets, search, targetType]);

  const customerNameById = useMemo(() => {
    const map = {};
    (customers || []).forEach((c) => { if (c?.id) map[c.id] = c.name || ""; });
    return map;
  }, [customers]);

  const projectById = useMemo(() => {
    const map = {};
    (projects || []).forEach((p) => { if (p?.id) map[p.id] = p; });
    return map;
  }, [projects]);

  // Auto-select the only match to reduce clicks
  React.useEffect(() => {
    if (candidates.length === 1) {
      setSelectedId(candidates[0].item.id);
    }
  }, [candidates]);

  const confidence = Math.round(((analysis?.confidence ?? 0.6) + (candidates?.[0]?.score || 0)) * 50);

  const topId = useMemo(() => candidates?.[0]?.item?.id || "", [candidates]);

  React.useEffect(() => {
    setSelectedId(topId);
  }, [topId]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const doc = { url: fileUrl, name: fileName || 'document', upload_date: new Date().toISOString(), notes: note };
      if (targetType === 'Customer') {
        const cur = customers.find((c) => c.id === selectedId) || {};
        const arr = Array.isArray(cur.attached_documents) ? cur.attached_documents : [];
        await base44.entities.Customer.update(selectedId, { attached_documents: [...arr, doc] });
      } else if (targetType === 'Project') {
        const cur = projects.find((p) => p.id === selectedId) || {};
        const arr = Array.isArray(cur.attached_documents) ? cur.attached_documents : [];
        await base44.entities.Project.update(selectedId, { attached_documents: [...arr, doc] });
      } else if (targetType === 'Asset') {
        const cur = assets.find((a) => a.id === selectedId) || {};
        const arr = Array.isArray(cur.attached_documents) ? cur.attached_documents : [];
        await base44.entities.Asset.update(selectedId, { attached_documents: [...arr, doc] });
      }
      toast.success('Document attached');
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Failed to attach');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async () => {
    if (targetType !== 'Project' || !search?.trim()) return;
    setCreating(true);
    try {
      const proj = await base44.entities.Project.create({ name: search.trim() });
      setSelectedId(proj.id);
      toast.success('Project created');
    } catch (e) {
      toast.error(e?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (targetType !== 'Customer' || !search?.trim()) return;
    setCreating(true);
    try {
      const cust = await base44.entities.Customer.create({ name: search.trim() });
      setSelectedId(cust.id);
      toast.success('Customer created');
    } catch (e) {
      toast.error(e?.message || 'Failed to create customer');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateAsset = async () => {
    if (targetType !== 'Asset' || !search?.trim()) return;
    setCreating(true);
    try {
      const asset = await base44.entities.Asset.create({ name: search.trim(), category: 'Tool', status: 'Available' });
      setSelectedId(asset.id);
      toast.success('Asset created');
    } catch (e) {
      toast.error(e?.message || 'Failed to create asset');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Review & Attach</SheetTitle>
          <SheetDescription>Confirm the document type and destination. Edit if needed.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm text-slate-600 break-all">{fileName}</div>
              <div className="flex gap-2 items-center text-xs">
                <Badge variant="outline">Type: {docType}</Badge>
                <Badge variant="outline">Confidence: {confidence}%</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Document type</Label>
                  <Select value={docType} onValueChange={(v) => { setDocType(v); setTargetType(guessTarget(v, analysis)); }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="purchase_order">PO</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="technical_report">Technical report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Target</Label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger><SelectValue placeholder="Entity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Project">Project</SelectItem>
                      <SelectItem value="Asset">Asset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Select {targetType}</Label>
                <div className="mt-1">
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger><SelectValue placeholder={`Select ${targetType}`} /></SelectTrigger>
                    <SelectContent>
                      {candidates.map(({ item }) => {
                        const proj = item?.project_id ? projectById[item.project_id] : null;
                        const secondary = (
                          targetType === 'Project' ? (customerNameById[item?.customer_id] || '') :
                          targetType === 'Asset' ? [proj?.name, proj?.customer_id ? customerNameById[proj.customer_id] : null].filter(Boolean).join(' · ') :
                          targetType === 'Customer' ? (projects || []).filter(p => p?.customer_id === item.id).slice(0, 2).map(p => p.name).join(', ') :
                          ''
                        );
                        return (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              {secondary && <span className="text-slate-400 text-xs">{secondary}</span>}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {targetType === 'Project' && (
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={handleCreateProject} disabled={creating || !search?.trim()} className="gap-2">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Create project “{search?.trim() || 'New Project'}”
                    </Button>
                  </div>
                )}
                {targetType === 'Customer' && (
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={handleCreateCustomer} disabled={creating || !search?.trim()} className="gap-2">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Create customer “{search?.trim() || 'New Customer'}”
                    </Button>
                  </div>
                )}
                {targetType === 'Asset' && (
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={handleCreateAsset} disabled={creating || !search?.trim()} className="gap-2">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Create asset “{search?.trim() || 'New Asset'}”
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Note (optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Context / reference" />
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <div className="text-xs text-slate-500">Tip: If the entity isn’t listed, use “Create …” above and then save.</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button onClick={handleSave} disabled={!selectedId || saving || loading} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save & attach
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-slate-500">
            Routing: Invoices→Customer · PO→Project · Contracts→Customer · Technical reports→Project/Asset
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}