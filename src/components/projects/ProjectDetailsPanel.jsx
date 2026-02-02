import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, File, Info, Upload, Loader2, ClipboardList, Plus, Building2, Trash2, Settings, Save, ChevronsUpDown, Check, Eye, Phone, User, FileText } from 'lucide-react';
import { Project, ProjectDocument, ProjectDocumentType } from '@/entities/all';
import DocumentListTable from '@/components/shared/DocumentListTable';
import { toast } from 'sonner';
import LocationPickerMap from '../maps/LocationPickerMap';
import DocumentViewer from '../shared/DocumentViewer';
import AddEquipmentPanel from './AddEquipmentPanel';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useData } from '../DataProvider';
import CategoryManagerDialog from './CategoryManagerDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  // CommandInput, // Removed as per request "quitar buscador en filter"
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const categoryColorConfig = {
  gray: { bg: 'bg-gray-500', text: 'text-white', badge: 'bg-gray-100 text-gray-800' },
  red: { bg: 'bg-red-500', text: 'text-white', badge: 'bg-red-100 text-red-800' },
  yellow: { bg: 'bg-yellow-500', text: 'text-white', badge: 'bg-yellow-100 text-yellow-800' },
  green: { bg: 'bg-green-500', text: 'text-white', badge: 'bg-green-100 text-green-800' },
  blue: { bg: 'bg-blue-500', text: 'text-white', badge: 'bg-blue-100 text-blue-800' },
  indigo: { bg: 'bg-indigo-500', text: 'text-white', badge: 'bg-indigo-100 text-indigo-800' },
  purple: { bg: 'bg-purple-500', text: 'text-white', badge: 'bg-purple-100 text-purple-800' },
  pink: { bg: 'bg-pink-500', text: 'text-white', badge: 'bg-pink-100 text-pink-800' },
  orange: { bg: 'bg-orange-500', text: 'text-white', badge: 'bg-orange-100 text-orange-800' },
  teal: { bg: 'bg-teal-500', text: 'text-white', badge: 'bg-teal-100 text-teal-800' }
};

