import React, { useState, useEffect } from 'react';
import { CalendarEventCategory } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function EventCategoryManager({ embedded = false, onCategoriesChanged }) {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('blue');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('blue');

  const availableColors = [
    { name: 'blue', class: 'bg-blue-500' },
    { name: 'green', class: 'bg-green-500' },
    { name: 'red', class: 'bg-red-500' },
    { name: 'yellow', class: 'bg-yellow-500' },
    { name: 'purple', class: 'bg-purple-500' },
    { name: 'pink', class: 'bg-pink-500' },
    { name: 'orange', class: 'bg-orange-500' },
    { name: 'gray', class: 'bg-gray-500' },
    { name: 'indigo', class: 'bg-indigo-500' },
    { name: 'teal', class: 'bg-teal-500' }
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await CalendarEventCategory.list('sort_order', 1000);
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setLoading(true);
    try {
      const maxSortOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.sort_order || 0)) 
        : -1;

      await CalendarEventCategory.create({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: '',
        sort_order: maxSortOrder + 1
      });

      setNewCategoryName('');
      setNewCategoryColor('blue');
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged();
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Failed to add category:', error);
      toast.error('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color || 'blue');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await CalendarEventCategory.update(editingId, {
        name: editName.trim(),
        color: editColor
      });

      setEditingId(null);
      setEditName('');
      setEditColor('blue');
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged();
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('blue');
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? Events using this category will need to be updated.')) {
      return;
    }

    setLoading(true);
    try {
      await CalendarEventCategory.delete(categoryId);
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged();
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryEmoji = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('call')) return '📞';
    if (name.includes('site') || name.includes('meeting')) return '🎯';
    if (name.includes('company') || name.includes('event')) return '🎉';
    if (name.includes('holiday') || name.includes('vacation')) return '🏖️';
    if (name.includes('deadline')) return '⏰';
    if (name.includes('personal')) return '👤';
    if (name.includes('day off')) return '🌙';
    return '📌';
  };

  return (
    <div className="space-y-4">
      {/* Add new category */}
      <div className="border rounded-lg p-4 bg-white">
        <h4 className="text-sm font-semibold mb-3">Add New Category</h4>
        <div className="space-y-3">
          <Input
            placeholder="Category name (e.g., Call Meeting, Site Visit)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
          />
          
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Select Color</label>
            <div className="flex gap-2 flex-wrap">
              {availableColors.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setNewCategoryColor(color.name)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    color.class,
                    newCategoryColor === color.name 
                      ? "border-slate-900 scale-110" 
                      : "border-slate-300 hover:scale-105"
                  )}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <Button 
            onClick={handleAddCategory} 
            disabled={loading || !newCategoryName.trim()}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Existing categories */}
      <div className="border rounded-lg p-4 bg-white">
        <h4 className="text-sm font-semibold mb-3">Existing Categories</h4>
        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No categories yet. Add your first category above.
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                
                {editingId === category.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    
                    <div className="flex gap-1">
                      {availableColors.map(color => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setEditColor(color.name)}
                          className={cn(
                            "w-6 h-6 rounded-full border transition-all",
                            color.class,
                            editColor === color.name 
                              ? "border-slate-900 scale-110" 
                              : "border-slate-300"
                          )}
                        />
                      ))}
                    </div>

                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full",
                        `bg-${category.color || 'blue'}-500`
                      )}
                    />
                    <span className="text-lg">{getCategoryEmoji(category.name)}</span>
                    <span className="flex-1 font-medium text-slate-900">
                      {category.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(category)}
                      disabled={loading}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}