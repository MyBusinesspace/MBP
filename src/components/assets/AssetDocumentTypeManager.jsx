import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Folder, Settings } from "lucide-react";

export default function AssetDocumentTypeManager({ isOpen, onClose }) {
  const [types, setTypes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [t, f] = await Promise.all([
      base44.entities.AssetDocumentType.list("sort_order", 5000),
      base44.entities.AssetDocumentFolder.list("sort_order", 5000)
    ]);
    setTypes(Array.isArray(t) ? t : []);
    setFolders(Array.isArray(f) ? f : []);
  };

  useEffect(() => { if (isOpen) loadData(); }, [isOpen]);

  const addType = async () => {
    if (!newTypeName.trim()) return;
    setSaving(true);
    await base44.entities.AssetDocumentType.create({ name: newTypeName.trim() });
    setNewTypeName("");
    await loadData();
    setSaving(false);
  };

  const addFolder = async () => {
    if (!newFolderName.trim()) return;
    setSaving(true);
    await base44.entities.AssetDocumentFolder.create({ name: newFolderName.trim() });
    setNewFolderName("");
    await loadData();
    setSaving(false);
  };

  const updateType = async (id, updates) => {
    setSaving(true);
    await base44.entities.AssetDocumentType.update(id, updates);
    await loadData();
    setSaving(false);
  };

  const deleteType = async (id) => {
    setSaving(true);
    await base44.entities.AssetDocumentType.delete(id);
    await loadData();
    setSaving(false);
  };

  const deleteFolder = async (id) => {
    setSaving(true);
    await base44.entities.AssetDocumentFolder.delete(id);
    await loadData();
    setSaving(false);
  };

  return (
    <Dialog open={!!isOpen} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings className="w-4 h-4"/> Manage Asset Types & Folders</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">Folders</h3>
            <div className="flex gap-2 mb-3">
              <Input placeholder="New folder" value={newFolderName} onChange={(e)=>setNewFolderName(e.target.value)} />
              <Button onClick={addFolder} disabled={saving}> <Plus className="w-4 h-4 mr-1"/> Add</Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {folders.map(f => (
                <div key={f.id} className="flex items-center justify-between border rounded p-2">
                  <div className="flex items-center gap-2 text-sm"><Folder className="w-4 h-4"/>{f.name}</div>
                  <Button variant="ghost" size="icon" onClick={()=>deleteFolder(f.id)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              ))}
              {folders.length===0 && <div className="text-xs text-slate-500">No folders yet</div>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Types</h3>
            <div className="flex gap-2 mb-3">
              <Input placeholder="New type" value={newTypeName} onChange={(e)=>setNewTypeName(e.target.value)} />
              <Button onClick={addType} disabled={saving}> <Plus className="w-4 h-4 mr-1"/> Add</Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {types.map(t => (
                <div key={t.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center border rounded p-2">
                  <Input defaultValue={t.name} onBlur={(e)=>{ const v=e.target.value.trim(); if (v && v!==t.name) updateType(t.id,{name:v}); }} />
                  <Select value={t.folder_id || "none"} onValueChange={(val)=>updateType(t.id,{ folder_id: val==="none"? null : val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No folder</SelectItem>
                      {folders.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={()=>deleteType(t.id)}><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </div>
              ))}
              {types.length===0 && <div className="text-xs text-slate-500">No types yet</div>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}