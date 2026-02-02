import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, GripVertical, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WorkOrderCategory } from '@/entities/all';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const colorOptions = [
  { value: 'white', label: 'White', class: 'bg-white border border-slate-300' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-100' },
  { value: 'red', label: 'Red', class: 'bg-red-100' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100' },
  { value: 'green', label: 'Green', class: 'bg-green-100' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-100' }
];

import { useData } from '../DataProvider';

export default function WorkOrderCategoryManager({ onDataChanged }) {
  const { currentBranch } = useData();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', color: 'white', description: '' });
  const [editingId, setEditingId] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Load all categories, filtering by branch if available
      let data = await WorkOrderCategory.list('sort_order', 1000);
      
      // If currentBranch exists, prioritize categories for this branch but also show legacy ones
      if (currentBranch?.id && data && data.length > 0) {
        data = data.filter(cat => !cat.branch_id || cat.branch_id === currentBranch.id);
      }
      
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [currentBranch]);

  const handleSave = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const dataToSave = currentBranch?.id ? { ...newCategory, branch_id: currentBranch.id } : newCategory;
      
      if (editingId) {
        await WorkOrderCategory.update(editingId, dataToSave);
        toast.success('Category updated');
      } else {
        await WorkOrderCategory.create({
          ...dataToSave,
          sort_order: categories.length
        });
        toast.success('Category created');
      }
      
      setNewCategory({ name: '', color: 'white', description: '' });
      setEditingId(null);
      await loadCategories();
      if (onDataChanged) onDataChanged();
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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await WorkOrderCategory.delete(id);
      toast.success('Category deleted');
      await loadCategories();
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update sort_order for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index
    }));
    
    setCategories(updatedItems);
    
    // Save to database
    try {
      await Promise.all(
        updatedItems.map(item => 
          WorkOrderCategory.update(item.id, { sort_order: item.sort_order })
        )
      );
      toast.success('Category order updated');
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order');
      await loadCategories(); // Reload on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-slate-500">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {categories.map((category, index) => (
                <Draggable key={category.id} draggableId={category.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "flex items-center gap-2 p-2 bg-slate-50 rounded-lg",
                        snapshot.isDragging && "shadow-lg bg-white"
                      )}
                    >
                      <div {...provided.dragHandleProps}>
                        <GripVertical className="w-3 h-3 text-slate-400 cursor-grab active:cursor-grabbing" />
                      </div>
                      
                      <div className="flex-1">
                        {editingId === category.id ? (
                          <div className="space-y-2">
                            <Input
                              value={newCategory.name}
                              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                              placeholder="Category name"
                              className="h-8 text-xs"
                            />
                            <Input
                              value={newCategory.description}
                              onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                              placeholder="Description (optional)"
                              className="h-8 text-xs"
                            />
                            <div className="flex gap-1 flex-wrap">
                              {colorOptions.map(color => (
                                <button
                                  key={color.value}
                                  onClick={() => setNewCategory({...newCategory, color: color.value})}
                                  className={cn(
                                    "w-8 h-8 rounded border-2 transition-all",
                                    color.class,
                                    newCategory.color === color.value 
                                      ? "border-slate-900 scale-110" 
                                      : "border-slate-200 hover:border-slate-400"
                                  )}
                                  title={color.label}
                                />
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSave} className="h-7 text-xs">Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                                setEditingId(null);
                                setNewCategory({ name: '', color: 'white', description: '' });
                              }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-5 h-5 rounded",
                                colorOptions.find(c => c.value === category.color)?.class
                              )}></span>
                              <div>
                                <div className="font-medium text-xs">{category.name}</div>
                                {category.description && (
                                  <div className="text-[10px] text-slate-500">{category.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEdit(category)}>
                                <Pencil className="w-3 h-3 text-slate-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(category.id)}>
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {!editingId && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
          <Input
            placeholder="New category name"
            value={newCategory.name}
            onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Description (optional)"
            value={newCategory.description}
            onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
            className="h-8 text-xs"
          />
          <div className="flex gap-1 flex-wrap">
            {colorOptions.map(color => (
              <button
                key={color.value}
                onClick={() => setNewCategory({...newCategory, color: color.value})}
                className={cn(
                  "w-7 h-7 rounded border-2 transition-all",
                  color.class,
                  newCategory.color === color.value 
                    ? "border-slate-900 scale-110" 
                    : "border-slate-200 hover:border-slate-400"
                )}
                title={color.label}
              />
            ))}
          </div>
          <Button size="sm" onClick={handleSave} className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-3 h-3 mr-1" />
            Add Category
          </Button>
        </div>
      )}
    </div>
  );
}