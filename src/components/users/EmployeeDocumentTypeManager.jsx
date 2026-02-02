import React, { useEffect, useState } from 'react';
import { EmployeeDocumentType } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeDocumentTypeManager({ isOpen, onClose, onSuccess }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await EmployeeDocumentType.list('sort_order', 1000);
      setTypes(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load employee document types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  const handleAdd = async () => {
    const name = newTypeName.trim();
    if (!name) return;
    try {
      const created = await EmployeeDocumentType.create({ name, sort_order: (types?.length || 0) + 1 });
      setTypes(prev => [...prev, created]);
      setNewTypeName('');
      toast.success('Type added');
      onSuccess && onSuccess();
    } catch (e) {
      toast.error('Failed to add type');
    }
  };

  const handleSave = async (id) => {
    const name = editingName.trim();
    if (!name) return;
    try {
      const updated = await EmployeeDocumentType.update(id, { name });
      setTypes(prev => prev.map(t => t.id === id ? updated : t));
      setEditingId(null);
      setEditingName('');
      toast.success('Type updated');
      onSuccess && onSuccess();
    } catch (e) {
      toast.error('Failed to update type');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document type?')) return;
    try {
      await EmployeeDocumentType.delete(id);
      setTypes(prev => prev.filter(t => t.id !== id));
      toast.success('Type deleted');
      onSuccess && onSuccess();
    } catch (e) {
      toast.error('Failed to delete type');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose && onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[520px] sm:max-w-[520px] bg-white p-0">
        <SheetHeader className="px-6 pt-6 pb-3 border-b">
          <SheetTitle>Manage Employee Document Types</SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New type name (e.g., Passport)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[60%]">Name</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> Loading...
                    </TableCell>
                  </TableRow>
                ) : types.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-slate-500">No types yet</TableCell>
                  </TableRow>
                ) : (
                  types.sort((a,b) => (a.sort_order||0)-(b.sort_order||0)).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        {editingId === t.id ? (
                          <Input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(t.id); }}
                          />
                        ) : (
                          <span className="text-sm text-slate-900">{t.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">{t.sort_order ?? '-'}</span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {editingId === t.id ? (
                          <Button size="sm" onClick={() => handleSave(t.id)}>Save</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(t.id); setEditingName(t.name); }}>
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <SheetFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}