export default function ProjectDetailsPanel({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
  onProjectDeleted,
  onOpenWorkOrder,
  customers = [],
  projectCategories = [],
  clientEquipments: allClientEquipmentsFromProps = []
}) {
  const { projects: allProjects, refreshData } = useData();

  const [activeTab, setActiveTab] = useState('details');
  const [localProject, setLocalProject] = useState(project || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null); // Changed from viewingDocument

  const [workOrders, setWorkOrders] = useState([]);
  const [loadingWOs, setLoadingWOs] = useState(false);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Typed docs state (Project)
  const [projectDocTypes, setProjectDocTypes] = useState([]);
  const [projectDocs, setProjectDocs] = useState([]);
  const [projectViewingType, setProjectViewingType] = useState(null);
  const [projectTypedViewerFiles, setProjectTypedViewerFiles] = useState([]);
  const [isUploadingTyped, setIsUploadingTyped] = useState(false);

  const projectTypeMap = React.useMemo(() => new Map((projectDocTypes || []).map(t => [t.id, t.name])), [projectDocTypes]);
  const projectTableRows = React.useMemo(() => {
    const rows = [];
    (projectDocs || []).forEach(doc => {
      const typeName = projectTypeMap.get(doc.document_type_id) || '-';
      const urls = doc.file_urls || [];
      const names = doc.file_names || [];
      urls.forEach((u, idx) => rows.push({ url: u, title: names[idx] || 'document', type: typeName, date: doc.upload_date, documentId: doc.id }));
    });
    (localProject?.attached_documents || []).forEach(d => rows.push({ url: d.url, title: d.name, type: 'Others', date: d.upload_date }));
    return rows;
  }, [projectDocs, projectDocTypes, localProject?.attached_documents]);

  const projectViewFile = (row) => {
    setSelectedDocument({ url: row.url, name: row.title, upload_date: row.date });
    setShowDocumentViewer(true);
  };

  const projectDeleteFile = async (row) => {
    try {
      if (row.documentId) {
        const doc = projectDocs.find(d => d.id === row.documentId);
        if (!doc) return;
        const idx = (doc.file_urls || []).indexOf(row.url);
        if (doc.file_urls && doc.file_urls.length > 1) {
          const newUrls = doc.file_urls.filter(u => u !== row.url);
          const newNames = (doc.file_names || []).filter((_, i) => i !== idx);
          await ProjectDocument.update(doc.id, { file_urls: newUrls, file_names: newNames, last_updated_date: new Date().toISOString() });
        } else {
          await ProjectDocument.delete(doc.id);
        }
        const docs = await ProjectDocument.filter({ project_id: localProject.id }, '-updated_date', 5000);
        setProjectDocs(docs || []);
      } else {
        // Legacy
        const docObj = (localProject.attached_documents || []).find(d => d.url === row.url);
        if (docObj) {
          handleDocumentRemove(docObj);
        }
      }
      toast.success('Document removed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove');
    }
  };
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
  const [contacts, setContacts] = useState([{ person: '', phone: '' }]);
  const [mapLinkToPaste, setMapLinkToPaste] = useState('');
  const [workOrderCategories, setWorkOrderCategories] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isRefreshingEquipments, setIsRefreshingEquipments] = useState(false);

  const documentInputRef = useRef(null); // Changed from fileInputRef

  const isNewProject = !localProject?.id;

  const projectCustomer = React.useMemo(() => {
    if (!localProject?.customer_id) return null;
    return customers.find(c => c.id === localProject.customer_id);
  }, [localProject?.customer_id, customers]);

  const customerName = projectCustomer?.name;

  const clientEquipments = React.useMemo(() => {
    console.log('🔧 [ProjectDetailsPanel] clientEquipments memo:', {
      hasCustomerId: !!localProject?.customer_id,
      customerId: localProject?.customer_id,
      projectId: localProject?.id,
      projectName: localProject?.name,
      totalEquipmentsFromProps: allClientEquipmentsFromProps?.length,
      isArray: Array.isArray(allClientEquipmentsFromProps),
      allEquipmentCustomerIds: allClientEquipmentsFromProps?.map(eq => ({ id: eq?.id, name: eq?.name, customer_id: eq?.customer_id, project_id: eq?.project_id }))
    });
    
    if (!localProject?.customer_id) return [];
    if (!allClientEquipmentsFromProps || !Array.isArray(allClientEquipmentsFromProps)) {
      console.warn('⚠️ allClientEquipmentsFromProps is not an array or is null');
      return [];
    }
    
    // Include equipments that belong to the customer OR are linked to this project
    const filtered = allClientEquipmentsFromProps.filter(eq => 
      eq && (eq.customer_id === localProject.customer_id || eq.project_id === localProject.id)
    );
    console.log('🔧 Filtered equipments for customer/project:', filtered.length, 'equipments');
    if (filtered.length === 0 && allClientEquipmentsFromProps.length > 0) {
      console.warn('⚠️ No equipments match customer_id or project_id:', localProject.customer_id, localProject.id);
      console.log('Available customer_ids in equipments:', [...new Set(allClientEquipmentsFromProps.map(eq => eq?.customer_id).filter(Boolean))]);
    }
    return filtered;
  }, [allClientEquipmentsFromProps, localProject?.customer_id, localProject?.id]);

  const linkedEquipments = React.useMemo(() => {
    console.log('🔗 [ProjectDetailsPanel] linkedEquipments memo:', {
      hasEquipmentIds: !!localProject?.client_equipment_ids,
      equipmentIdsCount: localProject?.client_equipment_ids?.length,
      equipmentIds: localProject?.client_equipment_ids,
      totalEquipmentsFromProps: allClientEquipmentsFromProps?.length
    });
    
    if (!localProject?.client_equipment_ids) return [];
    
    const linked = allClientEquipmentsFromProps.filter(eq =>
      eq && localProject.client_equipment_ids.includes(eq.id)
    );
    
    console.log('🔗 Found linked equipments:', linked.length, 'out of', localProject.client_equipment_ids.length, 'IDs');
    if (linked.length < localProject.client_equipment_ids.length) {
      console.warn('⚠️ Some equipment IDs not found in allClientEquipmentsFromProps');
      console.log('Missing IDs:', localProject.client_equipment_ids.filter(id => !linked.find(eq => eq.id === id)));
    }
    
    return linked;
  }, [allClientEquipmentsFromProps, localProject?.client_equipment_ids]);

  const existingCustomerProjects = React.useMemo(() => {
    if (!localProject?.customer_id || !allProjects) return [];
    return allProjects.filter(p =>
      p.customer_id === localProject.customer_id &&
      p.status !== 'archived' &&
      p.id !== localProject?.id
    ).sort((a, b) => {
      const statusOrder = { active: 0, on_hold: 1, closed: 2 }; // 'closed' is still here for sorting existing ones, but won't be creatable.
      return (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
    });
  }, [localProject?.customer_id, localProject?.id, allProjects]);


  useEffect(() => {
    if (project) {
      // Migration logic for documents:
      // If attached_documents is empty but legacy document arrays exist,
      // populate attached_documents from legacy arrays.
      let attachedDocs = project.attached_documents || [];
      if (attachedDocs.length === 0 && project.document_urls && project.document_urls.length > 0) {
        attachedDocs = project.document_urls.map((url, idx) => ({
          url: url,
          name: project.document_titles?.[idx] || `Document ${idx + 1}`,
          upload_date: project.document_upload_dates?.[idx] || new Date().toISOString(),
          notes: ''
        }));
      }

      setLocalProject({
        ...project,
        attached_documents: attachedDocs
      });
      setHasUnsavedChanges(false);

      const contactPersons = project.contact_persons || [project.contact_person || ''];
      const phones = project.phones || [project.phone || ''];
      const maxLength = Math.max(contactPersons.length, phones.length);
      const loadedContacts = [];
      for (let i = 0; i < maxLength; i++) {
        loadedContacts.push({
          person: contactPersons[i] || '',
          phone: phones[i] || ''
        });
      }
      setContacts(loadedContacts.length > 0 ? loadedContacts : [{ person: '', phone: '' }]);

      loadWorkOrders(project);

      // Load typed docs for this project
      if (project.id) {
        Promise.all([
          ProjectDocumentType.list('sort_order', 2000),
          ProjectDocument.filter({ project_id: project.id }, '-updated_date', 5000)
        ]).then(([types, docs]) => {
          setProjectDocTypes(types || []);
          setProjectDocs(docs || []);
        }).catch(() => {
          setProjectDocTypes([]);
          setProjectDocs([]);
        });
      }
    } else {
      setLocalProject({});
      setWorkOrders([]);
      setHasUnsavedChanges(false);
      setContacts([{ person: '', phone: '' }]);
    }
  }, [project, customers, allClientEquipmentsFromProps]);

  const loadWorkOrders = async (currentProject) => {
    if (!currentProject?.id) {
      setWorkOrders([]);
      setWorkOrderCategories([]);
      return;
    }

    setLoadingWOs(true);
    try {
      const [TimeEntryEntity, WorkOrderCategoryEntity] = await Promise.all([
        import('@/entities/all').then(m => m.TimeEntry),
        import('@/entities/all').then(m => m.WorkOrderCategory)
      ]);

      const [allWOs, categories] = await Promise.all([
        TimeEntryEntity.filter({ project_id: currentProject.id }),
        WorkOrderCategoryEntity.list('sort_order')
      ]);

      setWorkOrderCategories(categories || []);

      const sortedWOs = (allWOs || [])
        .filter(wo => !wo.archived && wo.status !== 'closed')
        .sort((a, b) => {
          if (!a.created_date) return 1;
          if (!b.created_date) return -1;
          return new Date(b.created_date) - new Date(a.created_date);
        });
      setWorkOrders(sortedWOs);
    } catch (error) {
      console.error('Failed to load work orders:', error);
      setWorkOrders([]);
      setWorkOrderCategories([]);
      toast.error('Failed to load work orders');
    } finally {
      setLoadingWOs(false);
    }
  };

  const handleSaveProject = async () => {
    if (!localProject.name && !localProject.id) {
      toast.error('Project name is required');
      return;
    }

    if (!localProject.customer_id) {
      toast.error('Client is required');
      return;
    }

    setIsSaving(true);
    try {
      const validContacts = contacts.filter(c => c.person || c.phone);
      const contact_persons = validContacts.map(c => c.person);
      const phones = validContacts.map(c => c.phone);

      // Normalizar el status antes de guardar
      let normalizedStatus = localProject.status || 'active';
      if (normalizedStatus === 'ongoing') {
        normalizedStatus = 'active';
      }

      // Prepare legacy document arrays for backward compatibility
      const docUrls = (localProject.attached_documents || []).map(d => d.url);
      const docTitles = (localProject.attached_documents || []).map(d => d.name);
      const docDates = (localProject.attached_documents || []).map(d => d.upload_date);

      const dataToSave = {
        ...localProject,
        contact_persons,
        phones,
        contact_person: contact_persons[0] || '',
        phone: phones[0] || '',
        status: normalizedStatus,
        document_urls: docUrls, // Legacy field for backward compatibility
        document_titles: docTitles, // Legacy field for backward compatibility
        document_upload_dates: docDates // Legacy field for backward compatibility
      };

      let updatedProject;
      if (localProject.id) {
        updatedProject = await Project.update(localProject.id, dataToSave);
        toast.success('Project saved successfully');
      } else {
        updatedProject = await Project.create(dataToSave);
        toast.success('Project created successfully');
      }

      // Actualizar el estado local con el proyecto guardado
      // Re-apply migration logic to updated project in case backend only returns legacy fields
      const updatedAttachedDocs = updatedProject.attached_documents || [];
      if (updatedAttachedDocs.length === 0 && updatedProject.document_urls && updatedProject.document_urls.length > 0) {
        updatedProject.attached_documents = updatedProject.document_urls.map((url, idx) => ({
          url: url,
          name: updatedProject.document_titles?.[idx] || `Document ${idx + 1}`,
          upload_date: updatedProject.document_upload_dates?.[idx] || new Date().toISOString(),
          notes: ''
        }));
      }

      setLocalProject(updatedProject);
      setHasUnsavedChanges(false);

      if (onProjectUpdated) {
        onProjectUpdated(updatedProject);
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error(`Failed to save project: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setLocalProject(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveProject();
    }
  };

  const handleCopyMapLink = () => {
    if (localProject.google_maps_link) {
      navigator.clipboard.writeText(localProject.google_maps_link);
      toast.success('Map link copied to clipboard');
      setMapLinkToPaste(localProject.google_maps_link);
    } else {
      toast.info('No map link to copy');
    }
  };

  const handlePasteMapLink = async () => {
    if (!mapLinkToPaste) {
      toast.info('Please copy a map link from Details tab first');
      return;
    }

    try {
      let lat = null;
      let lng = null;
      let resolvedUrl = mapLinkToPaste;

      let coordsMatch = mapLinkToPaste.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

      if (coordsMatch) {
        lat = parseFloat(coordsMatch[1]);
        lng = parseFloat(coordsMatch[2]);
      } else if (mapLinkToPaste.includes('maps.app.goo.gl') || mapLinkToPaste.includes('goo.gl')) {
        try {
          const response = await base44.functions.invoke('resolveShortUrl', {
            short_url: mapLinkToPaste
          });

          if (response.data?.coordinates) {
            lat = response.data.coordinates.lat;
            lng = response.data.coordinates.lng;
            resolvedUrl = response.data.long_url || mapLinkToPaste;
          } else if (response.data?.long_url) {
            resolvedUrl = response.data.long_url;
            coordsMatch = resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordsMatch) {
              lat = parseFloat(coordsMatch[1]);
              lng = parseFloat(coordsMatch[2]);
            }
          }
        } catch (resolveError) {
          console.warn('Failed to resolve short URL:', resolveError);
          toast.warning('Could not resolve short URL. Please try pasting the full Google Maps URL instead.');
          return;
        }
      }

      if (!lat || !lng) {
        const latMatch = resolvedUrl.match(/!3d(-?\d+\.\d+)/);
        const lngMatch = resolvedUrl.match(/!4d(-?\d+\.\d+)/);
        if (latMatch && lngMatch) {
          lat = parseFloat(latMatch[1]);
          lng = parseFloat(lngMatch[1]);
        }
      }

      if (!lat || !lng) {
        const llMatch = resolvedUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (llMatch) {
          lat = parseFloat(llMatch[1]);
          lng = parseFloat(llMatch[2]);
        }
      }

      if (lat && lng) {
        setLocalProject(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          google_maps_link: mapLinkToPaste
        }));
        setHasUnsavedChanges(true);
        toast.success('Location loaded from map link - click Save to persist');
      } else {
        toast.error('Could not extract coordinates from the map link. Please try copying the URL from your browser after opening the location in Google Maps.');
      }
    } catch (error) {
      console.error('Failed to parse map link:', error);
      toast.error('Failed to load location from map link');
    }
  };

  const handleLocationSelect = async (location) => {
    if (isNewProject) {
      toast.error('Please name and save the project first before setting its location.');
      return;
    }

    const updatedLocationData = {
      latitude: location.lat,
      longitude: location.lng,
      address: location.address || localProject.address,
      location_name: location.name || localProject.location_name
    };

    setLocalProject(prev => ({ ...prev, ...updatedLocationData }));
    setHasUnsavedChanges(true);
    toast.success('Location updated - click Save to persist');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (isNewProject || !localProject.id) {
        toast.error('Please create the project first before uploading documents.');
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

        const currentDocs = localProject.attached_documents || [];
        const updatedDocs = [...currentDocs, ...newDocs];

        setLocalProject(prev => ({ ...prev, attached_documents: updatedDocs }));
        setHasUnsavedChanges(true);

        toast.success(`${files.length} document(s) uploaded (Click Save)`);
    } catch (error) {
        console.error('Failed to upload documents:', error);
        toast.error('Failed to upload documents');
    } finally {
        setIsUploadingDoc(false);
        if (documentInputRef.current) documentInputRef.current.value = ''; // Clear input for next upload
    }
  };

  const handleDocumentRemove = (docToRemove) => {
    if (isNewProject || !localProject.id) return;
    const updatedDocs = (localProject.attached_documents || []).filter(d => d.url !== docToRemove.url);
    setLocalProject(prev => ({ ...prev, attached_documents: updatedDocs }));
    setHasUnsavedChanges(true);
    toast.success('Document removed (Click Save)');
    if (selectedDocument && selectedDocument.url === docToRemove.url) {
      setShowDocumentViewer(false);
      setSelectedDocument(null);
    }
  };

  const handleUpdateDocName = (index, name) => {
    const updatedDocs = [...(localProject.attached_documents || [])];
    if (updatedDocs[index]) {
        updatedDocs[index] = { ...updatedDocs[index], name };
        setLocalProject(prev => ({ ...prev, attached_documents: updatedDocs }));
        setHasUnsavedChanges(true);
    }
  };

  const handleUpdateDocNote = (index, note) => {
    const updatedDocs = [...(localProject.attached_documents || [])];
    if (updatedDocs[index]) {
        updatedDocs[index] = { ...updatedDocs[index], notes: note };
        setLocalProject(prev => ({ ...prev, attached_documents: updatedDocs }));
        setHasUnsavedChanges(true);
    }
  };

  const openViewer = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
  };

  const handleCategoryToggle = (categoryId) => {
    const currentCategories = localProject.category_ids || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];

    handleChange('category_ids', newCategories);
  };

  const toggleEquipment = (equipmentId) => {
    if (isNewProject || !localProject.id) {
      toast.error('Please create the project first before linking equipment.');
      return;
    }

    const currentEquipmentIds = localProject.client_equipment_ids || [];
    const newEquipmentIds = currentEquipmentIds.includes(equipmentId)
      ? currentEquipmentIds.filter(id => id !== equipmentId)
      : [...currentEquipmentIds, equipmentId];

    handleChange('client_equipment_ids', newEquipmentIds);
  };

  const handleAddWorkOrder = () => {
    if (isNewProject || !localProject.id) {
      toast.error('Please create the project first before adding work orders.');
      return;
    }
    if (onOpenWorkOrder) {
      onOpenWorkOrder(localProject.id, null, 'ongoing');
    } else {
      window.location.href = `/work-orders?project_id=${localProject.id}&action=create&status=ongoing`;
    }
  };

  const handleWorkOrderClick = (wo) => {
    if (onOpenWorkOrder) {
      onOpenWorkOrder(localProject.id, wo.id);
    }
  };

  const addContact = () => {
    setContacts([...contacts, { person: '', phone: '' }]);
    setHasUnsavedChanges(true);
  };

  const removeContact = (index) => {
    if (contacts.length === 1) {
      toast.info('At least one contact field is required');
      return;
    }
    const newContacts = contacts.filter((_, i) => i !== index);
    setContacts(newContacts);
    setHasUnsavedChanges(true);
  };

  const updateContact = (index, field, value) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
    setHasUnsavedChanges(true);
  };

  const handleDeleteProject = async () => {
    if (!localProject.id) return;
    
    const confirmMessage = `Are you sure you want to delete the project "${localProject.name}"?\n\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      try {
        await Project.delete(localProject.id);
        toast.success('Project deleted successfully');
        if (onProjectDeleted) {
          onProjectDeleted(localProject.id);
        }
        onClose();
      } catch (error) {
        console.error('Failed to delete project:', error);
        toast.error('Failed to delete project');
      }
    }
  };

  const hasMissingEquipments = React.useMemo(() => {
    const hasEquipmentIds = localProject?.client_equipment_ids?.length > 0;
    const linkedCount = linkedEquipments.length;
    const expectedCount = localProject?.client_equipment_ids?.length || 0;
    return hasEquipmentIds && linkedCount < expectedCount;
  }, [localProject?.client_equipment_ids, linkedEquipments]);

  const handleRefreshEquipments = async () => {
    setIsRefreshingEquipments(true);
    try {
      await refreshData(['clientEquipments']);
      toast.success('Equipment data refreshed');
    } catch (error) {
      console.error('Failed to refresh equipments:', error);
      toast.error('Failed to refresh equipment data');
    } finally {
      setIsRefreshingEquipments(false);
    }
  };

  const handleNewEquipmentCreated = async (newEquipmentId) => {
    if (!newEquipmentId) return;
    
    try {
      // Refresh equipment data to show the new equipment in the list
      await refreshData(['clientEquipments']);
      
      toast.success('Equipment created - select it and click Save to link');
      setShowAddEquipment(false);
    } catch (error) {
      console.error('Failed to refresh equipments:', error);
      toast.error('Equipment created but failed to refresh list');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="p-0 overflow-hidden" style={{ width: '50vw', minWidth: '600px', maxWidth: '90vw' }} hideCloseButton>
          <div className="sticky top-0 z-10 p-4 shadow-lg border-b bg-indigo-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1">
                  <h2 className="text-sm font-medium text-indigo-100">Project: <span className="text-lg font-bold text-white">{localProject.name || 'New Project'}</span></h2>
                  <p className="text-xs text-indigo-100">{customers.find(c => c.id === localProject.customer_id)?.name || 'No customer assigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-200">Unsaved changes</span>
                )}
                <Button
                  onClick={handleSaveProject}
                  disabled={isSaving || !hasUnsavedChanges}
                  size="sm"
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto h-[calc(100vh-100px)]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none px-6 bg-white sticky top-0 z-10">
                <TabsTrigger value="details" className="gap-2">
                  <Info className="w-4 h-4" />
                  Details
                </TabsTrigger>
                
                <TabsTrigger value="equipment" className="gap-2" disabled={isNewProject}>
                  <Building2 className="w-4 h-4" />
                  Equipment ({linkedEquipments.length})
                </TabsTrigger>
                <TabsTrigger value="work-orders" className="gap-2" disabled={isNewProject}>
                  <ClipboardList className="w-4 h-4" />
                  Work Orders ({workOrders.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2" disabled={isNewProject}>
                  <FileText className="w-4 h-4" />
                  Documents ({localProject.attached_documents?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="px-6 py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={localProject.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Project name"
                    autoFocus={isNewProject}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectStatus">Project Status</Label>
                  <Select
                    value={localProject.status || 'active'}
                    onValueChange={(value) => {
                      handleChange('status', value);
                    }}
                  >
                    <SelectTrigger id="projectStatus">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="on_hold">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          On Hold
                        </div>
                      </SelectItem>
                      <SelectItem value="archived">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                          Archived
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {localProject.status === 'ongoing' && (
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Legacy status "ongoing" detected - will be converted to "Active" when saved
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientSelect">Client</Label>
                  <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCustomerCombobox}
                        className="w-full justify-between"
                        id="clientSelect"
                      >
                        {localProject.customer_id
                          ? customers.find((customer) => customer.id === localProject.customer_id)?.name
                          : "Select client"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandList>
                          <CommandEmpty>No client found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                  handleChange('customer_id', null);
                                  setOpenCustomerCombobox(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", !localProject.customer_id ? "opacity-100" : "opacity-0")} />
                                No Client
                            </CommandItem>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={(currentValue) => {
                                  handleChange('customer_id', customer.id);
                                  setOpenCustomerCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    localProject.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {customer.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {localProject.customer_id && existingCustomerProjects.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-blue-900 mb-2">
                            Existing projects for {customerName}:
                          </p>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {existingCustomerProjects.map(p => (
                              <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-white rounded px-2 py-1.5 border border-blue-100">
                                <span className="font-medium text-blue-900 flex-1 truncate">{p.name}</span>
                                {p.status === 'active' && <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>}
                                {p.status === 'on_hold' && <Badge className="bg-yellow-100 text-yellow-800 text-xs">On Hold</Badge>}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-blue-700 mt-2">
                            ℹ️ Please verify you're not creating a duplicate project
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Categories</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCategoryManager(true)}
                      className="h-7"
                      disabled={isNewProject}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Manage Categories
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {projectCategories.map(cat => {
                      const isSelected = (localProject.category_ids || []).includes(cat.id);
                      const colorConfig = categoryColorConfig[cat.color] || categoryColorConfig.gray;
                      return (
                        <Badge
                          key={cat.id}
                          className={`cursor-pointer ${
                            isSelected
                              ? colorConfig.badge
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          onClick={() => handleCategoryToggle(cat.id)}
                        >
                          {cat.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Contact Persons & Phones</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addContact}
                      className="h-7"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {contacts.map((contact, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            value={contact.person}
                            onChange={(e) => updateContact(index, 'person', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Contact person"
                            className="pl-9"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            value={contact.phone}
                            onChange={(e) => updateContact(index, 'phone', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Phone number"
                            className="pl-9"
                          />
                        </div>
                      </div>
                      {contacts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeContact(index)}
                          className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locationNameInput">
                    Site Location Name
                    <span className="text-xs text-slate-500 ml-2">(e.g. "North Area Dubai", "Main Office")</span>
                  </Label>
                  <Input
                    id="locationNameInput"
                    value={localProject.location_name || ''}
                    onChange={(e) => handleChange('location_name', e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Descriptive location name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="googleMapsLink">Google Maps Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="googleMapsLink"
                      value={localProject.google_maps_link || ''}
                      onChange={(e) => handleChange('google_maps_link', e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="https://maps.app.goo.gl/..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyMapLink}
                      disabled={!localProject.google_maps_link}
                      title="Copy map link"
                    >
                      <File className="w-4 h-4" />
                    </Button>
                  </div>
                  {mapLinkToPaste && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-blue-800">Map link copied from Details</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePasteMapLink}
                        className="h-7"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Paste Location
                      </Button>
                    </div>
                  )}
                  <div className="h-56 rounded-lg border overflow-hidden">
                    <LocationPickerMap
                      onLocationSelect={handleLocationSelect}
                      initialLocation={
                        localProject.latitude && localProject.longitude
                          ? { lat: localProject.latitude, lng: localProject.longitude }
                          : null
                      }
                      isInsidePanel={true}
                      disabled={isNewProject}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectNotes">Notes</Label>
                  <Textarea
                    id="projectNotes"
                    value={localProject.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Add project notes, special instructions, or observations..."
                    className="min-h-[100px]"
                  />
                </div>

                {!isNewProject && (
                  <div className="pt-6 border-t mt-8">
                    <Button
                      variant="destructive"
                      className="w-full gap-2 bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                      onClick={handleDeleteProject}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Project
                    </Button>
                    <p className="text-xs text-center text-gray-400 mt-2">
                      Permanently delete this project and all its data
                    </p>
                  </div>
                )}
              </TabsContent>



              <TabsContent value="equipment" className="px-6 py-4 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-normal text-slate-500">Select Equipment</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddEquipment(true)}
                      disabled={!localProject.customer_id}
                      className="h-7 text-xs font-normal"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add New
                    </Button>
                  </div>
                  
                  {!localProject.customer_id ? (
                    <div className="text-center py-8 border rounded-md bg-slate-50 text-slate-500 text-xs">
                      Select a customer first to add equipment
                    </div>
                  ) : clientEquipments.length === 0 ? (
                    <div className="text-center py-8 border rounded-md bg-slate-50 text-slate-500 text-xs">
                      No equipment available for this customer
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b sticky top-0 z-10">
                          <tr>
                            <th className="w-10 px-3 py-2 text-center"></th>
                            <th className="px-3 py-2 font-normal text-slate-500">Name</th>
                            <th className="px-3 py-2 font-normal text-slate-500">Brand</th>
                            <th className="px-3 py-2 font-normal text-slate-500">S/N</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {clientEquipments.map(equipment => {
                            const isSelected = (localProject.client_equipment_ids || []).includes(equipment.id);
                            return (
                              <tr 
                                key={equipment.id} 
                                onClick={() => toggleEquipment(equipment.id)}
                                className={cn("cursor-pointer transition-colors", isSelected ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-slate-50")}
                              >
                                <td className="px-3 py-2 text-center">
                                  <Checkbox 
                                    checked={isSelected} 
                                    onCheckedChange={() => toggleEquipment(equipment.id)} 
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-3 py-2 text-slate-700">{equipment.name}</td>
                                <td className="px-3 py-2 text-slate-600">{equipment.brand || '-'}</td>
                                <td className="px-3 py-2 text-slate-600">{equipment.serial_number || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="work-orders" className="px-6 py-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-normal text-slate-500">Active Work Orders</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddWorkOrder}
                    className="h-7 text-xs font-normal"
                    disabled={isNewProject}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Work Order
                  </Button>
                </div>

                {loadingWOs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : workOrders.length === 0 ? (
                  <div className="text-center py-12 border rounded-md bg-slate-50 text-slate-500 text-xs">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No work orders found</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-3 py-2 font-normal text-slate-500">WO #</th>
                          <th className="px-3 py-2 font-normal text-slate-500">Title</th>
                          <th className="px-3 py-2 font-normal text-slate-500">Status</th>
                          <th className="px-3 py-2 font-normal text-slate-500">Category</th>
                          <th className="px-3 py-2 font-normal text-slate-500 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {workOrders.map((wo) => {
                          const woCategory = workOrderCategories.find(c => c.id === wo.work_order_category_id);

                          return (
                            <tr
                              key={wo.id}
                              onClick={() => handleWorkOrderClick(wo)}
                              className="hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-2 text-slate-700 font-mono">
                                #{wo.work_order_number || wo.id?.slice(0, 6)}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {wo.title || 'Untitled'}
                              </td>
                              <td className="px-3 py-2 text-slate-600 capitalize">
                                {wo.status}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {woCategory?.name || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-600 text-right">
                                {wo.created_date ? format(parseISO(wo.created_date), 'MMM d, yyyy') : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="px-6 py-4 space-y-4">
                <DocumentListTable rows={projectTableRows} onView={projectViewFile} onDelete={projectDeleteFile} showHeader={false} />

                <div className="flex items-center justify-between">
                  {/* Other attachments removed */}
                  <Button
                    size="sm"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={isNewProject || isUploadingDoc}
                  >
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
          documents={[{ // DocumentViewer expects an array of documents
            file_url: selectedDocument.url,
            file_name: selectedDocument.name,
            upload_date: selectedDocument.upload_date,
            notes: selectedDocument.notes,
            document_id: selectedDocument.url // For consistency if DocumentViewer uses it
          }]}
          canEdit={false} // Editing is now done in the ProjectDetailsPanel directly
          isUploading={false} // DocumentViewer no longer handles uploads
          departmentName={`${projectCustomer?.name || 'No Client'}`}
        />
      )}

      {projectViewingType && (
        <DocumentViewer
          isOpen={!!projectViewingType}
          onClose={() => { setProjectViewingType(null); setProjectTypedViewerFiles([]); }}
          title={`${localProject?.name || 'Project'} - ${projectViewingType.name}`}
          documents={projectTypedViewerFiles}
          onRemove={async (fileUrl) => {
            const doc = projectDocs.find(d => d.file_urls?.includes(fileUrl));
            if (!doc) return;
            if (doc.file_urls.length > 1) {
              const idx = doc.file_urls.indexOf(fileUrl);
              const newUrls = doc.file_urls.filter(u => u !== fileUrl);
              const newNames = (doc.file_names || []).filter((_, i) => i !== idx);
              await ProjectDocument.update(doc.id, { file_urls: newUrls, file_names: newNames, last_updated_date: new Date().toISOString() });
            } else {
              await ProjectDocument.delete(doc.id);
            }
            const docs = await ProjectDocument.filter({ project_id: localProject.id }, '-updated_date', 5000);
            setProjectDocs(docs || []);
            // refresh viewer list
            const t = projectViewingType;
            const files = (docs || []).filter(d => d.document_type_id === t.id).flatMap(doc => (doc.file_urls || []).map((url, idx) => ({
              document_id: doc.id,
              file_url: url,
              file_name: (doc.file_names || [])[idx] || 'document',
              upload_date: doc.upload_date,
              expiry_date: doc.expiry_date,
            })));
            setProjectTypedViewerFiles(files);
          }}
          onUpdate={async (documentId, updates) => {
            await ProjectDocument.update(documentId, { ...updates, last_updated_date: new Date().toISOString() });
            const docs = await ProjectDocument.filter({ project_id: localProject.id }, '-updated_date', 5000);
            setProjectDocs(docs || []);
            const t = projectViewingType;
            const files = (docs || []).filter(d => d.document_type_id === t.id).flatMap(doc => (doc.file_urls || []).map((url, idx) => ({
              document_id: doc.id,
              file_url: url,
              file_name: (doc.file_names || [])[idx] || 'document',
              upload_date: doc.upload_date,
              expiry_date: doc.expiry_date,
            })));
            setProjectTypedViewerFiles(files);
          }}
          canEdit={true}
        />
      )}

      <CategoryManagerDialog
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        initialCategories={projectCategories}
        onCategoriesUpdated={() => { /* Handle reload if needed */ }}
      />

      <AddEquipmentPanel
        isOpen={showAddEquipment}
        onClose={() => setShowAddEquipment(false)}
        customerId={localProject.customer_id}
        projectId={localProject.id}
        onSuccess={handleNewEquipmentCreated}
      />
    </>
  );
}