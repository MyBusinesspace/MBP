import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, Loader2, Upload, File, Eye, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ClientEquipment, AssetCategory, AssetStatus, Project, AssetCustomField } from '@/entities/all';
import { UploadFile } from '@/integrations/Core';
import { cn } from '@/lib/utils';
import ProjectCombobox from '../workorders/ProjectCombobox';
import DocumentViewer from '../../components/shared/DocumentViewer';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import Avatar from '../Avatar';

export default function EquipmentDetailsPanel({
  isOpen,
  onClose,
  equipment,
  customers = [],
  projects = [],
  onEquipmentUpdated,
  onEquipmentDeleted,
  isAdmin = false
}) {
  const [formData, setFormData] = useState(equipment || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const documentInputRef = useRef(null);
  
  // Viewer State
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Config state
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  
  // UI state for comboboxes
  // const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
  // const [openStatusCombobox, setOpenStatusCombobox] = useState(false);
  // const [openProjectCombobox, setOpenProjectCombobox] = useState(false);

  // Update formData when equipment prop changes
  useEffect(() => {
    if (equipment) {
      // Migrate legacy document_urls to attached_documents if needed
      let attachedDocs = equipment.attached_documents || [];
      if (attachedDocs.length === 0 && equipment.document_urls && equipment.document_urls.length > 0) {
        attachedDocs = equipment.document_urls.map(url => ({
          url: url,
          name: url.split('/').pop().split('?')[0] || 'Document',
          upload_date: new Date().toISOString(),
          notes: ''
        }));
      }

      setFormData({
        ...equipment,
        attached_documents: attachedDocs
      });
    }
  }, [equipment]);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [categoriesData, statusesData, customFlds, userData] = await Promise.all([
          AssetCategory.list('sort_order'),
          AssetStatus.list('sort_order'),
          AssetCustomField.list('sort_order'),
          base44.auth.me()
        ]);
        setCategories(categoriesData || []);
        setStatuses(statusesData || []);
        setCustomFieldDefinitions(customFlds || []);
        setCurrentUserData(userData);
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    if (isOpen) loadConfig();
  }, [isOpen]);

  // Calculate changes
  const hasChanges = React.useMemo(() => {
    if (!equipment || !formData) return false;
    const fields = ['name', 'brand', 'serial_number', 'plate_number', 'year_of_manufacture', 'category', 'status', 'last_status_change_date', 'project_id', 'customer_id', 'notes', 'document_urls', 'attached_documents'];
    return fields.some(field => {
      return JSON.stringify(equipment[field] || '') !== JSON.stringify(formData[field] || '');
    });
  }, [equipment, formData]);

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
  };

  const handleProjectSelect = (projectId) => {
    if (!projectId) {
      setFormData(prev => ({ ...prev, project_id: null, customer_id: null, client_name: '' }));
      return;
    }
    const project = projects.find(p => p.id === projectId);
    const customer = customers.find(c => c.id === project?.customer_id);
    setFormData(prev => ({ 
      ...prev, 
      project_id: projectId, 
      customer_id: project?.customer_id,
      client_name: customer?.name || ''
    }));
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
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      // Calculate changes
      const changes = {};
      Object.keys(formData).forEach(key => {
        if (JSON.stringify(formData[key]) !== JSON.stringify(equipment[key]) && key !== 'activity_log' && key !== 'status_history') {
          changes[key] = { from: equipment[key], to: formData[key] };
        }
      });

      const activity_log = addActivityLog('Edited', 'Equipment updated', changes);
      
      // 1. Update Equipment
      const updatedEquipment = await ClientEquipment.update(equipment.id, { ...formData, activity_log });
      
      // 2. Update Project Relation (if changed)
      if (formData.project_id && formData.project_id !== equipment.project_id) {
        const project = await Project.get(formData.project_id);
        if (project) {
          const currentIds = project.client_equipment_ids || [];
          if (!currentIds.includes(equipment.id)) {
            await Project.update(formData.project_id, {
              client_equipment_ids: [...currentIds, equipment.id]
            });
          }
        }
      }

      toast.success('Saved successfully');
      if (onEquipmentUpdated) onEquipmentUpdated(updatedEquipment);
      onClose();
      
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    
    setIsDeleting(true);
    try {
      await ClientEquipment.delete(equipment.id);
      toast.success('Deleted successfully');
      if (onEquipmentDeleted) onEquipmentDeleted(equipment.id);
      onClose();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
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
      
      // Also update legacy document_urls for backward compatibility
      const legacyUrls = updatedDocs.map(d => d.url);
      handleChange('document_urls', legacyUrls);

      toast.success('Documents uploaded (Don\'t forget to Save)');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload');
    } finally {
      setUploadingDocument(false);
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (docToRemove) => {
    const updatedDocs = (formData.attached_documents || []).filter(d => d.url !== docToRemove.url);
    handleChange('attached_documents', updatedDocs);
    
    // Update legacy urls
    const legacyUrls = updatedDocs.map(d => d.url);
    handleChange('document_urls', legacyUrls);
  };

  const handleUpdateNote = (docIndex, newNote) => {
    const updatedDocs = [...(formData.attached_documents || [])];
    if (updatedDocs[docIndex]) {
      updatedDocs[docIndex] = { ...updatedDocs[docIndex], notes: newNote };
      handleChange('attached_documents', updatedDocs);
    }
  };

  const handleUpdateName = (docIndex, newName) => {
    const updatedDocs = [...(formData.attached_documents || [])];
    if (updatedDocs[docIndex]) {
      updatedDocs[docIndex] = { ...updatedDocs[docIndex], name: newName };
      handleChange('attached_documents', updatedDocs);
    }
  };

  const openViewer = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
  };

  if (!equipment) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 flex flex-col overflow-hidden" style={{ width: '33vw', minWidth: '400px', maxWidth: '90vw' }}>
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <SheetTitle className="text-sm font-medium text-slate-500">Equipment: <span className="text-lg font-bold text-slate-900">{formData.name || 'Edit Equipment'}</span></SheetTitle>
                <SheetDescription>
                  {formData.client_name || 'No Client'}
                </SheetDescription>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !hasChanges}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">Documents ({formData.attached_documents?.length || 0})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input 
                id="name" 
                value={formData.name || ''} 
                onChange={e => handleChange('name', e.target.value)} 
                disabled={!isAdmin}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input 
                  value={formData.brand || ''} 
                  onChange={e => handleChange('brand', e.target.value)}
                  disabled={!isAdmin} 
                />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input 
                  value={formData.serial_number || ''} 
                  onChange={e => handleChange('serial_number', e.target.value)}
                  disabled={!isAdmin} 
                />
              </div>
              <div className="space-y-2">
                <Label>Plate Number</Label>
                <Input 
                  value={formData.plate_number || ''} 
                  onChange={e => handleChange('plate_number', e.target.value)}
                  disabled={!isAdmin} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(val) => handleChange('category', val)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select...">{formData.category}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Year of Manufacture (YOM)</Label>
                <Input 
                  value={formData.year_of_manufacture || ''} 
                  onChange={e => handleChange('year_of_manufacture', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g., 2020"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mast Type</Label>
                <Input 
                  value={formData.mast_type || ''} 
                  onChange={e => handleChange('mast_type', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g., MonoB, Telescopic..."
                />
              </div>

              <div className="space-y-2">
                <Label>Height</Label>
                <Input 
                  value={formData.height || ''} 
                  onChange={e => handleChange('height', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g., 1.8m, 2.5m..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <ProjectCombobox
                projects={projects}
                customers={customers}
                selectedProjectId={formData.project_id}
                onSelectProject={handleProjectSelect}
                disabled={!isAdmin}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status || ''}
                  onValueChange={(val) => handleChange('status', val)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select...">{formData.status}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(stat => (
                      <SelectItem key={stat.id} value={stat.name}>
                        {stat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status Since</Label>
                <div className="flex gap-2">
                  <Input
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

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes || ''} 
                onChange={e => handleChange('notes', e.target.value)} 
                disabled={!isAdmin}
                className="min-h-[100px]"
              />
            </div>

            {/* Custom Fields */}
            {(() => {
              const builtInFields = [
                'name', 'brand', 'brands', 'serial_number', 'sn', 'plate_number', 'plate',
                'year_of_manufacture', 'yom', 'mast_type', 'mast', 'height',
                'category', 'status', 'notes', 'project', 'customer'
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
                          value={value}
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
          </TabsContent>

          <TabsContent value="documents" className="flex-1 overflow-y-auto px-6 py-4">
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h3 className="font-medium">Attachments</h3>
                 {isAdmin && (
                   <Button size="sm" onClick={() => documentInputRef.current?.click()} disabled={uploadingDocument}>
                     {uploadingDocument ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                     Upload
                   </Button>
                 )}
                 <input type="file" multiple className="hidden" ref={documentInputRef} onChange={handleDocumentUpload} />
               </div>
               
               {(!formData.attached_documents || formData.attached_documents.length === 0) && (
                 <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                   No documents
                 </div>
               )}

               <div className="grid grid-cols-1 gap-3">
                 {formData.attached_documents?.map((doc, idx) => (
                   <div key={idx} className="flex flex-col p-3 bg-white rounded-lg border shadow-sm">
                     <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-3 overflow-hidden flex-1">
                         <div 
                           className="p-2 bg-indigo-50 rounded cursor-pointer hover:bg-indigo-100 transition-colors"
                           onClick={() => openViewer(doc)}
                         >
                           <File className="w-5 h-5 text-indigo-600" />
                         </div>
                         <div className="flex-1 min-w-0 mr-2">
                           <Input
                             value={doc.name}
                             onChange={(e) => handleUpdateName(idx, e.target.value)}
                             className="h-7 text-sm font-medium border-transparent hover:border-slate-200 focus:border-indigo-500 px-1 -ml-1 mb-0.5"
                             disabled={!isAdmin}
                           />
                           <p className="text-xs text-slate-500 px-1">
                             {doc.upload_date ? format(parseISO(doc.upload_date), 'MMM d, yyyy HH:mm') : 'Unknown Date'}
                           </p>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-1">
                         <Button size="sm" variant="ghost" onClick={() => openViewer(doc)}>
                           <Eye className="w-4 h-4 text-slate-600" />
                         </Button>
                         {isAdmin && (
                           <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveDocument(doc)}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         )}
                       </div>
                     </div>
                     
                     <div className="pl-12">
                       <Input 
                         placeholder="Add notes..." 
                         value={doc.notes || ''} 
                         onChange={(e) => handleUpdateNote(idx, e.target.value)}
                         className="h-8 text-sm bg-slate-50 border-slate-200 focus:bg-white"
                         disabled={!isAdmin}
                       />
                     </div>
                   </div>
                 ))}
               </div>
               </div>
               </TabsContent>

               <TabsContent value="history" className="flex-1 overflow-y-auto px-6 py-4">
               <div className="space-y-4">
               <div>
               <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
                 <Clock className="w-4 h-4" />
                 Status History
               </h3>
               <p className="text-xs text-slate-500">Timeline showing how long the equipment spent in each status</p>
               </div>

               {(!formData.status_history || formData.status_history.length === 0) ? (
               <div className="text-center py-12 text-slate-500">
                 <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                 <p className="text-sm">No status history yet</p>
               </div>
               ) : (
               <div className="space-y-3">
                 {[...formData.status_history].reverse().map((entry, idx) => {
                   const isCurrentStatus = !entry.end_date;
                   const duration = isCurrentStatus 
                     ? differenceInDays(new Date(), parseISO(entry.start_date))
                     : entry.duration_days;

                   return (
                     <div key={idx} className={cn(
                       "bg-white border rounded-lg p-4",
                       isCurrentStatus && "border-indigo-500 bg-indigo-50/50"
                     )}>
                       <div className="flex items-start justify-between mb-2">
                         <div className="flex items-center gap-2">
                           <Badge className={isCurrentStatus ? "bg-indigo-600" : "bg-slate-200 text-slate-700"}>
                             {entry.status}
                           </Badge>
                           {isCurrentStatus && (
                             <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                               Current
                             </Badge>
                           )}
                         </div>
                         <div className="text-right">
                           <div className="text-xs text-slate-500">
                             {format(parseISO(entry.start_date), 'MMM d, yyyy')}
                             {entry.end_date && ` - ${format(parseISO(entry.end_date), 'MMM d, yyyy')}`}
                           </div>
                           <div className="text-sm font-semibold text-indigo-600">
                             {duration} {duration === 1 ? 'day' : 'days'}
                           </div>
                         </div>
                       </div>

                       {entry.project_name && (
                         <div className="text-xs text-slate-600 mt-2">
                           <span className="font-medium">Project:</span> {entry.project_name}
                         </div>
                       )}

                       {entry.notes && (
                         <div className="text-xs text-slate-600 mt-2">
                           <span className="font-medium">Notes:</span> {entry.notes}
                         </div>
                       )}

                       {entry.user_name && (
                         <div className="text-xs text-slate-500 mt-2">
                           Changed by {entry.user_name.split(' ')[0]}
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
               )}
               </div>
               </TabsContent>

               <TabsContent value="activity" className="flex-1 overflow-y-auto px-6 py-4">
               <div className="space-y-3">
               {(!formData.activity_log || formData.activity_log.length === 0) ? (
               <div className="text-center py-12 text-slate-500">
                 <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                 <p className="text-sm">No activity yet</p>
               </div>
               ) : (
               <div className="space-y-2">
                 {[...formData.activity_log].reverse().map((log, idx) => (
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
                             {format(parseISO(log.timestamp), 'MMM d, yyyy HH:mm')}
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
                                 </div>
                               ))}
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
               )}
               </div>
               </TabsContent>
               </Tabs>

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
      </SheetContent>
    </Sheet>
  );
}