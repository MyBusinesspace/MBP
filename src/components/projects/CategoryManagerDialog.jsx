
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, X, Loader2, Edit2 } from 'lucide-react';
import { toast } from "sonner";
import { ProjectCategory } from '@/entities/ProjectCategory';

const colorOptions = {
  gray: 'bg-gray-100 text-gray-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  purple: 'bg-purple-100 text-purple-800',
  pink: 'bg-pink-100 text-pink-800',
  orange: 'bg-orange-100 text-orange-800',
  teal: 'bg-teal-100 text-teal-800'
};

export default function CategoryManagerDialog({ isOpen, onClose, onCategoriesChanged, embedded = false }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', color: 'blue', description: '' });
  const [editingId, setEditingId] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await ProjectCategory.list('sort_order');
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load categories if the dialog is open or if the component is embedded (always visible)
    if (isOpen || embedded) {
      loadCategories();
    }
  }, [isOpen, embedded]); // Add embedded to dependencies

  const handleSave = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingId) {
        await ProjectCategory.update(editingId, newCategory);
        toast.success('Category updated successfully');
      } else {
        await ProjectCategory.create({
          ...newCategory,
          sort_order: categories.length
        });
        toast.success('Category created successfully');
      }
      
      setNewCategory({ name: '', color: 'blue', description: '' });
      setEditingId(null);
      await loadCategories();
      onCategoriesChanged();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setNewCategory({
      name: category.name,
      color: category.color,
      description: category.description || ''
    });
    setEditingId(category.id);
  };

  const handleDelete = async (category) => {
    if (!confirm('Are you sure you want to delete this category? Projects in this category will become uncategorized.')) {
        return;
    }
    try {
      await ProjectCategory.delete(category.id); // Corrected to use category.id
      toast.success('Category deleted successfully');
      await loadCategories();
      onCategoriesChanged();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewCategory({ name: '', color: 'blue', description: '' });
  };

  const content = (
    <div className="py-4">
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    {editingId === cat.id ? (
                      <Input 
                        value={newCategory.name} 
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})} 
                        className="h-9"
                      />
                    ) : (
                      <Badge className={`${colorOptions[cat.color]} font-medium`}>{cat.name}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === cat.id ? (
                      <Input 
                        value={newCategory.description} 
                        onChange={(e) => setNewCategory({...newCategory, description: e.target.value})} 
                        className="h-9"
                      />
                    ) : (
                      <span className="text-sm text-gray-600">{cat.description}</span>
                    )}
                  </TableCell>
                  <TableCell>
                     {editingId === cat.id ? (
                       <Select value={newCategory.color} onValueChange={(v) => setNewCategory({...newCategory, color: v})}>
                          <SelectTrigger className="h-9">
                            <SelectValue/>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(colorOptions).map(color => (
                              <SelectItem key={color} value={color}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${colorOptions[color].split(' ')[0]}`}></span>
                                  <span>{color.charAt(0).toUpperCase() + color.slice(1)}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                       </Select>
                     ) : (
                       <span className={`w-4 h-4 rounded-full inline-block ${colorOptions[cat.color].split(' ')[0]}`}></span>
                     )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === cat.id ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={handleSave} className="h-8 px-3">
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 px-2">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(cat)}
                          className="h-8 px-3"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDelete(cat)} // Corrected to pass cat object
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
            
            {/* Add new category row */}
            {!editingId && (
              <TableRow className="bg-gray-50">
                <TableCell>
                  <Input 
                    placeholder="New category name" 
                    value={newCategory.name} 
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})} 
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    placeholder="Description (optional)" 
                    value={newCategory.description} 
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})} 
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                    <Select value={newCategory.color} onValueChange={(v) => setNewCategory({...newCategory, color: v})}>
                        <SelectTrigger className="h-9">
                          <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                        {Object.keys(colorOptions).map(color => (
                            <SelectItem key={color} value={color}>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${colorOptions[color].split(' ')[0]}`}></span>
                                <span>{color.charAt(0).toUpperCase() + color.slice(1)}</span>
                            </div>
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={handleSave} className="h-8">
                    <Plus className="h-4 w-4 mr-1"/>
                    Add
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Project Categories</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
