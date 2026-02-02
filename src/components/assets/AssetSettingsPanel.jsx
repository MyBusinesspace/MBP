import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tags, ListChecks, Plus, Trash2, Edit2, Save, X, GripVertical, Upload, ImageIcon, Package, Building, Pencil, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssetCategory, AssetSubcategory, AssetStatus, Asset, Branch, FinanceCategory, AssetCustomField } from '@/entities/all';
import { useData } from '../DataProvider';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import InlineInput from '../InlineInput';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '../users/ImageCropDialog';

export default function AssetSettingsPanel({ isOpen, onClose, onSettingsChanged }) {
  const { currentCompany, setCurrentCompany } = useData();
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [financeCategories, setFinanceCategories] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Categories state
  const [newCategory, setNewCategory] = useState({ name: '', color: 'blue', description: '', icon: 'Package', icon_url: null });
  
  // Subcategories state
  const [newSubcategory, setNewSubcategory] = useState({ name: '', category_id: '', description: '' });

  // Status state
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('green');

  // Finance Category state
  const [newFinanceCategoryName, setNewFinanceCategoryName] = useState('');
  const [newFinanceCategoryColor, setNewFinanceCategoryColor] = useState('blue');

  // Custom Fields state
  const [newCustomField, setNewCustomField] = useState({ label: '', field_type: 'text', options: [] });
  const [editingOptions, setEditingOptions] = useState('');
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editingFieldData, setEditingFieldData] = useState(null);

  // Tab icons state
  const [assetsTabIconUrl, setAssetsTabIconUrl] = useState(currentCompany?.assets_tab_icon_url || '');
  const [equipmentTabIconUrl, setEquipmentTabIconUrl] = useState(currentCompany?.equipment_tab_icon_url || '');
  const [sidebarTabIconUrl, setSidebarTabIconUrl] = useState(currentCompany?.documents_assets_tab_icon_url || '');
  const [uploadingAssetsIcon, setUploadingAssetsIcon] = useState(false);
  const [uploadingEquipmentIcon, setUploadingEquipmentIcon] = useState(false);
  const [uploadingSidebarIcon, setUploadingSidebarIcon] = useState(false);
  
  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropTarget, setCropTarget] = useState(null); // 'assets', 'equipment', 'sidebar', 'new-category', or category ID for editing

  const colors = ['gray', 'red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink', 'orange', 'teal'];
  const colorOptions = colors.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1), class: `bg-${c}-100 text-${c}-800` }));

  const getColorClass = (color) => {
      const map = {
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
      return map[color] || map.blue;
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setAssetsTabIconUrl(currentCompany?.assets_tab_icon_url || '');
      setEquipmentTabIconUrl(currentCompany?.equipment_tab_icon_url || '');
      setSidebarTabIconUrl(currentCompany?.documents_assets_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  const loadData = async () => {
    try {
      const [cats, subcats, stats, financeCats, customFlds] = await Promise.all([
        AssetCategory.list('sort_order'),
        AssetSubcategory.list('sort_order'),
        AssetStatus.list('sort_order'),
        FinanceCategory.list('sort_order'),
        AssetCustomField.list('sort_order')
      ]);
      setCategories(cats || []);
      setSubcategories(subcats || []);
      setStatuses(stats || []);
      setFinanceCategories(financeCats || []);
      setCustomFields(customFlds || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategory.name.trim()) return;
    
    try {
      const exists = categories.some(c => c.name.toLowerCase() === newCategory.name.trim().toLowerCase());
      if (exists) {
        toast.error('Category already exists');
        return;
      }

      const maxSortOrder = Math.max(...categories.map(c => c.sort_order || 0), 0);
      await AssetCategory.create({
        ...newCategory,
        sort_order: maxSortOrder + 1
      });
      
      toast.success('Category added');
      setNewCategory({ name: '', color: 'blue', description: '', icon: 'Package', icon_url: null });
      loadData();
      if (onSettingsChanged) onSettingsChanged();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleUpdateCategory = async (id, field, value) => {
    try {
      // Store old value if we are updating the name
      let oldName = null;
      if (field === 'name') {
        const category = categories.find(c => c.id === id);
        if (category) oldName = category.name;
      }

      await AssetCategory.update(id, { [field]: value });

      // If name changed, update all related assets
      if (field === 'name' && oldName && oldName !== value) {
         const assetsToUpdate = await Asset.filter({ category: oldName });
         if (assetsToUpdate.length > 0) {
            const loadingToast = toast.loading(`Updating ${assetsToUpdate.length} assets to new category...`);
            try {
                await Promise.all(assetsToUpdate.map(asset => 
                    Asset.update(asset.id, { category: value })
                ));
                toast.dismiss(loadingToast);
                toast.success(`Updated ${assetsToUpdate.length} assets to "${value}"`);
            } catch (err) {
                console.error("Error updating assets:", err);
                toast.dismiss(loadingToast);
                toast.error("Failed to update linked assets");
            }
         }
      }

      if (field !== 'name') toast.success('Updated');
      loadData();
      if (onSettingsChanged) onSettingsChanged();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    
    try {
      const assets = await Asset.filter({ category: categories.find(c => c.id === id)?.name });
      if (assets.length > 0) {
        toast.error(`Cannot delete: Used by ${assets.length} assets`);
        return;
      }

      await AssetCategory.delete(id);
      toast.success('Category deleted');
      loadData();
      if (onSettingsChanged) onSettingsChanged();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-6 py-4 bg-indigo-600 text-white border-b">
          <SheetTitle className="text-white">Asset Settings</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none px-6 bg-white">
            <TabsTrigger value="categories" className="gap-2">
              <Tags className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="subcategories" className="gap-2">
              <Tags className="w-4 h-4" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <ListChecks className="w-4 h-4" />
              Status
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Finance
            </TabsTrigger>
            <TabsTrigger value="tab-icons" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Tab Icons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
            <div className="bg-slate-50 border-b border-slate-200 p-3">
                <h3 className="font-medium text-slate-700 mb-2 text-xs">Add Asset Category</h3>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Category name"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            className="h-8 text-sm flex-1"
                        />
                        <Input
                            placeholder="Icon (Lucide name)"
                            value={newCategory.icon}
                            onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                            className="h-8 text-sm w-32"
                        />
                        <Select 
                            value={newCategory.color} 
                            onValueChange={(val) => setNewCategory({ ...newCategory, color: val })}
                        >
                            <SelectTrigger className="h-8 text-xs w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {colorOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        <Badge className={`${opt.class} text-[10px]`}>{opt.label}</Badge>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSaveCategory} size="sm" className="h-8 px-3 text-xs">
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                        <span className="text-xs text-slate-600">Or upload custom icon:</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                    setCropImageSrc(reader.result);
                                    setCropTarget('new-category');
                                    setCropDialogOpen(true);
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                            }}
                            className="hidden"
                            id="new-cat-icon-upload"
                        />
                        <label htmlFor="new-cat-icon-upload">
                            <Button variant="outline" size="sm" type="button" asChild className="h-7 text-xs">
                                <span className="cursor-pointer">
                                    <Upload className="w-3 h-3 mr-2" />
                                    Upload
                                </span>
                            </Button>
                        </label>
                        {newCategory.icon_url && (
                            <div className="flex items-center gap-2">
                                <img src={newCategory.icon_url} alt="Preview" className="w-6 h-6 object-contain" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setCropImageSrc(newCategory.icon_url);
                                        setCropTarget('new-category');
                                        setCropDialogOpen(true);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-blue-50"
                                    title="Edit icon"
                                >
                                    <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setNewCategory(prev => ({ ...prev, icon_url: null }))}
                                    className="h-6 w-6 p-0"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Category Name</TableHead>
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-20">Icon</TableHead>
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-24">Color</TableHead>
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Description</TableHead>
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-16 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map(category => (
                            <TableRow key={category.id} className="hover:bg-slate-50">
                                <TableCell className="py-1.5 px-3">
                                    <InlineInput
                                        value={category.name}
                                        onSave={(val) => handleUpdateCategory(category.id, 'name', val)}
                                        className="text-xs font-medium text-slate-900"
                                    />
                                </TableCell>
                                <TableCell className="py-1.5 px-3">
                                    <div className="flex items-center gap-2">
                                        {category.icon_url ? (
                                            <div className="flex items-center gap-1">
                                               <img 
                                                   src={category.icon_url} 
                                                   alt={category.name}
                                                   className="w-4 h-4 object-contain"
                                               />
                                               <Button
                                                   variant="ghost"
                                                   size="icon"
                                                   onClick={() => {
                                                       setCropImageSrc(category.icon_url);
                                                       setCropTarget(category.id);
                                                       setCropDialogOpen(true);
                                                   }}
                                                   className="h-4 w-4 p-0 hover:bg-blue-50"
                                                   title="Edit icon"
                                               >
                                                   <Pencil className="w-3 h-3 text-blue-500" />
                                               </Button>
                                               <Button
                                                   variant="ghost"
                                                   size="icon"
                                                   onClick={() => handleUpdateCategory(category.id, 'icon_url', null)}
                                                   className="h-4 w-4 p-0 hover:bg-red-50"
                                                   title="Remove icon"
                                               >
                                                   <X className="w-3 h-3 text-red-500" />
                                               </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <InlineInput
                                                    value={category.icon || 'Package'}
                                                    onSave={(val) => handleUpdateCategory(category.id, 'icon', val)}
                                                    className="text-xs text-slate-600 w-16"
                                                    placeholder="Icon"
                                                />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            setCropImageSrc(reader.result);
                                                            setCropTarget(category.id);
                                                            setCropDialogOpen(true);
                                                        };
                                                        reader.readAsDataURL(file);
                                                        e.target.value = '';
                                                    }}
                                                    className="hidden"
                                                    id={`upload-${category.id}`}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => document.getElementById(`upload-${category.id}`)?.click()}
                                                    className="h-5 w-5 p-0"
                                                    title="Upload icon"
                                                >
                                                    <Upload className="w-3 h-3 text-slate-500" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-1.5 px-3">
                                    <Select
                                        value={category.color}
                                        onValueChange={(val) => handleUpdateCategory(category.id, 'color', val)}
                                    >
                                        <SelectTrigger className="h-6 w-full bg-transparent border-none p-0">
                                            <SelectValue asChild>
                                                <Badge className={`${getColorClass(category.color)} text-[10px]`}>
                                                    {colorOptions.find(o => o.value === category.color)?.label}
                                                </Badge>
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {colorOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <Badge className={`${opt.class} text-[10px]`}>{opt.label}</Badge>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="py-1.5 px-3">
                                    <InlineInput
                                        value={category.description || ''}
                                        onSave={(val) => handleUpdateCategory(category.id, 'description', val)}
                                        placeholder="Optional"
                                        className="text-xs text-slate-600"
                                    />
                                </TableCell>
                                <TableCell className="py-1.5 px-3 text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="h-6 w-6 text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-20 text-center text-xs text-slate-500">
                                    No categories found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </TabsContent>

          <TabsContent value="subcategories" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
            {/* Subcategories Section */}
            <div className="bg-slate-50 border-b border-slate-200 p-3">
                <h3 className="font-medium text-slate-700 mb-2 text-xs">Add Subcategory</h3>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Select 
                            value={newSubcategory.category_id} 
                            onValueChange={(val) => setNewSubcategory({ ...newSubcategory, category_id: val })}
                        >
                            <SelectTrigger className="h-8 text-xs w-48">
                                <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Subcategory name"
                            value={newSubcategory.name}
                            onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
                            className="h-8 text-sm flex-1"
                        />
                        <Button 
                            onClick={async () => {
                                if (!newSubcategory.name.trim() || !newSubcategory.category_id) {
                                    toast.error('Please select category and enter name');
                                    return;
                                }
                                try {
                                    const maxOrder = Math.max(...subcategories.map(s => s.sort_order || 0), 0);
                                    await AssetSubcategory.create({
                                        ...newSubcategory,
                                        sort_order: maxOrder + 1
                                    });
                                    setNewSubcategory({ name: '', category_id: '', description: '' });
                                    loadData();
                                    if (onSettingsChanged) onSettingsChanged();
                                    toast.success('Subcategory added');
                                } catch (error) {
                                    toast.error('Failed to add subcategory');
                                }
                            }} 
                            size="sm" 
                            className="h-8 px-3 text-xs"
                            disabled={!newSubcategory.category_id || !newSubcategory.name.trim()}
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Category</TableHead>
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Subcategory Name</TableHead>
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Description</TableHead>
                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-16 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subcategories.map(subcat => {
                            const parentCat = categories.find(c => c.id === subcat.category_id);
                            return (
                                <TableRow key={subcat.id} className="hover:bg-slate-50">
                                    <TableCell className="py-1.5 px-3">
                                        <Select
                                            value={subcat.category_id}
                                            onValueChange={async (val) => {
                                                await AssetSubcategory.update(subcat.id, { category_id: val });
                                                loadData();
                                                if (onSettingsChanged) onSettingsChanged();
                                            }}
                                        >
                                            <SelectTrigger className="h-6 w-full bg-transparent border-none p-0">
                                                <SelectValue>
                                                    <Badge className={getColorClass(parentCat?.color || 'blue')}>
                                                        {parentCat?.name || 'Unknown'}
                                                    </Badge>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="py-1.5 px-3">
                                        <InlineInput
                                            value={subcat.name}
                                            onSave={async (val) => {
                                                await AssetSubcategory.update(subcat.id, { name: val });
                                                loadData();
                                                if (onSettingsChanged) onSettingsChanged();
                                            }}
                                            className="text-xs font-medium text-slate-900"
                                        />
                                    </TableCell>
                                    <TableCell className="py-1.5 px-3">
                                        <InlineInput
                                            value={subcat.description || ''}
                                            onSave={async (val) => {
                                                await AssetSubcategory.update(subcat.id, { description: val });
                                                loadData();
                                            }}
                                            placeholder="Optional"
                                            className="text-xs text-slate-600"
                                        />
                                    </TableCell>
                                    <TableCell className="py-1.5 px-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={async () => {
                                                if (!confirm('Delete this subcategory?')) return;
                                                try {
                                                    await AssetSubcategory.delete(subcat.id);
                                                    loadData();
                                                    if (onSettingsChanged) onSettingsChanged();
                                                    toast.success('Subcategory deleted');
                                                } catch (error) {
                                                    toast.error('Failed to delete');
                                                }
                                            }}
                                            className="h-6 w-6 text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {subcategories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-20 text-center text-xs text-slate-500">
                                    No subcategories found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Custom Fields Section */}
                <div className="border-t-4 border-slate-200 mt-4">
                  <div className="bg-slate-50 border-b border-slate-200 p-3">
                      <h3 className="font-medium text-slate-700 mb-2 text-xs">Add Custom Field</h3>
                      <p className="text-xs text-slate-500 mb-2">Create custom fields for assets (e.g., Color, Size, Engine Type)</p>
                      <div className="space-y-2">
                          <div className="flex gap-2">
                              <Input
                                  placeholder="Field label (e.g., 'Color')"
                                  value={newCustomField.label}
                                  onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                                  className="h-8 text-sm flex-1"
                              />
                              <Select 
                                  value={newCustomField.field_type} 
                                  onValueChange={(val) => setNewCustomField({ ...newCustomField, field_type: val })}
                              >
                                  <SelectTrigger className="h-8 text-xs w-32">
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="number">Number</SelectItem>
                                      <SelectItem value="date">Date</SelectItem>
                                      <SelectItem value="select">Select</SelectItem>
                                  </SelectContent>
                              </Select>
                              <Button 
                                  onClick={async () => {
                                      if (!newCustomField.label.trim()) {
                                          toast.error('Field label is required');
                                          return;
                                      }
                                      try {
                                          const maxOrder = Math.max(...customFields.map(f => f.sort_order || 0), 0);
                                          await AssetCustomField.create({
                                              ...newCustomField,
                                              sort_order: maxOrder + 1
                                          });
                                          setNewCustomField({ label: '', field_type: 'text', options: [] });
                                          setEditingOptions('');
                                          loadData();
                                          if (onSettingsChanged) onSettingsChanged();
                                          toast.success('Custom field added');
                                      } catch (error) {
                                          toast.error('Failed to add custom field');
                                      }
                                  }} 
                                  size="sm" 
                                  className="h-8 px-3 text-xs"
                              >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                              </Button>
                          </div>
                          {newCustomField.field_type === 'select' && (
                              <Input
                                  placeholder="Options (comma-separated, e.g., 'Red, Blue, Green')"
                                  value={editingOptions}
                                  onChange={(e) => {
                                      setEditingOptions(e.target.value);
                                      setNewCustomField({ 
                                          ...newCustomField, 
                                          options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                      });
                                  }}
                                  className="h-8 text-sm"
                              />
                          )}
                      </div>
                  </div>

                  <div className="space-y-1 p-2">
                      {customFields.map(field => {
                          const isEditing = editingFieldId === field.id;
                          return (
                              <div key={field.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-md group border border-transparent hover:border-slate-200 transition-all">
                                  <GripVertical className="w-4 h-4 text-slate-300 cursor-move opacity-0 group-hover:opacity-100 flex-shrink-0" />
                                  
                                  {isEditing ? (
                                      <>
                                          <Input
                                              value={editingFieldData?.label || ''}
                                              onChange={(e) => setEditingFieldData({ ...editingFieldData, label: e.target.value })}
                                              className="h-7 text-sm flex-1"
                                              placeholder="Field label"
                                              autoFocus
                                          />
                                          <Select
                                              value={editingFieldData?.field_type || 'text'}
                                              onValueChange={(val) => setEditingFieldData({ ...editingFieldData, field_type: val })}
                                          >
                                              <SelectTrigger className="h-7 w-24 text-xs">
                                                  <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="text">Text</SelectItem>
                                                  <SelectItem value="number">Number</SelectItem>
                                                  <SelectItem value="date">Date</SelectItem>
                                                  <SelectItem value="select">Select</SelectItem>
                                              </SelectContent>
                                          </Select>
                                          {editingFieldData?.field_type === 'select' && (
                                              <Input
                                                  value={editingFieldData?.options?.join(', ') || ''}
                                                  onChange={(e) => setEditingFieldData({ 
                                                      ...editingFieldData, 
                                                      options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                                  })}
                                                  className="h-7 text-xs flex-1"
                                                  placeholder="Options (comma-separated)"
                                              />
                                          )}
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={async () => {
                                                  if (!editingFieldData?.label?.trim()) return;
                                                  try {
                                                      await AssetCustomField.update(field.id, editingFieldData);
                                                      loadData();
                                                      if (onSettingsChanged) onSettingsChanged();
                                                      toast.success('Field updated');
                                                      setEditingFieldId(null);
                                                      setEditingFieldData(null);
                                                  } catch (error) {
                                                      toast.error('Failed to update');
                                                  }
                                              }}
                                              className="h-7 w-7 text-green-600 hover:bg-green-50"
                                          >
                                              <Save className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => {
                                                  setEditingFieldId(null);
                                                  setEditingFieldData(null);
                                              }}
                                              className="h-7 w-7 text-slate-400 hover:bg-slate-100"
                                          >
                                              <X className="w-3.5 h-3.5" />
                                          </Button>
                                      </>
                                  ) : (
                                      <>
                                          <span className="text-sm font-medium text-slate-900 flex-1">{field.label}</span>
                                          <Badge variant="outline" className="text-[10px] py-0 h-5">
                                              {field.field_type}
                                          </Badge>
                                          {field.field_type === 'select' && field.options?.length > 0 && (
                                              <span className="text-xs text-slate-500 truncate max-w-[200px]">
                                                  {field.options.join(', ')}
                                              </span>
                                          )}
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => {
                                                  setEditingFieldId(field.id);
                                                  setEditingFieldData({ ...field });
                                              }}
                                              className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                                          >
                                              <Edit2 className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={async () => {
                                                  if (!confirm('Delete this custom field?')) return;
                                                  try {
                                                      await AssetCustomField.delete(field.id);
                                                      loadData();
                                                      if (onSettingsChanged) onSettingsChanged();
                                                      toast.success('Custom field deleted');
                                                  } catch (error) {
                                                      toast.error('Failed to delete');
                                                  }
                                              }}
                                              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                          >
                                              <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                      </>
                                  )}
                              </div>
                          );
                      })}
                      {customFields.length === 0 && (
                          <div className="text-center py-8 text-slate-500 text-sm">
                              No custom fields defined yet.
                          </div>
                      )}
                  </div>
                </div>
            </div>
          </TabsContent>

          <TabsContent value="tab-icons" className="flex-1 flex flex-col overflow-hidden mt-0 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
                <p className="text-xs text-slate-500 mb-4">Customize the icons shown on the "Our Assets" and "Client Equipment" tabs.</p>
              </div>

              {/* Our Assets Tab Icon */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {assetsTabIconUrl ? (
                      <img src={assetsTabIconUrl} alt="Assets icon" className="w-6 h-6 object-contain" />
                    ) : (
                      <Package className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">Our Assets Tab Icon</h4>
                    <p className="text-xs text-slate-500">Default: Package icon</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setCropImageSrc(reader.result);
                        setCropTarget('assets');
                        setCropDialogOpen(true);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="assets-tab-icon-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    disabled={uploadingAssetsIcon}
                    onClick={() => document.getElementById('assets-tab-icon-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingAssetsIcon ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                  {assetsTabIconUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropImageSrc(assetsTabIconUrl);
                          setCropTarget('assets');
                          setCropDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!currentCompany?.id) return;
                          try {
                            await Branch.update(currentCompany.id, { assets_tab_icon_url: null });
                            setAssetsTabIconUrl('');
                            if (setCurrentCompany) setCurrentCompany({ ...currentCompany, assets_tab_icon_url: null });
                            toast.success('Icon reset to default');
                            if (onSettingsChanged) onSettingsChanged();
                          } catch (error) {
                            toast.error('Failed to reset icon');
                          }
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Client Equipment Tab Icon */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    {equipmentTabIconUrl ? (
                      <img src={equipmentTabIconUrl} alt="Equipment icon" className="w-6 h-6 object-contain" />
                    ) : (
                      <Building className="w-6 h-6 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">Client Equipment Tab Icon</h4>
                    <p className="text-xs text-slate-500">Default: Building icon</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setCropImageSrc(reader.result);
                        setCropTarget('equipment');
                        setCropDialogOpen(true);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="equipment-tab-icon-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    disabled={uploadingEquipmentIcon}
                    onClick={() => document.getElementById('equipment-tab-icon-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingEquipmentIcon ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                  {equipmentTabIconUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropImageSrc(equipmentTabIconUrl);
                          setCropTarget('equipment');
                          setCropDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!currentCompany?.id) return;
                          try {
                            await Branch.update(currentCompany.id, { equipment_tab_icon_url: null });
                            setEquipmentTabIconUrl('');
                            if (setCurrentCompany) setCurrentCompany({ ...currentCompany, equipment_tab_icon_url: null });
                            toast.success('Icon reset to default');
                            if (onSettingsChanged) onSettingsChanged();
                          } catch (error) {
                            toast.error('Failed to reset icon');
                          }
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Sidebar Tab Icon (Documents & Assets) */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {sidebarTabIconUrl ? (
                      <img src={sidebarTabIconUrl} alt="Sidebar icon" className="w-6 h-6 object-contain" />
                    ) : (
                      <Package className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">Sidebar Tab Icon (Documents & Assets)</h4>
                    <p className="text-xs text-slate-500">Custom icon for the sidebar navigation</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setCropImageSrc(reader.result);
                        setCropTarget('sidebar');
                        setCropDialogOpen(true);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="sidebar-tab-icon-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    disabled={uploadingSidebarIcon}
                    onClick={() => document.getElementById('sidebar-tab-icon-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingSidebarIcon ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                  {sidebarTabIconUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropImageSrc(sidebarTabIconUrl);
                          setCropTarget('sidebar');
                          setCropDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!currentCompany?.id) return;
                          try {
                            await Branch.update(currentCompany.id, { documents_assets_tab_icon_url: null });
                            setSidebarTabIconUrl('');
                            if (setCurrentCompany) setCurrentCompany({ ...currentCompany, documents_assets_tab_icon_url: null });
                            toast.success('Icon reset to default');
                            if (onSettingsChanged) onSettingsChanged();
                          } catch (error) {
                            toast.error('Failed to reset icon');
                          }
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Image Crop Dialog */}
          <ImageCropDialog
            isOpen={cropDialogOpen}
            onClose={() => {
              setCropDialogOpen(false);
              setCropImageSrc('');
              setCropTarget(null);
            }}
            imageUrl={cropImageSrc}
            onSave={async (croppedBlob) => {
              if (!cropTarget) return;
              
              try {
                const file = new File([croppedBlob], `category-icon.png`, { type: 'image/png' });
                const result = await base44.integrations.Core.UploadFile({ file });
                
                // Handle different crop targets
                if (cropTarget === 'new-category') {
                  // For new category being created
                  setNewCategory(prev => ({ ...prev, icon_url: result.file_url }));
                  toast.success('Icon uploaded!');
                } else if (cropTarget === 'assets' || cropTarget === 'equipment' || cropTarget === 'sidebar') {
                  // For tab icons
                  if (!currentCompany?.id) return;
                  
                  const setUploading = cropTarget === 'assets' ? setUploadingAssetsIcon : cropTarget === 'equipment' ? setUploadingEquipmentIcon : setUploadingSidebarIcon;
                  setUploading(true);
                  
                  const updateField = cropTarget === 'assets' ? 'assets_tab_icon_url' : cropTarget === 'equipment' ? 'equipment_tab_icon_url' : 'documents_assets_tab_icon_url';
                  await Branch.update(currentCompany.id, { [updateField]: result.file_url });
                  
                  if (cropTarget === 'assets') {
                    setAssetsTabIconUrl(result.file_url);
                    if (setCurrentCompany) setCurrentCompany({ ...currentCompany, assets_tab_icon_url: result.file_url });
                  } else if (cropTarget === 'equipment') {
                    setEquipmentTabIconUrl(result.file_url);
                    if (setCurrentCompany) setCurrentCompany({ ...currentCompany, equipment_tab_icon_url: result.file_url });
                  } else {
                    setSidebarTabIconUrl(result.file_url);
                    if (setCurrentCompany) setCurrentCompany({ ...currentCompany, documents_assets_tab_icon_url: result.file_url });
                  }
                  
                  setUploading(false);
                  toast.success('Icon updated!');
                  if (onSettingsChanged) onSettingsChanged();
                } else {
                  // For existing category (cropTarget is category ID)
                  await handleUpdateCategory(cropTarget, 'icon_url', result.file_url);
                  toast.success('Category icon updated!');
                }
              } catch (error) {
                console.error('Error saving icon:', error);
                toast.error('Failed to save icon');
              } finally {
                setCropDialogOpen(false);
                setCropImageSrc('');
                setCropTarget(null);
              }
            }}
          />

          <TabsContent value="finance" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
            <div className="bg-slate-50 border-b border-slate-200 p-3">
                <h3 className="font-medium text-slate-700 mb-2 text-xs">Add Finance Category</h3>
                <p className="text-xs text-slate-500 mb-2">Classify assets by accounting type (e.g., Fixed Assets for vehicles, Operational Fixed Assets for equipment)</p>
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g., 'Fixed Assets', 'Current Assets'"
                        value={newFinanceCategoryName}
                        onChange={(e) => setNewFinanceCategoryName(e.target.value)}
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter' && newFinanceCategoryName.trim()) {
                                try {
                                    const maxOrder = Math.max(...financeCategories.map(s => s.sort_order || 0), 0);
                                    await FinanceCategory.create({
                                        name: newFinanceCategoryName,
                                        color: newFinanceCategoryColor,
                                        sort_order: maxOrder + 1
                                    });
                                    setNewFinanceCategoryName('');
                                    loadData();
                                    if (onSettingsChanged) onSettingsChanged();
                                    toast.success("Finance category added");
                                } catch (error) {
                                    toast.error("Failed to add finance category");
                                }
                            }
                        }}
                        className="h-8 text-sm flex-1"
                    />
                    <Select value={newFinanceCategoryColor} onValueChange={setNewFinanceCategoryColor}>
                        <SelectTrigger className="h-8 text-xs w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {colorOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorClass(opt.value)}`}>
                                        {opt.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button 
                        onClick={async () => {
                            if (!newFinanceCategoryName.trim()) return;
                            try {
                                const maxOrder = Math.max(...financeCategories.map(s => s.sort_order || 0), 0);
                                await FinanceCategory.create({
                                    name: newFinanceCategoryName,
                                    color: newFinanceCategoryColor,
                                    sort_order: maxOrder + 1
                                });
                                setNewFinanceCategoryName('');
                                loadData();
                                if (onSettingsChanged) onSettingsChanged();
                                toast.success("Finance category added");
                            } catch (error) {
                                toast.error("Failed to add finance category");
                            }
                        }} 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="space-y-1 p-2">
                    {financeCategories.map(fc => (
                        <div key={fc.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md group border border-transparent hover:border-slate-200">
                            <div className="flex items-center gap-3 flex-1">
                                <GripVertical className="w-4 h-4 text-slate-300 cursor-move opacity-0 group-hover:opacity-100" />
                                <div className="flex-1">
                                    <InlineInput
                                        value={fc.name}
                                        onSave={async (val) => {
                                            await FinanceCategory.update(fc.id, { name: val });
                                            loadData();
                                            if (onSettingsChanged) onSettingsChanged();
                                        }}
                                        className="text-sm font-medium text-slate-900"
                                    />
                                    <InlineInput
                                        value={fc.description || ''}
                                        onSave={async (val) => {
                                            await FinanceCategory.update(fc.id, { description: val });
                                            loadData();
                                        }}
                                        placeholder="Add description..."
                                        className="text-xs text-slate-500 mt-0.5"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Select
                                    value={fc.color}
                                    onValueChange={async (val) => {
                                        await FinanceCategory.update(fc.id, { color: val });
                                        setFinanceCategories(prev => prev.map(s => s.id === fc.id ? { ...s, color: val } : s));
                                        if (onSettingsChanged) onSettingsChanged();
                                    }}
                                >
                                    <SelectTrigger className="h-7 w-24 border-none shadow-none bg-transparent p-0">
                                        <SelectValue asChild>
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorClass(fc.color)}`}>
                                                {fc.color.charAt(0).toUpperCase() + fc.color.slice(1)}
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colorOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorClass(opt.value)}`}>
                                                    {opt.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                        if (!confirm("Delete this finance category?")) return;
                                        try {
                                            await FinanceCategory.delete(fc.id);
                                            loadData();
                                            if (onSettingsChanged) onSettingsChanged();
                                            toast.success("Finance category deleted");
                                        } catch (error) {
                                            toast.error("Failed to delete");
                                        }
                                    }}
                                    className="h-7 w-7 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {financeCategories.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            No finance categories defined yet.
                        </div>
                    )}
                </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
            <div className="bg-slate-50 border-b border-slate-200 p-3">
                <h3 className="font-medium text-slate-700 mb-2 text-xs">Add Asset Status</h3>
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g., 'Available', 'In Use'"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter' && newStatusName.trim()) {
                                try {
                                    const maxOrder = Math.max(...statuses.map(s => s.sort_order || 0), 0);
                                    await AssetStatus.create({
                                        name: newStatusName,
                                        color: newStatusColor,
                                        sort_order: maxOrder + 1
                                    });
                                    setNewStatusName('');
                                    loadData();
                                    if (onSettingsChanged) onSettingsChanged();
                                    toast.success("Status added");
                                } catch (error) {
                                    toast.error("Failed to add status");
                                }
                            }
                        }}
                        className="h-8 text-sm flex-1"
                    />
                    <Select value={newStatusColor} onValueChange={setNewStatusColor}>
                        <SelectTrigger className="h-8 text-xs w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {colorOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorClass(opt.value)}`}>
                                        {opt.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button 
                        onClick={async () => {
                            if (!newStatusName.trim()) return;
                            try {
                                const maxOrder = Math.max(...statuses.map(s => s.sort_order || 0), 0);
                                await AssetStatus.create({
                                    name: newStatusName,
                                    color: newStatusColor,
                                    sort_order: maxOrder + 1
                                });
                                setNewStatusName('');
                                loadData();
                                if (onSettingsChanged) onSettingsChanged();
                                toast.success("Status added");
                            } catch (error) {
                                toast.error("Failed to add status");
                            }
                        }} 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="space-y-1 p-2">
                    {statuses.map(status => (
                        <div key={status.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md group border border-transparent hover:border-slate-200">
                            <div className="flex items-center gap-3 flex-1">
                                <GripVertical className="w-4 h-4 text-slate-300 cursor-move opacity-0 group-hover:opacity-100" />
                                <div className="flex-1">
                                    <InlineInput
                                        value={status.name}
                                        onSave={async (val) => {
                                            await AssetStatus.update(status.id, { name: val });
                                            loadData();
                                            if (onSettingsChanged) onSettingsChanged();
                                        }}
                                        className="text-sm font-medium text-slate-900"
                                    />
                                    <InlineInput
                                        value={status.description || ''}
                                        onSave={async (val) => {
                                            await AssetStatus.update(status.id, { description: val });
                                            loadData();
                                        }}
                                        placeholder="Add description..."
                                        className="text-xs text-slate-500 mt-0.5"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Select
                                    value={status.color}
                                    onValueChange={async (val) => {
                                        await AssetStatus.update(status.id, { color: val });
                                        setStatuses(prev => prev.map(s => s.id === status.id ? { ...s, color: val } : s));
                                        if (onSettingsChanged) onSettingsChanged();
                                    }}
                                >
                                    <SelectTrigger className="h-7 w-24 border-none shadow-none bg-transparent p-0">
                                        <SelectValue asChild>
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorClass(status.color)}`}>
                                                {status.color.charAt(0).toUpperCase() + status.color.slice(1)}
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colorOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorClass(opt.value)}`}>
                                                    {opt.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                        if (!confirm("Delete this status?")) return;
                                        try {
                                            await AssetStatus.delete(status.id);
                                            loadData();
                                            if (onSettingsChanged) onSettingsChanged();
                                            toast.success("Status deleted");
                                        } catch (error) {
                                            toast.error("Failed to delete");
                                        }
                                    }}
                                    className="h-7 w-7 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {statuses.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            No statuses defined yet.
                        </div>
                    )}
                </div>
            </div>
          </TabsContent>


        </Tabs>
      </SheetContent>
    </Sheet>
  );
}