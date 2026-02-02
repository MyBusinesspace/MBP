import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, X } from "lucide-react";

export default function TimesheetsSettingsPanel({ isOpen, onClose, onSaved }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catInput, setCatInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [docTypeInput, setDocTypeInput] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await base44.entities.TimesheetsSettings.list();
        if (rows && rows.length > 0) setRecord(rows[0]);
        else {
          const created = await base44.entities.TimesheetsSettings.create({
            categories: [],
            statuses: ["Open", "Approved", "Rejected"],
            document_types: ["PDF", "Image"],
            tab_icons: {},
            fields: []
          });
          setRecord(created);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  const updateRecord = (patch) => setRecord((prev) => ({ ...(prev || {}), ...patch }));
  const save = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await base44.entities.TimesheetsSettings.update(record.id, {
        categories: record.categories || [],
        statuses: record.statuses || [],
        document_types: record.document_types || [],
        tab_icons: record.tab_icons || {},
        fields: record.fields || []
      });
      if (typeof onSaved === 'function') onSaved(record);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => (!v ? onClose?.() : null)}>
      <SheetContent side="right" className="w-full sm:max-w-[720px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Timesheets Settings</SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="h-8">
                <X className="w-4 h-4 mr-1" /> Close
              </Button>
              <Button onClick={save} disabled={saving} className="h-8 gap-2">
                <Save className="w-4 h-4" /> Save
              </Button>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading settings…</div>
        ) : (
          <div className="mt-4">
            <Card className="p-4">
              <Tabs defaultValue="categories">
                <TabsList>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="statuses">Status</TabsTrigger>
                  <TabsTrigger value="docs">Document Types</TabsTrigger>
                  <TabsTrigger value="icons">Tab Icons</TabsTrigger>
                  <TabsTrigger value="fields">Fields</TabsTrigger>
                </TabsList>

                <TabsContent value="categories" className="mt-4 space-y-3 text-sm">
                  <div className="flex gap-2">
                    <Input value={catInput} onChange={(e) => setCatInput(e.target.value)} placeholder="Add category" className="h-8" />
                    <Button size="sm" onClick={() => { if (!catInput.trim()) return; updateRecord({ categories: [ ...(record.categories || []), catInput.trim() ] }); setCatInput(''); }} className="h-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(record.categories || []).map((c, idx) => (
                      <Badge key={idx} className="bg-slate-100 text-slate-700">
                        <span className="mr-2">{c}</span>
                        <button onClick={() => updateRecord({ categories: record.categories.filter((_, i) => i !== idx) })}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="statuses" className="mt-4 space-y-3 text-sm">
                  <div className="flex gap-2">
                    <Input value={statusInput} onChange={(e) => setStatusInput(e.target.value)} placeholder="Add status" className="h-8" />
                    <Button size="sm" onClick={() => { if (!statusInput.trim()) return; updateRecord({ statuses: [ ...(record.statuses || []), statusInput.trim() ] }); setStatusInput(''); }} className="h-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(record.statuses || []).map((s, idx) => (
                      <Badge key={idx} className="bg-slate-100 text-slate-700">
                        <span className="mr-2">{s}</span>
                        <button onClick={() => updateRecord({ statuses: record.statuses.filter((_, i) => i !== idx) })}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="docs" className="mt-4 space-y-3 text-sm">
                  <div className="flex gap-2">
                    <Input value={docTypeInput} onChange={(e) => setDocTypeInput(e.target.value)} placeholder="Add document type" className="h-8" />
                    <Button size="sm" onClick={() => { if (!docTypeInput.trim()) return; updateRecord({ document_types: [ ...(record.document_types || []), docTypeInput.trim() ] }); setDocTypeInput(''); }} className="h-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(record.document_types || []).map((d, idx) => (
                      <Badge key={idx} className="bg-slate-100 text-slate-700">
                        <span className="mr-2">{d}</span>
                        <button onClick={() => updateRecord({ document_types: record.document_types.filter((_, i) => i !== idx) })}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="icons" className="mt-4 space-y-3 text-sm">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Timesheets tab icon URL</label>
                    <Input value={record.tab_icons?.timesheets_icon_url || ''} onChange={(e) => updateRecord({ tab_icons: { ...(record.tab_icons || {}), timesheets_icon_url: e.target.value } })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Timesheets settings tab icon URL</label>
                    <Input value={record.tab_icons?.timesheets_settings_icon_url || ''} onChange={(e) => updateRecord({ tab_icons: { ...(record.tab_icons || {}), timesheets_settings_icon_url: e.target.value } })} placeholder="https://..." />
                  </div>
                </TabsContent>

                <TabsContent value="fields" className="mt-4 space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <Input value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="Field label (column title)" className="col-span-1" />
                    <Input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} placeholder="Field key (data path)" className="col-span-1" />
                    <Button size="sm" onClick={() => { if (!fieldLabel.trim() || !fieldKey.trim()) return; updateRecord({ fields: [ ...(record.fields || []), { key: fieldKey.trim(), label: fieldLabel.trim(), default_visible: true } ] }); setFieldLabel(''); setFieldKey(''); }} className="col-span-1">Add</Button>
                  </div>
                  <div className="space-y-1">
                    {(record.fields || []).map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="text-slate-700 text-sm">{f.label} <span className="text-slate-400">({f.key})</span></div>
                        <Button variant="ghost" size="icon" onClick={() => updateRecord({ fields: record.fields.filter((_, i) => i !== idx) })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}