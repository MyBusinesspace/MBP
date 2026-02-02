import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function ProjectDocumentTypeManager({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [types, setTypes] = useState([]);

  const [newFolderName, setNewFolderName] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeFolderId, setNewTypeFolderId] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [fRes, tRes] = await Promise.all([
        base44.entities.ProjectDocumentFolder.list("sort_order", 5000),
        base44.entities.ProjectDocumentType.list("sort_order", 5000),
      ]);
      setFolders(fRes || []);
      setTypes(tRes || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const addFolder = async () => {
    if (!newFolderName.trim()) return;
    const created = await base44.entities.ProjectDocumentFolder.create({ name: newFolderName.trim() });
    setFolders((prev) => [...prev, created]);
    setNewFolderName("");
    toast.success("Folder created");
  };

  const deleteFolder = async (id) => {
    await base44.entities.ProjectDocumentFolder.delete(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
  };

  const addType = async () => {
    if (!newTypeName.trim()) return;
    const created = await base44.entities.ProjectDocumentType.create({
      name: newTypeName.trim(),
      folder_id: newTypeFolderId || undefined,
    });
    setTypes((prev) => [...prev, created]);
    setNewTypeName("");
    setNewTypeFolderId("");
    toast.success("Type created");
  };

  const saveType = async (type) => {
    const updated = await base44.entities.ProjectDocumentType.update(type.id, type);
    setTypes((prev) => prev.map((t) => (t.id === type.id ? updated : t)));
    toast.success("Saved");
  };

  const deleteType = async (id) => {
    await base44.entities.ProjectDocumentType.delete(id);
    setTypes((prev) => prev.filter((t) => t.id !== id));
  };

  // Autosave helpers (like Clients)
  const updateTypeField = async (id, patch) => {
    const updated = await base44.entities.ProjectDocumentType.update(id, patch);
    setTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const updateFolderField = async (id, patch) => {
    const updated = await base44.entities.ProjectDocumentFolder.update(id, patch);
    setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
  };

  // Debounced autosave for type name edits (like Clients)
  const typeNameTimers = useRef({});
  const scheduleTypeNameSave = (id, name) => {
    const timers = typeNameTimers.current || {};
    if (timers[id]) clearTimeout(timers[id]);
    timers[id] = setTimeout(() => {
      updateTypeField(id, { name });
    }, 600);
    typeNameTimers.current = timers;
  };

  useEffect(() => {
    return () => {
      const timers = typeNameTimers.current || {};
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Project Document Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <Tabs defaultValue="types">
            <TabsList>
              <TabsTrigger value="types">Types</TabsTrigger>
              <TabsTrigger value="folders">Folders</TabsTrigger>
            </TabsList>

            <TabsContent value="types" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="New type name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                />
                <Select value={newTypeFolderId} onValueChange={setNewTypeFolderId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Folder (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addType} className="gap-2">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Folder</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {types.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Input
                            value={t.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: val } : x)));
                              scheduleTypeNameSave(t.id, val);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.folder_id || ""}
                            onValueChange={(val) => {
                              setTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, folder_id: val || undefined } : x)));
                              updateTypeField(t.id, { folder_id: val || undefined });
                            }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>None</SelectItem>
                              {folders.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="destructive" size="sm" onClick={() => deleteType(t.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="folders" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="New folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
                <Button onClick={addFolder} className="gap-2">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {folders.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Input
                            value={f.name}
                            onChange={(e) => setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)))}
                            onBlur={(e) => updateFolderField(f.id, { name: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={async () => {
                            const updated = await base44.entities.ProjectDocumentFolder.update(f.id, { name: f.name });
                            setFolders((prev) => prev.map((x) => (x.id === f.id ? updated : x)));
                            toast.success("Saved");
                          }}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteFolder(f.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}