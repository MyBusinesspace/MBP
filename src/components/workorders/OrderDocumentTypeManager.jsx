import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function OrderDocumentTypeManager({ categories = [], onDataChanged }) {
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);

  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.DocumentType.list("sort_order", 1000);
      setTypes(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const orderTypes = useMemo(() => (types || []).filter(t => t.work_order_category_id), [types]);

  const addType = async () => {
    if (!newName.trim() || !newCategoryId) {
      toast.error("Name and category are required");
      return;
    }
    const maxOrder = Math.max(...(types || []).map(t => t.sort_order || 0), 0);
    const created = await base44.entities.DocumentType.create({
      name: newName.trim(),
      work_order_category_id: newCategoryId,
      sort_order: maxOrder + 1
    });
    setTypes(prev => [...prev, created]);
    setNewName("");
    setNewCategoryId("");
    toast.success("Type added");
    onDataChanged && onDataChanged();
  };

  const updateType = async (id, field, value) => {
    await base44.entities.DocumentType.update(id, { [field]: value });
    setTypes(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    toast.success("Updated");
    onDataChanged && onDataChanged();
  };

  const removeType = async (id) => {
    if (!confirm("Delete this type?")) return;
    await base44.entities.DocumentType.delete(id);
    setTypes(prev => prev.filter(t => t.id !== id));
    toast.success("Deleted");
    onDataChanged && onDataChanged();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 border rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Type name (e.g., Working Report)" />
          <Select value={newCategoryId} onValueChange={setNewCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select WO category" />
            </SelectTrigger>
            <SelectContent>
              {(categories || []).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addType}>Add</Button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>WO Category</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderTypes.map(t => {
              const cat = (categories || []).find(c => c.id === t.work_order_category_id);
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    <Input value={t.name} onChange={e=>updateType(t.id,'name', e.target.value)} className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Select value={t.work_order_category_id || ''} onValueChange={val=>updateType(t.id,'work_order_category_id', val)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select category">{cat?.name}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(categories || []).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-red-600" onClick={()=>removeType(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {orderTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-slate-500">No order document types yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}