import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Trash2, 
  Loader2, 
  Upload, 
  File, 
  X, 
  Calendar, 
  Wrench, 
  Plus, 
  History,
  Eye,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { Asset, AssetMaintenance, AssetCategory, AssetStatus, FinanceCategory, AssetCustomField, AssetDocument, AssetDocumentType } from '@/entities/all';
import DocumentListTable from '@/components/shared/DocumentListTable';
import { UploadFile } from '@/integrations/Core';
import DocumentViewer from '../shared/DocumentViewer';
import Avatar from '../Avatar';
import { format, parseISO, differenceInDays } from 'date-fns';
import { base44 } from '@/api/base44Client';
import ProjectCombobox from '../workorders/ProjectCombobox';
import { cn } from '@/lib/utils';

export default function AssetDetailsPanel({
  isOpen,
  onClose,
  asset,
  users = [],
  projects = [],
  customers = [],
  onAssetUpdated,
  onAssetCreated,
  onAssetDeleted,
  isAdmin = false
}) {
  const [formData, setFormData] = useState(asset || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  // Viewer State
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    kilometers: '',
    hours: '',
    notes: ''
  });
  const [assetCategories, setAssetCategories] = useState([]);
  const [assetStatuses, setAssetStatuses] = useState([]);
  const [financeCategories, setFinanceCategories] = useState([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  // Typed docs state (Asset)
  const [assetDocTypes, setAssetDocTypes] = useState([]);
  const [assetDocs, setAssetDocs] = useState([]);
  const [assetViewingType, setAssetViewingType] = useState(null);
  const [assetTypedViewerFiles, setAssetTypedViewerFiles] = useState([]);
  const [isUploadingTyped, setIsUploadingTyped] = useState(false);

  const assetTypeMap = React.useMemo(() => new Map((assetDocTypes || []).map(t => [t.id, t.name])), [assetDocTypes]);
  const [showEditDocType, setShowEditDocType] = useState(false);
  const [editingDocRow, setEditingDocRow] = useState(null);
  const assetTableRows = React.useMemo(() => {
    const rows = [];
    (assetDocs || []).forEach(doc => {
      const typeName = assetTypeMap.get(doc.document_type_id) || '-';
      const urls = doc.file_urls || [];
      const names = doc.file_names || [];
      urls.forEach((u, idx) => rows.push({ url: u, title: names[idx] || 'document', type: typeName, date: doc.upload_date, documentId: doc.id }));
    });
    (formData?.attached_documents || []).forEach(d => rows.push({ url: d.url, title: d.name, type: 'Others', date: d.upload_date }));
    return rows;
  }, [assetDocs, assetDocTypes, formData?.attached_documents]);

  const assetViewFile = (row) => {
    setSelectedDocument({ url: row.url, name: row.title, upload_date: row.date });
    setShowDocumentViewer(true);
  };

  const assetEditFile = (row) => {
    setEditingDocRow(row);
    setShowEditDocType(true);
  };

  const assetDeleteFile = async (row) => {
    try {
      if (row.documentId) {
        const doc = assetDocs.find(d => d.id === row.documentId);
        if (!doc) return;
        const idx = (doc.file_urls || []).indexOf(row.url);
        if (doc.file_urls && doc.file_urls.length > 1) {
          const newUrls = doc.file_urls.filter(u => u !== row.url);
          const newNames = (doc.file_names || []).filter((_, i) => i !== idx);
          await AssetDocument.update(doc.id, { file_urls: newUrls, file_names: newNames, last_updated_date: new Date().toISOString() });
        } else {
          await AssetDocument.delete(doc.id);
        }
        const docs = await AssetDocument.filter({ owner_type: 'asset', owner_id: asset.id }, '-updated_date', 5000);
        setAssetDocs(docs || []);
      } else {
        // Legacy
        const docObj = (formData.attached_documents || []).find(d => d.url === row.url);
        if (docObj) {
          handleRemoveDocument(docObj);
        }
      }
      toast.success('Document removed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove');
    }
  };

  const photoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  const isCreating = asset?.id?.startsWith('temp-');

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUserData(user);
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    const loadCategoriesAndStatuses = async () => {
      try {
        const [categories, statuses, financeCats, customFlds] = await Promise.all([
          AssetCategory.list('sort_order'),
          AssetStatus.list('sort_order'),
          FinanceCategory.list('sort_order'),
          AssetCustomField.list('sort_order')
        ]);
        setAssetCategories(categories || []);
        setAssetStatuses(statuses || []);
        setFinanceCategories(financeCats || []);
        setCustomFieldDefinitions(customFlds || []);
      } catch (error) {
        console.error('Error loading categories and statuses:', error);
      }
    };
    loadCurrentUser();
    loadCategoriesAndStatuses();
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!asset?.id || !hasChanges) return;
    
    const draftKey = `asset-draft-${asset.id}`;
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [formData, hasChanges, asset?.id]);

  // Load draft on mount
  useEffect(() => {
    if (!asset?.id) return;
    
    const draftKey = `asset-draft-${asset.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      setHasDraft(true);
    }
  }, [asset?.id]);

  const loadDraft = () => {
    if (!asset?.id) return;
    
    const draftKey = `asset-draft-${asset.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setFormData(draftData);
        setHasChanges(true);
        setHasDraft(false);
        toast.success('Draft loaded');
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  };

  const discardDraft = () => {
    if (!asset?.id) return;
    
    const draftKey = `asset-draft-${asset.id}`;
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    toast.success('Draft discarded');
  };

  useEffect(() => {
    if (asset) {
      // Migration logic
      let attachedDocs = asset.attached_documents || [];
      if (attachedDocs.length === 0 && asset.document_urls && asset.document_urls.length > 0) {
        attachedDocs = asset.document_urls.map(url => ({
          url: url,
          name: url.split('/').pop().split('?')[0] || 'Document',
          upload_date: new Date().toISOString(),
          notes: ''
        }));
      }

      setFormData({
        ...asset,
        attached_documents: attachedDocs
      });
      setHasChanges(false);
      setActiveTab('details'); // Reset to first tab when asset changes
      if (!isCreating && activeTab === 'maintenance') {
        loadMaintenanceRecords();
      }

      // Load typed docs for this asset
      if (asset.id) {
        Promise.all([
          AssetDocumentType.list('sort_order', 2000),
          AssetDocument.filter({ owner_type: 'asset', owner_id: asset.id }, '-updated_date', 5000)
        ]).then(([types, docs]) => {
          setAssetDocTypes(types || []);
          setAssetDocs(docs || []);
        }).catch(() => {
          setAssetDocTypes([]);
          setAssetDocs([]);
        });
      }
    }
  }, [asset, isCreating]);

  const loadMaintenanceRecords = async () => {
    if (isCreating) return;
    
    setLoadingMaintenance(true);
    try {
      const records = await AssetMaintenance.filter({ asset_id: asset.id }, '-date');
      setMaintenanceRecords(records || []);
    } catch (error) {
      console.error('Error loading maintenance records:', error);
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-update last_status_change_date when status changes
      if (field === 'status' && value !== prev.status) {
        newData.last_status_change_date = new Date().toISOString();
        
        // Update status history
        const currentHistory = prev.status_history || [];
        const lastEntry = currentHistory[currentHistory.length - 1];
        
        // Close previous status period
        if (lastEntry && !lastEntry.end_date) {
          lastEntry.end_date = new Date().toISOString();
          lastEntry.duration_days = differenceInDays(new Date(), parseISO(lastEntry.start_date));
        }
        
        // Add new status entry
        const project = projects.find(p => p.id === prev.project_id);
        const newEntry = {
          status: value,
          start_date: new Date().toISOString(),
          end_date: null,
          duration_days: 0,
          project_id: prev.project_id || null,
          project_name: project?.name || null,
          notes: '',
          user_email: currentUserData?.email,
          user_name: currentUserData?.full_name
        };
        
        newData.status_history = [...currentHistory, newEntry];
      }
      
      return newData;
    });
    setHasChanges(true);
  };

  const addActivityLog = (action, details, changes = null) => {
    if (!currentUserData) return formData.activity_log || [];

    const newLog = {
      timestamp: new Date().toISOString(),
      action,
      user_email: currentUserData.email,
      user_name: currentUserData.full_name || currentUserData.email,
      details,
      ...(changes && { changes })
    };

    return [...(formData.activity_log || []), newLog];
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isCreating) {
        const { id, ...dataToCreate } = formData;
        const activity_log = addActivityLog('Created', 'Asset created');
        const newAsset = await Asset.create({ ...dataToCreate, activity_log });
        toast.success('Asset created successfully');
        onAssetCreated(newAsset);
        setFormData(newAsset);
      } else {
        const changes = {};
        Object.keys(formData).forEach(key => {
          if (JSON.stringify(formData[key]) !== JSON.stringify(asset[key]) && key !== 'activity_log' && key !== 'status_history') {
            changes[key] = { from: asset[key], to: formData[key] };
          }
        });

        const activity_log = addActivityLog('Edited', 'Asset updated', changes);
        const updatedAsset = await Asset.update(asset.id, { ...formData, activity_log });
        
        // Clear draft after successful save
        if (asset.id) {
          const draftKey = `asset-draft-${asset.id}`;
          localStorage.removeItem(draftKey);
          setHasDraft(false);
        }
        
        toast.success('Asset updated successfully');
        onAssetUpdated(updatedAsset);
      }
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving asset:', error);
      toast.error('Failed to save asset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    setIsDeleting(true);
    try {
      await Asset.delete(asset.id);
      toast.success('Asset deleted successfully');
      onAssetDeleted(asset.id);
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);

      const updatedUrls = [...(formData.file_urls || []), ...newUrls];
      handleChange('file_urls', updatedUrls);
      
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (urlToRemove) => {
    const updatedUrls = (formData.file_urls || []).filter(url => url !== urlToRemove);
    handleChange('file_urls', updatedUrls);
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingDocument(true);
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      
      const newDocs = results.map((r, index) => ({
        url: r.file_url,
        name: files[index].name,
        upload_date: new Date().toISOString(),
        notes: ''
      }));

      const currentDocs = formData.attached_documents || [];
      const updatedDocs = [...currentDocs, ...newDocs];
      
      handleChange('attached_documents', updatedDocs);
      
      // Sync legacy
      const legacyUrls = updatedDocs.map(d => d.url);
      handleChange('document_urls', legacyUrls);

      toast.success('Documents uploaded (Don\'t forget to Save)');
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploadingDocument(false);
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (docToRemove) => {
    const updatedDocs = (formData.attached_documents || []).filter(d => d.url !== docToRemove.url);
    handleChange('attached_documents', updatedDocs);
    
    const legacyUrls = updatedDocs.map(d => d.url);
    handleChange('document_urls', legacyUrls);
  };

  const handleUpdateDocNote = (index, note) => {
    const updatedDocs = [...(formData.attached_documents || [])];
    if (updatedDocs[index]) {
      updatedDocs[index] = { ...updatedDocs[index], notes: note };
      handleChange('attached_documents', updatedDocs);
    }
  };

  const handleUpdateDocName = (index, name) => {
    const updatedDocs = [...(formData.attached_documents || [])];
    if (updatedDocs[index]) {
      updatedDocs[index] = { ...updatedDocs[index], name: name };
      handleChange('attached_documents', updatedDocs);
    }
  };

  const openViewer = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
  };

  const handleAddMaintenance = async () => {
    if (!newMaintenance.date) {
      toast.error('Date is required');
      return;
    }

    try {
      const record = await AssetMaintenance.create({
        asset_id: asset.id,
        ...newMaintenance,
        kilometers: newMaintenance.kilometers ? parseFloat(newMaintenance.kilometers) : null,
        hours: newMaintenance.hours ? parseFloat(newMaintenance.hours) : null
      });

      setMaintenanceRecords(prev => [record, ...prev]);
      setNewMaintenance({
        date: format(new Date(), 'yyyy-MM-dd'),
        kilometers: '',
        hours: '',
        notes: ''
      });
      toast.success('Maintenance record added');
    } catch (error) {
      console.error('Error adding maintenance:', error);
      toast.error('Failed to add maintenance record');
    }
  };

  const handleDeleteMaintenance = async (recordId) => {
    if (!confirm('Delete this maintenance record?')) return;

    try {
      await AssetMaintenance.delete(recordId);
      setMaintenanceRecords(prev => prev.filter(r => r.id !== recordId));
      toast.success('Maintenance record deleted');
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      toast.error('Failed to delete maintenance record');
    }
  };

  if (!formData) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="p-0 overflow-hidden" style={{ width: '50vw', minWidth: '600px', maxWidth: '90vw' }}>
          <SheetHeader className="px-6 py-4 bg-indigo-600 text-white border-b sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-medium text-indigo-100">
                Asset: <span className="text-xl font-bold text-white">{isCreating ? 'New Asset' : formData.name || 'Asset Details'}</span>
              </SheetTitle>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="text-xs text-amber-600">Unsaved changes</span>
                )}
                {isAdmin && (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || (!hasChanges && !isCreating)}
                      size="sm"
                      className="gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </Button>
                    {!isCreating && (
                      <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        size="sm"
                        variant="ghost"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    )}
                  </>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Draft notification */}
            {hasDraft && (
              <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-xs text-amber-800 font-medium">You have unsaved changes from a previous session</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={loadDraft} className="h-7 text-xs">
                    Load Draft
                  </Button>
                  <Button size="sm" variant="ghost" onClick={discardDraft} className="h-7 text-xs text-amber-700">
                    Discard
                  </Button>
                </div>
              </div>
            )}
          </SheetHeader>

          <div className="overflow-y-auto h-[calc(100vh-73px)]">
          <Tabs value={activeTab} onValueChange={(newTab) => {
            if (hasChanges && !confirm('You have unsaved changes. Do you want to discard them?')) {
              return;
            }
            if (hasChanges) {
              // Reset to original asset data
              let attachedDocs = asset.attached_documents || [];
              if (attachedDocs.length === 0 && asset.document_urls && asset.document_urls.length > 0) {
                attachedDocs = asset.document_urls.map(url => ({
                  url: url,
                  name: url.split('/').pop().split('?')[0] || 'Document',
                  upload_date: new Date().toISOString(),
                  notes: ''
                }));
              }
              setFormData({
                ...asset,
                attached_documents: attachedDocs
              });
              setHasChanges(false);
            }
            setActiveTab(newTab);
          }} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none px-6 bg-white sticky top-0 z-10">
              <TabsTrigger value="details" className="gap-2">Details</TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <File className="w-4 h-4" />
                Documents ({formData.attached_documents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2">Maintenance</TabsTrigger>

              <TabsTrigger value="activity" className="gap-2">
                <History className="w-4 h-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="px-6 py-4 space-y-4">
              <div className="space-y-6">
                {/* Photos */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Photos</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {(formData.file_urls || []).map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Asset ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-lg border"
                        />
                        {isAdmin && (
                          <button
                            onClick={() => handleRemovePhoto(url)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {isAdmin && (
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center hover:border-indigo-400 transition-colors"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        ) : (
                          <Upload className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    )}
                    <input
                      ref={photoInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Type *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="Asset type"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category || 'Tool'}
                          onValueChange={(val) => handleChange('category', val)}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {formData.category || 'Tool'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {assetCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="subcategory">Subcategory</Label>
                        <Input
                          id="subcategory"
                          value={formData.subcategory || ''}
                          onChange={(e) => handleChange('subcategory', e.target.value)}
                          disabled={!isAdmin}
                          placeholder="e.g., Power Tools, Laptop, Van..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={formData.quantity || 1}
                          onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
                          disabled={!isAdmin}
                          placeholder="1"
                        />
                      </div>
                    </div>

                  <div>
                    <Label htmlFor="finance_category">Finance Category</Label>
                    <Select
                      value={formData.finance_category || ''}
                      onValueChange={(val) => handleChange('finance_category', val)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {formData.finance_category || 'Select finance category'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        {financeCategories.map(fc => (
                          <SelectItem key={fc.id} value={fc.name}>
                            {fc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status || 'Available'}
                        onValueChange={(val) => handleChange('status', val)}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {formData.status || 'Available'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {assetStatuses.map(stat => (
                            <SelectItem key={stat.id} value={stat.name}>
                              {stat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="last_status_change_date">Status Since</Label>
                      <div className="flex gap-2">
                        <Input
                          id="last_status_change_date"
                          type="date"
                          value={formData.last_status_change_date ? format(new Date(formData.last_status_change_date), 'yyyy-MM-dd') : ''}
                          onChange={(e) => handleChange('last_status_change_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                          disabled={!isAdmin}
                          className="flex-1"
                        />
                        {formData.last_status_change_date && (
                          <div className="flex items-center px-3 bg-indigo-50 rounded-md border border-indigo-200">
                            <span className="text-sm font-medium text-indigo-700">
                              {differenceInDays(new Date(), new Date(formData.last_status_change_date))} days
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="identifier">SN</Label>
                      <Input
                        id="identifier"
                        value={formData.identifier || ''}
                        onChange={(e) => handleChange('identifier', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="e.g., SN123456, VIN..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="plate_number">Plate Number</Label>
                      <Input
                        id="plate_number"
                        value={formData.plate_number || ''}
                        onChange={(e) => handleChange('plate_number', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="e.g., ABC-1234"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand || ''}
                        onChange={(e) => handleChange('brand', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="e.g., Zoomlion, Liebherr..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="year_of_manufacture">YOM</Label>
                      <Input
                        id="year_of_manufacture"
                        value={formData.year_of_manufacture || ''}
                        onChange={(e) => handleChange('year_of_manufacture', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="e.g., 2020"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mast_type">Mast Type</Label>
                      <Input
                        id="mast_type"
                        value={formData.mast_type || ''}
                        onChange={(e) => handleChange('mast_type', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="e.g., MonoB, Telescopic..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height</Label>
                      <Input
                        id="height"
                        value={formData.height || ''}
                        onChange={(e) => handleChange('height', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="e.g., 1.8m, 2.5m..."
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="assigned_to">Assigned To</Label>
                    <Select
                      value={formData.assigned_to_user_id || 'null'}
                      onValueChange={(val) => handleChange('assigned_to_user_id', val === 'null' ? null : val)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {formData.assigned_to_user_id ? 
                            users.find(u => u.id === formData.assigned_to_user_id)?.nickname || 
                            users.find(u => u.id === formData.assigned_to_user_id)?.first_name || 
                            users.find(u => u.id === formData.assigned_to_user_id)?.full_name || 
                            'Select user' 
                            : 'Select user'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">N/A</SelectItem>
                        {users
                          .filter(user => !user.archived)
                          .sort((a, b) => {
                            const nameA = (a.nickname || a.first_name || a.full_name || '').toLowerCase();
                            const nameB = (b.nickname || b.first_name || b.full_name || '').toLowerCase();
                            return nameA.localeCompare(nameB);
                          })
                          .map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.nickname || user.first_name || user.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="project">Project</Label>
                    <ProjectCombobox
                      projects={projects}
                      customers={customers}
                      selectedProjectId={formData.project_id}
                      onSelectProject={(id) => handleChange('project_id', id)}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="purchase_date">Purchase Date</Label>
                      <Input
                        id="purchase_date"
                        type="date"
                        value={formData.purchase_date || ''}
                        onChange={(e) => handleChange('purchase_date', e.target.value)}
                        disabled={!isAdmin}
                      />
                    </div>

                    <div>
                      <Label htmlFor="expiry_date">Expiry Date</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={formData.expiry_date || ''}
                        onChange={(e) => handleChange('expiry_date', e.target.value)}
                        disabled={!isAdmin}
                      />
                    </div>

                    <div>
                      <Label htmlFor="purchase_cost">Purchase Cost</Label>
                      <Input
                        id="purchase_cost"
                        type="number"
                        value={formData.purchase_cost || ''}
                        onChange={(e) => handleChange('purchase_cost', parseFloat(e.target.value) || 0)}
                        disabled={!isAdmin}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="depreciation_method">Depreciation Method</Label>
                    <Select
                      value={formData.depreciation_method || 'Straight Line'}
                      onValueChange={(val) => handleChange('depreciation_method', val)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {formData.depreciation_method || 'Straight Line'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Straight Line">Straight Line</SelectItem>
                        <SelectItem value="Declining Balance">Declining Balance</SelectItem>
                        <SelectItem value="Double Declining Balance">Double Declining Balance</SelectItem>
                        <SelectItem value="No Depreciation">No Depreciation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.depreciation_method !== 'No Depreciation' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="useful_life_years">Useful Life (Years)</Label>
                        <Input
                          id="useful_life_years"
                          type="number"
                          min="1"
                          value={formData.useful_life_years || 5}
                          onChange={(e) => handleChange('useful_life_years', parseInt(e.target.value) || 5)}
                          disabled={!isAdmin}
                          placeholder="5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="salvage_value">Salvage Value</Label>
                        <Input
                          id="salvage_value"
                          type="number"
                          step="0.01"
                          value={formData.salvage_value || 0}
                          onChange={(e) => handleChange('salvage_value', parseFloat(e.target.value) || 0)}
                          disabled={!isAdmin}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      disabled={!isAdmin}
                      rows={4}
                      placeholder="Additional notes about this asset..."
                    />
                  </div>

                  {/* Custom Fields */}
                  {(() => {
                    // Built-in field names to exclude from custom fields
                    const builtInFields = [
                      'name', 'type', 'category', 'subcategory', 'quantity',
                      'finance_category', 'status', 'identifier', 'sn', 'serial_number',
                      'plate_number', 'plate', 'brand', 'brands', 'year_of_manufacture', 'yom',
                      'mast_type', 'mast', 'height', 'assigned_to', 'project',
                      'purchase_date', 'expiry_date', 'purchase_cost',
                      'depreciation_method', 'useful_life_years', 'salvage_value', 'notes'
                    ];
                    
                    const filteredCustomFields = customFieldDefinitions.filter(fieldDef => 
                      !builtInFields.includes(fieldDef.label.toLowerCase())
                    );

                    if (filteredCustomFields.length === 0) return null;

                    return (
                      <div className="border-t pt-4 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900">Custom Fields</h3>
                        {filteredCustomFields.map(fieldDef => {
                          const customFields = formData.custom_fields || {};
                          const value = customFields[fieldDef.label] || '';
                          
                          return (
                            <div key={fieldDef.id}>
                              <Label htmlFor={`custom-${fieldDef.id}`}>{fieldDef.label}</Label>
                              {fieldDef.field_type === 'text' && (
                                <Input
                                  id={`custom-${fieldDef.id}`}
                                  value={value}
                                  onChange={(e) => {
                                    const newCustomFields = { ...customFields, [fieldDef.label]: e.target.value };
                                    handleChange('custom_fields', newCustomFields);
                                  }}
                                  disabled={!isAdmin}
                                  placeholder={`Enter ${fieldDef.label.toLowerCase()}`}
                                />
                              )}
                              {fieldDef.field_type === 'number' && (
                                <Input
                                  id={`custom-${fieldDef.id}`}
                                  type="number"
                                  value={value}
                                  onChange={(e) => {
                                    const newCustomFields = { ...customFields, [fieldDef.label]: e.target.value };
                                    handleChange('custom_fields', newCustomFields);
                                  }}
                                  disabled={!isAdmin}
                                  placeholder={`Enter ${fieldDef.label.toLowerCase()}`}
                                />
                              )}
                              {fieldDef.field_type === 'date' && (
                                <Input
                                  id={`custom-${fieldDef.id}`}
                                  type="date"
                                  value={value}
                                  onChange={(e) => {
                                    const newCustomFields = { ...customFields, [fieldDef.label]: e.target.value };
                                    handleChange('custom_fields', newCustomFields);
                                  }}
                                  disabled={!isAdmin}
                                />
                              )}
                              {fieldDef.field_type === 'select' && (
                                <Select
                                  value={value || ''}
                                  onValueChange={(val) => {
                                    const newCustomFields = { ...customFields, [fieldDef.label]: val };
                                    handleChange('custom_fields', newCustomFields);
                                  }}
                                  disabled={!isAdmin}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Select ${fieldDef.label.toLowerCase()}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={null}>None</SelectItem>
                                    {(fieldDef.options || []).map(option => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="px-6 py-4 space-y-4">
              <DocumentListTable rows={assetTableRows} onView={assetViewFile} onDelete={assetDeleteFile} onEdit={assetEditFile} showHeader={false} />

                <div className="flex items-center justify-between">
                  {isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => documentInputRef.current?.click()}
                      disabled={uploadingDocument}
                    >
                      {uploadingDocument ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  )}
                  <input
                    ref={documentInputRef}
                    type="file"
                    multiple
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                </div>

              </TabsContent>

              <TabsContent value="maintenance" className="px-6 py-4 space-y-4">
              <div className="space-y-6">
                {isAdmin && !isCreating && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Add Maintenance Record
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={newMaintenance.date}
                        onChange={(e) => setNewMaintenance(prev => ({ ...prev, date: e.target.value }))}
                        placeholder="Date"
                      />
                      <Input
                        type="number"
                        value={newMaintenance.kilometers}
                        onChange={(e) => setNewMaintenance(prev => ({ ...prev, kilometers: e.target.value }))}
                        placeholder="Kilometers"
                      />
                      <Input
                        type="number"
                        value={newMaintenance.hours}
                        onChange={(e) => setNewMaintenance(prev => ({ ...prev, hours: e.target.value }))}
                        placeholder="Hours"
                      />
                    </div>
                    <Textarea
                      value={newMaintenance.notes}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Maintenance notes..."
                      rows={2}
                    />
                    <Button onClick={handleAddMaintenance} size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Record
                    </Button>
                  </div>
                )}

                {isCreating ? (
                  <div className="text-center py-12 text-slate-500">
                    <Wrench className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>Save the asset first to add maintenance records</p>
                  </div>
                ) : loadingMaintenance ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                ) : maintenanceRecords.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Wrench className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>No maintenance records yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {maintenanceRecords.map(record => (
                      <div key={record.id} className="bg-white border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {format(parseISO(record.date), 'MMM d, yyyy')}
                              </Badge>
                              {record.kilometers && (
                                <span className="text-xs text-slate-600">
                                  {record.kilometers} km
                                </span>
                              )}
                              {record.hours && (
                                <span className="text-xs text-slate-600">
                                  {record.hours} hrs
                                </span>
                              )}
                            </div>
                            {record.notes && (
                              <p className="text-sm text-slate-700">{record.notes}</p>
                            )}
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMaintenance(record.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>



            <TabsContent value="activity" className="px-6 py-4 space-y-3">
              <div className="space-y-2">
                {(!formData.activity_log || formData.activity_log.length === 0) ? (
                  <div className="text-center py-12 text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const logs = [...(formData.activity_log || [])].reverse();
                      
                      // Group logs by date and consolidate status changes
                      const consolidatedLogs = logs.reduce((acc, log, idx) => {
                        const logDate = format(parseISO(log.timestamp), 'yyyy-MM-dd');
                        
                        // Only keep the last status change per day
                        if (log.changes?.status) {
                          const existingStatusChangeIndex = acc.findIndex(l => 
                            l.changes?.status && 
                            format(parseISO(l.timestamp), 'yyyy-MM-dd') === logDate
                          );
                          
                          if (existingStatusChangeIndex !== -1) {
                            // Replace with the later one (which comes first in reversed array)
                            return acc;
                          }
                        }
                        
                        // Calculate duration if it's a status change
                        if (log.changes?.status) {
                          const nextStatusLog = logs.slice(idx + 1).find(l => l.changes?.status);
                          if (nextStatusLog) {
                            const duration = differenceInDays(
                              parseISO(log.timestamp),
                              parseISO(nextStatusLog.timestamp)
                            );
                            log.statusDuration = duration;
                          }
                        }
                        
                        acc.push(log);
                        return acc;
                      }, []);
                      
                      return consolidatedLogs.map((log, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 mt-0.5">
                              <Avatar
                                user={{ email: log.user_email, full_name: log.user_name }}
                                size="xs"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-xs text-slate-900">
                                  {log.user_name?.split(' ')[0] || 'Unknown'}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0 h-4">
                                  {log.action}
                                </Badge>
                                <span className="text-[10px] text-slate-500">
                                  {format(parseISO(log.timestamp), 'MMM d, yyyy')}
                                </span>
                              </div>
                              
                              {log.changes && Object.keys(log.changes).length > 0 && (
                                <div className="mt-1 text-[11px] space-y-0.5">
                                  {Object.entries(log.changes)
                                    .filter(([key]) => !['last_status_change_date', 'activity_log', 'status_history'].includes(key))
                                    .map(([key, change]) => (
                                      <div key={key} className="flex items-center gap-1.5">
                                        <span className="font-medium text-slate-700 min-w-[80px]">{key}:</span>
                                        <span className="text-red-600 line-through text-[10px]">
                                          {String(change.from || '-').substring(0, 30)}
                                        </span>
                                        <span className="text-slate-400">→</span>
                                        <span className="text-green-600 font-medium">
                                          {String(change.to || '-').substring(0, 30)}
                                        </span>
                                        {key === 'status' && log.statusDuration !== undefined && log.statusDuration >= 1 && (
                                          <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4 bg-indigo-50 text-indigo-700 border-indigo-200">
                                            {log.statusDuration} {log.statusDuration === 1 ? 'day' : 'days'}
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        </SheetContent>
      </Sheet>

      {showDocumentViewer && selectedDocument && (
        <DocumentViewer
          isOpen={showDocumentViewer}
          onClose={() => {
            setShowDocumentViewer(false);
            setSelectedDocument(null);
          }}
          title={selectedDocument.name}
          documents={[{
            file_url: selectedDocument.url,
            file_name: selectedDocument.name,
            upload_date: selectedDocument.upload_date,
            notes: selectedDocument.notes
          }]}
          canEdit={false}
        />
      )}

      {assetViewingType && (
        <DocumentViewer
          isOpen={!!assetViewingType}
          onClose={() => {
            setAssetViewingType(null);
            setAssetTypedViewerFiles([]);
          }}
          title={`${formData?.name || 'Asset'} - ${assetViewingType.name}`}
          documents={assetTypedViewerFiles}
          onRemove={async (fileUrl) => {
            const doc = assetDocs.find(d => d.file_urls?.includes(fileUrl));
            if (!doc) return;
            if (doc.file_urls.length > 1) {
              const idx = doc.file_urls.indexOf(fileUrl);
              const newUrls = doc.file_urls.filter(u => u !== fileUrl);
              const newNames = (doc.file_names || []).filter((_, i) => i !== idx);
              await AssetDocument.update(doc.id, { file_urls: newUrls, file_names: newNames, last_updated_date: new Date().toISOString() });
            } else {
              await AssetDocument.delete(doc.id);
            }
            const docs = await AssetDocument.filter({ owner_type: 'asset', owner_id: asset.id }, '-updated_date', 5000);
            setAssetDocs(docs || []);
            // refresh viewer list
            const t = assetViewingType;
            const files = (docs || []).filter(d => d.document_type_id === t.id).flatMap(doc => (doc.file_urls || []).map((url, idx) => ({
              document_id: doc.id,
              file_url: url,
              file_name: (doc.file_names || [])[idx] || 'document',
              upload_date: doc.upload_date,
              expiry_date: doc.expiry_date,
            })));
            setAssetTypedViewerFiles(files);
          }}
          onUpdate={async (documentId, updates) => {
            await AssetDocument.update(documentId, { ...updates, last_updated_date: new Date().toISOString() });
            const docs = await AssetDocument.filter({ owner_type: 'asset', owner_id: asset.id }, '-updated_date', 5000);
            setAssetDocs(docs || []);
            const t = assetViewingType;
            const files = (docs || []).filter(d => d.document_type_id === t.id).flatMap(doc => (doc.file_urls || []).map((url, idx) => ({
              document_id: doc.id,
              file_url: url,
              file_name: (doc.file_names || [])[idx] || 'document',
              upload_date: doc.upload_date,
              expiry_date: doc.expiry_date,
            })));
            setAssetTypedViewerFiles(files);
          }}
          canEdit={true}
        />
      )}

      {/* Edit document type dialog */}
      {/* Lazy import to avoid circular issues */}
      {showEditDocType && editingDocRow && (
        (() => {
          const types = assetDocTypes || [];
          const currentDoc = assetDocs.find(d => d.id === editingDocRow.documentId);
          const Dialog = require("../shared/DocumentTypeEditDialog.jsx").default || require("../shared/DocumentTypeEditDialog").default;
          return (
            <Dialog
              open={showEditDocType}
              title="Edit document type"
              types={types}
              currentTypeId={currentDoc?.document_type_id || null}
              onClose={() => { setShowEditDocType(false); setEditingDocRow(null); }}
              onSave={async (newTypeId) => {
                if (!editingDocRow?.documentId || !newTypeId) return;
                await AssetDocument.update(editingDocRow.documentId, { document_type_id: newTypeId, last_updated_date: new Date().toISOString() });
                const docs = await AssetDocument.filter({ owner_type: 'asset', owner_id: asset.id }, '-updated_date', 5000);
                setAssetDocs(docs || []);
                setShowEditDocType(false);
                setEditingDocRow(null);
              }}
            />
          );
        })()
      )}
    </>
  );
}