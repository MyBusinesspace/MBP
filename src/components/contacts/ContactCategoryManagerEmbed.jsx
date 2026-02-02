import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, GripVertical, Upload, X } from 'lucide-react';
import { ContactCategory } from '@/entities/all';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '../users/ImageCropDialog';

const colorOptions = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' }
];

export default function ContactCategoryManagerEmbed({ embedded = false, onCategoriesChanged }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', color: 'blue', description: '', icon_url: '' });
  const [editingId, setEditingId] = useState(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await ContactCategory.list('sort_order');
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
  }, []);

  const handleSave = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingId) {
        await ContactCategory.update(editingId, newCategory);
        toast.success('Category updated');
      } else {
        await ContactCategory.create({
          ...newCategory,
          sort_order: categories.length
        });
        toast.success('Category created');
      }
      
      setNewCategory({ name: '', color: 'blue', description: '', icon_url: '' });
      setEditingId(null);
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setNewCategory({
      name: category.name,
      color: category.color,
      description: category.description || '',
      icon_url: category.icon_url || ''
    });
    setEditingId(category.id);
  };

  const handleIconUpload = async (file) => {
    setUploadingIcon(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setTempImageUrl(file_url);
      setShowCropDialog(true);
    } catch (error) {
      console.error('Failed to upload icon:', error);
      toast.error('Failed to upload icon');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleCroppedImage = (croppedImageUrl) => {
    setNewCategory({ ...newCategory, icon_url: croppedImageUrl });
    setShowCropDialog(false);
    setTempImageUrl(null);
  };

  const handleRemoveIcon = () => {
    setNewCategory({ ...newCategory, icon_url: '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }
    
    try {
      await ContactCategory.delete(id);
      toast.success('Category deleted');
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="font-medium text-slate-800 mb-1">Contact Categories</h3>
        <p className="text-xs text-slate-500 mb-4">Organize your contacts by category for easier filtering.</p>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
            <GripVertical className="w-4 h-4 text-slate-400" />
            
            <div className="flex-1">
              {editingId === cat.id ? (
                <div className="space-y-2">
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  placeholder="Category name"
                />
                <Select
                  value={newCategory.color}
                  onValueChange={(v) => setNewCategory({...newCategory, color: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded ${color.class}`}></span>
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Icon Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700">Category Icon</label>
                  {newCategory.icon_url ? (
                    <div className="flex items-center gap-2">
                      <img src={newCategory.icon_url} alt="Icon" className="w-10 h-10 object-contain rounded" />
                      <Button size="sm" variant="ghost" onClick={handleRemoveIcon}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={uploadingIcon}
                      onClick={() => document.getElementById(`icon-upload-${cat.id}`).click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                    </Button>
                  )}
                  <input
                    id={`icon-upload-${cat.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleIconUpload(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditingId(null);
                    setNewCategory({ name: '', color: 'blue', description: '', icon_url: '' });
                  }}>Cancel</Button>
                </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {cat.icon_url ? (
                      <img src={cat.icon_url} alt={cat.name} className="w-5 h-5 object-contain" />
                    ) : (
                      <span className={cn("w-4 h-4 rounded", colorOptions.find(c => c.value === cat.color)?.class)}></span>
                    )}
                    <span className="font-medium text-sm">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(cat)}>
                      <span className="text-xs">✏️</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {!editingId && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
            <Input
              placeholder="New category name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
            />
            <Select
              value={newCategory.color}
              onValueChange={(v) => setNewCategory({...newCategory, color: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map(color => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded ${color.class}`}></span>
                      <span>{color.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Icon Upload for new category */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Category Icon (Optional)</label>
              {newCategory.icon_url ? (
                <div className="flex items-center gap-2">
                  <img src={newCategory.icon_url} alt="Icon" className="w-10 h-10 object-contain rounded" />
                  <Button size="sm" variant="ghost" onClick={handleRemoveIcon}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploadingIcon}
                  onClick={() => document.getElementById('new-icon-upload').click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                </Button>
              )}
              <input
                id="new-icon-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleIconUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
            
            <Button size="sm" onClick={handleSave} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        )}
      </div>

      {/* Image Crop Dialog */}
      {showCropDialog && tempImageUrl && (
        <ImageCropDialog
          isOpen={showCropDialog}
          onClose={() => {
            setShowCropDialog(false);
            setTempImageUrl(null);
          }}
          imageUrl={tempImageUrl}
          onCropComplete={handleCroppedImage}
          aspectRatio={1}
        />
      )}
    </div>
  );
}