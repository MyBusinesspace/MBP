import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Upload, File, X, MapPin, Eye, Trash2, Info, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { Customer, Project, CustomerDocument, DocumentType } from '@/entities/all';
import DocumentViewer from '../shared/DocumentViewer';
import DocumentListTable from '@/components/shared/DocumentListTable';
import { cn } from '@/lib/utils';
import LocationPickerMap from '../maps/LocationPickerMap';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const categoryColorConfig = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-800' },
  red: { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-100 text-red-800' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' },
  green: { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-800' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-800' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800', badge: 'bg-pink-100 text-pink-800' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-800', badge: 'bg-teal-100 text-teal-800' }
};

export default function CustomerDetailsPanel({ customer, isOpen, onClose, onUpdate, onDelete, users = [], customerCategories = [] }) {
  const [localCustomer, setLocalCustomer] = useState(customer || {});
  const [isSaving, setIsSaving] = useState(false);
  const [maintenanceWarning, setMaintenanceWarning] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectCategories, setProjectCategories] = useState([]);
  // Customer documents by type (updated)
  const [docTypes, setDocTypes] = useState([]);
  const [customerDocs, setCustomerDocs] = useState([]);
  const [viewingType, setViewingType] = useState(null);
  const [typedViewerFiles, setTypedViewerFiles] = useState([]);

  const docTypeMap = useMemo(() => new Map((docTypes || []).map(t => [t.id, t.name])), [docTypes]);
  const customerTableRows = useMemo(() => {
    const rows = [];
    (customerDocs || []).forEach(doc => {
      const typeName = docTypeMap.get(doc.document_type_id) || '-';
      const urls = doc.file_urls || (doc.file_url ? [doc.file_url] : []);
      const names = doc.file_names || (doc.file_name ? [doc.file_name] : []);
      urls.forEach((u, idx) => rows.push({ url: u, title: names[idx] || 'document', type: typeName, date: doc.upload_date, documentId: doc.id }));
    });
    (localCustomer?.attached_documents || []).forEach(d => rows.push({ url: d.url, title: d.name, type: 'Others', date: d.upload_date }));
    return rows;
  }, [customerDocs, docTypes, localCustomer?.attached_documents]);

  const customerViewFile = (row) => {
    setSelectedDocument({ url: row.url, name: row.title, upload_date: row.date });
    setShowDocumentViewer(true);
  };

  const customerDeleteFile = async (row) => {
    if (row.documentId) {
      await handleRemoveTypedDocument(row.url);
    } else {
      const docObj = (localCustomer.attached_documents || []).find(d => d.url === row.url);
      if (docObj) handleDocumentRemove(docObj);
    }
  };

  // Count total files from typed docs + legacy attachments
  const typedFilesCount = useMemo(() => {
    return (customerDocs || []).reduce((sum, d) => sum + (d.file_urls?.length || (d.file_url ? 1 : 0)), 0);
  }, [customerDocs]);
  const legacyFilesCount = (localCustomer?.attached_documents || []).length;
  const totalDocsCount = typedFilesCount + legacyFilesCount;

  const documentInputRef = useRef(null);

  const isNewCustomer = !localCustomer?.id;

  useEffect(() => {
    if (customer) {
      let attachedDocs = customer.attached_documents || [];
      if (attachedDocs.length === 0 && customer.document_urls && customer.document_urls.length > 0) {
        attachedDocs = customer.document_urls.map((url, idx) => ({
          url: url,
          name: customer.document_titles?.[idx] || `Document ${idx + 1}`,
          upload_date: new Date().toISOString(),
          notes: ''
        }));
      }

      setLocalCustomer({
        ...customer,
        attached_documents: attachedDocs
      });
      setHasUnsavedChanges(false);
      loadRelatedProjects(customer);
      loadProjectCategories();
      loadCustomerDocs(customer.id);
    } else {
      setLocalCustomer({});
      setRelatedProjects([]);
      setProjectCategories([]);
      setHasUnsavedChanges(false);
    }
  }, [customer]);

  const loadRelatedProjects = async (currentCustomer) => {
    if (!currentCustomer?.id) {
      setRelatedProjects([]);
      return;
    }
    
    setLoadingProjects(true);
    try {
      const projects = await Project.filter({ customer_id: currentCustomer.id });
      setRelatedProjects(projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setRelatedProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadProjectCategories = async () => {
    try {
      const { ProjectCategory } = await import('@/entities/all');
      const categories = await ProjectCategory.list('sort_order');
      setProjectCategories(categories || []);
    } catch (error) {
      console.error('Failed to load project categories:', error);
      setProjectCategories([]);
    }
  };

  const loadCustomerDocs = async (customerId) => {
    if (!customerId) { setDocTypes([]); setCustomerDocs([]); return; }
    try {
      const [types, docs] = await Promise.all([
        DocumentType.list('sort_order', 2000),
        CustomerDocument.filter({ customer_id: customerId }, '-updated_date', 5000)
      ]);
      setDocTypes(types || []);
      setCustomerDocs(docs || []);
    } catch (e) {
      console.warn('Failed to load customer docs', e);
      setDocTypes([]);
      setCustomerDocs([]);
    }
  };

  const handleViewTypedDocs = (type) => {
    const docs = customerDocs.filter(d => d.document_type_id === type.id);
    const files = docs.flatMap(doc => {
      const urls = doc.file_urls || (doc.file_url ? [doc.file_url] : []);
      const names = doc.file_names || (doc.file_name ? [doc.file_name] : []);
      return urls.map((url, idx) => ({
        document_id: doc.id,
        file_url: url,
        file_name: names[idx] || `Document ${idx + 1}`,
        upload_date: doc.upload_date,
        expiry_date: doc.expiry_date,
      }));
    });
    setViewingType(type);
    setTypedViewerFiles(files);
  };

  const handleRemoveTypedDocument = async (fileUrl) => {
    try {
      const doc = customerDocs.find(d => d.file_urls?.includes(fileUrl) || d.file_url === fileUrl);
      if (!doc) return;
      if (doc.file_urls && doc.file_urls.length > 1) {
        const updatedUrls = doc.file_urls.filter(u => u !== fileUrl);
        const fileIndex = doc.file_urls.indexOf(fileUrl);
        const updatedNames = (doc.file_names || []).filter((_, idx) => idx !== fileIndex);
        await CustomerDocument.update(doc.id, {
          file_urls: updatedUrls,
          file_names: updatedNames.length > 0 ? updatedNames : null,
          last_updated_date: new Date().toISOString()
        });
      } else {
        await CustomerDocument.delete(doc.id);
      }
      await loadCustomerDocs(customer.id);
      if (viewingType) {
        handleViewTypedDocs(viewingType);
      }
      toast.success('Document removed');
    } catch (e) {
      console.error('Remove failed', e);
      toast.error('Failed to remove document');
    }
  };

  const handleUpdateTypedDocument = async (documentId, updates) => {
    try {
      await CustomerDocument.update(documentId, { ...updates, last_updated_date: new Date().toISOString() });
      await loadCustomerDocs(customer.id);
      if (viewingType) handleViewTypedDocs(viewingType);
      toast.success('Document updated');
    } catch (e) {
      console.error('Update failed', e);
      toast.error('Failed to update document');
    }
  };

  const handleUploadTypedDocs = async (typeId) => {
    if (!customer?.id) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,.doc,.docx';

    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      setIsUploadingDoc(true);
      try {
        const uploadPromises = files.map(file => base44.integrations.Core.UploadPrivateFile({ file }));
        const results = await Promise.all(uploadPromises);
        const fileUris = results.map(r => r.file_uri);
        const fileNames = files.map(f => f.name);

        const existing = customerDocs.find(d => d.document_type_id === typeId);
        // Ask for expiry date (optional)
        const expiryInput = window.prompt('Fecha de expiración (YYYY-MM-DD) - opcional:', existing?.expiry_date || '');
        const expiry_date = expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? expiryInput : undefined;

        // AI fallback if no manual expiry
        if (!expiry_date && fileUris[0]) {
          try {
            const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUris[0] });
            const ai = await base44.integrations.Core.ExtractDataFromUploadedFile({
              file_url: signed_url,
              json_schema: { type: 'object', properties: { expiry_date: { type: 'string' } } }
            });
            const out = ai?.output;
            const aiDate = (Array.isArray(out) ? out[0]?.expiry_date : out?.expiry_date) || undefined;
            if (aiDate) expiry_date = aiDate;
          } catch (e) { console.warn('AI expiry extract failed', e); }
        }

        if (existing) {
          const updatedUrls = [...(existing.file_urls || (existing.file_url ? [existing.file_url] : [])), ...fileUris];
          const updatedNames = [...(existing.file_names || (existing.file_name ? [existing.file_name] : [])), ...fileNames];
          await CustomerDocument.update(existing.id, {
            file_urls: updatedUrls,
            file_names: updatedNames,
            ...(expiry_date ? { expiry_date } : {}),
            last_updated_date: new Date().toISOString()
          });
        } else {
          await CustomerDocument.create({
            customer_id: customer.id,
            document_type_id: typeId,
            file_urls: fileUris,
            file_names: fileNames,
            ...(expiry_date ? { expiry_date } : {}),
            upload_date: new Date().toISOString(),
            last_updated_date: new Date().toISOString()
          });
        }
        await loadCustomerDocs(customer.id);
        toast.success(`${files.length} document(s) uploaded`);
      } catch (err) {
        console.error('Upload failed', err);
        toast.error('Failed to upload documents');
      } finally {
        setIsUploadingDoc(false);
      }
    };

    input.click();
  };

  // Live sync with matrix: subscribe to changes on types and docs
  useEffect(() => {
    if (!customer?.id) return;
    let unsubDocs = () => {};
    let unsubTypes = () => {};
    try {
      unsubDocs = CustomerDocument.subscribe(() => loadCustomerDocs(customer.id));
    } catch {}
    try {
      unsubTypes = DocumentType.subscribe(() => loadCustomerDocs(customer.id));
    } catch {}
    return () => { try {unsubDocs();} catch{} try {unsubTypes();} catch{} };
  }, [customer?.id]);

  const handleSaveCustomer = async () => {
    if (!localCustomer.name) {
      toast.error('Customer name is required');
      return;
    }

    setIsSaving(true);
    try {
      let updatedCustomer;
      
      // Prepare legacy arrays
      const docUrls = (localCustomer.attached_documents || []).map(d => d.url);
      const docTitles = (localCustomer.attached_documents || []).map(d => d.name);

      const customerToSave = { 
        ...localCustomer,
        document_urls: docUrls,
        document_titles: docTitles
      };
      
      if (localCustomer.id) {
        updatedCustomer = await Customer.update(localCustomer.id, customerToSave);
        toast.success('Customer saved');
      } else {
        updatedCustomer = await Customer.create(customerToSave);
        setLocalCustomer(updatedCustomer);
        toast.success('Customer created');
      }
      setHasUnsavedChanges(false);
      if (onUpdate) onUpdate(updatedCustomer);
    } catch (error) {
      console.error('Failed to save customer:', error);
      // Detect Base44 maintenance (503) and show friendly message + keep changes locally
      const msg = error?.message || '';
      const isMaintenance = /503|Service temporarily unavailable|maintenance/i.test(msg) || error?.response?.status === 503;
      if (isMaintenance) {
        setMaintenanceWarning(true);
        toast.error('Service maintenance in progress. Your changes are kept locally — try Save again in a few minutes.');
      } else {
        toast.error(`Failed to save customer: ${msg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setLocalCustomer(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    if (maintenanceWarning) setMaintenanceWarning(false);
  };

  const handleLocationSelect = async (location) => {
    if (isNewCustomer) {
      toast.error('Please name and save the customer first before setting its location.');
      return;
    }

    const updatedLocationData = {
      latitude: location.lat,
      longitude: location.lng,
      address: location.address || localCustomer.address || '',
      location_name: location.name || localCustomer.location_name || ''
    };
    
    setLocalCustomer(prev => ({ ...prev, ...updatedLocationData }));
    setHasUnsavedChanges(true);
    toast.success('Location updated - click Save to persist');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (isNewCustomer) {
        toast.error('Please create the customer first.');
        return;
    }
    if (files.length === 0) return;

    setIsUploadingDoc(true);
    try {
        const uploadPromises = files.map(file => base44.integrations.Core.UploadPrivateFile({ file }));
        const results = await Promise.all(uploadPromises);
        
        const newDocs = results.map((r, idx) => ({
            url: r.file_uri,
            name: files[idx].name,
            upload_date: new Date().toISOString(),
            notes: ''
        }));

        const currentDocs = localCustomer.attached_documents || [];
        const updatedDocs = [...currentDocs, ...newDocs];

        setLocalCustomer(prev => ({ ...prev, attached_documents: updatedDocs }));
        setHasUnsavedChanges(true);
        toast.success(`${files.length} document(s) uploaded (Click Save)`);
    } catch (error) {
        console.error('Failed to upload documents:', error);
        toast.error('Failed to upload documents');
    } finally {
        setIsUploadingDoc(false);
        if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const handleDocumentRemove = (docToRemove) => {
    const updatedDocs = (localCustomer.attached_documents || []).filter(d => d.url !== docToRemove.url);
    setLocalCustomer(prev => ({ ...prev, attached_documents: updatedDocs }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateDocName = (index, name) => {
    const updatedDocs = [...(localCustomer.attached_documents || [])];
    if (updatedDocs[index]) {
        updatedDocs[index] = { ...updatedDocs[index], name };
        setLocalCustomer(prev => ({ ...prev, attached_documents: updatedDocs }));
        setHasUnsavedChanges(true);
    }
  };

  const handleUpdateDocNote = (index, note) => {
    const updatedDocs = [...(localCustomer.attached_documents || [])];
    if (updatedDocs[index]) {
        updatedDocs[index] = { ...updatedDocs[index], notes: note };
        setLocalCustomer(prev => ({ ...prev, attached_documents: updatedDocs }));
        setHasUnsavedChanges(true);
    }
  };

  const openViewer = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && hasUnsavedChanges) {
      e.preventDefault();
      handleSaveCustomer();
    }
  };

  const handleCategoryToggle = (categoryId) => {
    const currentCategories = localCustomer.category_ids || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    handleChange('category_ids', newCategories);
  };

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="p-0 overflow-hidden" style={{ width: '50vw', minWidth: '600px', maxWidth: '90vw' }}>
          <SheetHeader className="px-6 py-4 bg-indigo-600 text-white border-b sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-medium text-indigo-100">
                Client: <span className="text-xl font-bold text-white">{isNewCustomer ? 'New Customer' : localCustomer.name || 'Customer Details'}</span>
              </SheetTitle>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-200">Unsaved changes</span>
                )}
                <Button
                  onClick={handleSaveCustomer}
                  disabled={isSaving || !hasUnsavedChanges}
                  size="sm"
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="overflow-y-auto h-[calc(100vh-73px)]">
            {maintenanceWarning && (
              <div className="mx-6 my-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                Database maintenance detected. Saving is temporarily unavailable. Please retry in a few minutes.
              </div>
            )}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none px-6 bg-white sticky top-0 z-10">
                <TabsTrigger value="details" className="gap-2">
                  <Info className="w-4 h-4" />
                  Details
                </TabsTrigger>

                <TabsTrigger value="projects" className="gap-2" disabled={isNewCustomer}>
                  <FolderKanban className="w-4 h-4" />
                  Projects ({relatedProjects.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2" disabled={isNewCustomer}>
                  <File className="w-4 h-4" />
                  Documents ({totalDocsCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="px-6 py-4 space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">Client Name</Label>
                    <Input
                      id="customerName"
                      value={localCustomer.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Categories</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customerCategories.map(cat => {
                        const isSelected = (localCustomer.category_ids || []).includes(cat.id);
                        const colorConfig = categoryColorConfig[cat.color];
                        
                        return (
                          <Badge
                            key={cat.id}
                            onClick={() => handleCategoryToggle(cat.id)}
                            className={cn(
                              "cursor-pointer transition-all",
                              colorConfig?.badge,
                              isSelected && "ring-2 ring-offset-2 ring-slate-400"
                            )}
                          >
                            {cat.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* ... Contact fields ... */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input
                        id="contactPerson"
                        value={localCustomer.contact_person || ''}
                        onChange={(e) => handleChange('contact_person', e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={localCustomer.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={localCustomer.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={localCustomer.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Site Location
                    </Label>
                    <div className="h-56 border rounded-lg overflow-hidden">
                      <LocationPickerMap
                        initialLocation={localCustomer.latitude && localCustomer.longitude ? { lat: localCustomer.latitude, lng: localCustomer.longitude } : null}
                        onLocationSelect={handleLocationSelect}
                        isInsidePanel={true}
                      />
                    </div>
                    {localCustomer.location_name && (
                      <p className="text-sm text-slate-600">📍 {localCustomer.location_name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="taxNumber">Tax Number</Label>
                      <Input
                        id="taxNumber"
                        value={localCustomer.tax_number || ''}
                        onChange={(e) => handleChange('tax_number', e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={localCustomer.license_number || ''}
                        onChange={(e) => handleChange('license_number', e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>



              <TabsContent value="projects" className="px-6 py-4 space-y-4">
                {/* ... Projects list ... */}
                {loadingProjects ? (
                  <div className="space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                  </div>
                ) : relatedProjects.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No projects associated with this client.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b-2 border-slate-200">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Project</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Created Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {relatedProjects.map(project => (
                            <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <Link 
                                  to={createPageUrl('project-details') + `?id=${project.id}`}
                                  className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                  {project.name}
                                </Link>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className="text-xs bg-gray-100 text-gray-800">
                                  {project.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-slate-600">
                                  {project.created_date ? format(parseISO(project.created_date), 'MMM d, yyyy') : '-'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="px-6 py-4 space-y-6">


                <DocumentListTable rows={customerTableRows} onView={customerViewFile} onDelete={customerDeleteFile} showHeader={false} />

                <div className="flex justify-end">
                  <Button size="sm" onClick={() => documentInputRef.current?.click()} disabled={isNewCustomer || isUploadingDoc}>
                    {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload
                  </Button>
                  <input ref={documentInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
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

      {viewingType && (
        <DocumentViewer
          isOpen={!!viewingType}
          onClose={() => {
            setViewingType(null);
            setTypedViewerFiles([]);
          }}
          title={`${localCustomer?.name || 'Client'} - ${viewingType.name}`}
          documents={typedViewerFiles}
          onRemove={handleRemoveTypedDocument}
          onUpdate={handleUpdateTypedDocument}
          canEdit={true}
        />
      )}
    </>
  );
}