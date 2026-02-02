import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EmployeeDocument, EmployeeDocumentType, DocumentType } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, Loader2, Search, Settings, AlertCircle, Eye, EyeOff, ArrowUpDown, Ban, CheckCircle2, MoreHorizontal, Wrench } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import DocumentViewer from '../shared/DocumentViewer';
import EmployeeDocumentTypeManager from './EmployeeDocumentTypeManager';
import Avatar from '../Avatar';
import { format, parseISO, differenceInDays } from 'date-fns';
import { UploadPrivateFile } from '@/integrations/Core';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '../skeletons/PageSkeleton';
import { repairEmployeeDocumentTypes } from "@/functions/repairEmployeeDocumentTypes";

const normalizeName = (s) => (s || '').toString().trim().toLowerCase();

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { color: null, text: 'No expiry date' };
  
  const today = new Date();
  const expiry = parseISO(expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, today);
  
  if (daysUntilExpiry < 0) return { color: 'red', text: 'Expired' };
  if (daysUntilExpiry <= 30) return { color: 'red', text: `Expires in ${daysUntilExpiry} days` };
  if (daysUntilExpiry <= 60) return { color: 'orange', text: `Expires in ${daysUntilExpiry} days` };
  return { color: 'green', text: 'Valid' };
};

export default function DocumentMatrixTab({ users = [], currentUser, isAdmin }) {
  // Local states
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [clientDocTypes, setClientDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDocs, setViewingDocs] = useState(null);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [hiddenUsers, setHiddenUsers] = useState(new Set());
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [exporting, setExporting] = useState(false);
  
  // Merge duplicate document types by name (UI-level), keeping a primary id
  const typeGroups = useMemo(() => {
    const map = new Map();
    (documentTypes || []).forEach((t) => {
      const key = (t?.name || '').trim().toLowerCase();
      if (!key) return;
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    });
    return map;
  }, [documentTypes]);
  
  const mergedDocumentTypes = useMemo(() => {
    const arr = [];
    typeGroups.forEach((list) => {
      const sorted = [...list].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || String(a.name || '').localeCompare(String(b.name || '')));
      const primary = sorted[0];
      arr.push({ ...primary, _groupIds: sorted.map((x) => x.id) });
    });
    return arr.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || String(a.name || '').localeCompare(String(b.name || '')));
  }, [typeGroups]);
  const legacyType = useMemo(() => {
    const known = new Set((documentTypes || []).map(t => t.id));
    const orphanIds = Array.from(new Set((documents || []).map(d => d.document_type_id).filter(id => id && !known.has(id))));
    return orphanIds.length > 0 ? { id: 'legacy', name: 'Legacy', _groupIds: orphanIds, sort_order: 99999 } : null;
  }, [documentTypes, documents]);

  const displayedDocumentTypes = useMemo(() => {
    return legacyType ? [...mergedDocumentTypes, legacyType] : mergedDocumentTypes;
  }, [mergedDocumentTypes, legacyType]);

  const knownEmployeeTypeIds = useMemo(() => new Set((documentTypes || []).map(t => t.id)), [documentTypes]);
  const orphanDocTypeIds = useMemo(() => new Set((documents || []).map(d => d.document_type_id).filter(id => id && !knownEmployeeTypeIds.has(id))), [documents, knownEmployeeTypeIds]);
  const clientDocTypeNameById = useMemo(() => {
    const m = new Map();
    (clientDocTypes || []).forEach(t => m.set(t.id, normalizeName(t.name)));
    return m;
  }, [clientDocTypes]);
  const employeeTypeByName = useMemo(() => {
    const m = new Map();
    mergedDocumentTypes.forEach(dt => m.set(normalizeName(dt.name), dt));
    return m;
  }, [mergedDocumentTypes]);

  const findDocForType = (userDocs, docType) => {
    const direct = userDocs.find(d => docType._groupIds.includes(d.document_type_id));
    if (direct) return direct;
    const targetName = normalizeName(docType.name);
    const byName = userDocs.find(d => orphanDocTypeIds.has(d.document_type_id) && clientDocTypeNameById.get(d.document_type_id) === targetName);
    return byName || null;
  };

  const [repairing, setRepairing] = useState(false);
  const repairAttemptedRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsData, typesData, clientTypesData] = await Promise.all([
        EmployeeDocument.list('-updated_date', 20000),
        EmployeeDocumentType.list('sort_order', 2000),
        DocumentType.list('sort_order', 2000)
      ]);
      
      setDocuments(docsData || []);
      let types = typesData || [];
      if (!types || types.length === 0) {
        const defaultTypes = [
          { name: 'ID', sort_order: 1, is_required: true },
          { name: 'Passport', sort_order: 2, is_required: true },
          { name: 'Visa', sort_order: 3, is_required: true },
          { name: 'Safety Certificates', sort_order: 4 },
          { name: 'Driver License', sort_order: 5 },
          { name: 'Work Permit', sort_order: 6 }
        ];
        try {
          const created = await EmployeeDocumentType.bulkCreate(defaultTypes);
          types = created || defaultTypes;
          toast.success('Tipos de documentos restaurados');
        } catch (e) {
          console.error('Failed to seed types', e);
          types = defaultTypes;
        }
      }
      setDocumentTypes(types);
      setClientDocTypes(clientTypesData || []);

      // Auto-repair orphan documents pointing to missing type IDs (admin only)
      try {
        if (!repairAttemptedRef.current && isAdmin) {
          const lastRun = Number(localStorage.getItem('employeeDocsRepairLastRun') || 0);
          const hoursSince = (Date.now() - lastRun) / 36e5;
          const typeIdSet = new Set((types || []).map(t => t.id));
          const unknownIds = (docsData || []).map(d => d.document_type_id).filter(id => id && !typeIdSet.has(id));
          if (hoursSince > 6 && unknownIds.length > 0) {
            try {
              const shouldFull = unknownIds.length > 500 || (docsData?.length || 0) > 5000;
              const resp = await repairEmployeeDocumentTypes({ full: shouldFull });
              console.log('repairEmployeeDocumentTypes →', resp?.data || resp);
              const [newDocs, newTypes] = await Promise.all([
                EmployeeDocument.list('-updated_date', 20000),
                EmployeeDocumentType.list('sort_order', 2000)
              ]);
              setDocuments(newDocs || []);
              setDocumentTypes(newTypes || types);
              toast.success('Documents repaired');
              localStorage.setItem('employeeDocsRepairLastRun', String(Date.now()));
            } catch (err) {
              // Handle rate limit gracefully
              const status = err?.response?.status || err?.status;
              if (status === 429) {
                console.warn('repairEmployeeDocumentTypes rate-limited');
              } else {
                console.warn('repairEmployeeDocumentTypes failed', err);
              }
            } finally {
              repairAttemptedRef.current = true;
            }
          } else {
            repairAttemptedRef.current = true; // prevent repeated checks in this session
          }
        }
      } catch (e) {
        console.warn('Repair check failed', e);
      }
    } catch (error) {
      console.error('❌ Failed to load documents data:', error);
      toast.error('Failed to load documents data');
    } finally {
      setLoading(false);
    }
  };

  const getDynamicFullName = (user) => {
    if (!user) return 'Unknown User';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || user.full_name || user.email;
  };

  const calculateCompletionPercentage = (userId) => {
    if (displayedDocumentTypes.length === 0) return 0;
    const userDocs = documents.filter(doc => doc.employee_id === userId);
    let completed = 0;
    displayedDocumentTypes.forEach((dt) => {
      const doc = findDocForType(userDocs, dt);
      const has = !!doc && ((doc.file_urls?.length > 0) || doc.file_url || doc.is_not_applicable);
      if (has) completed += 1;
    });
    return Math.round((completed / displayedDocumentTypes.length) * 100);
  };

  const sortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      if (!user || user.is_ghost || user.archived) return false;
      const fullName = getDynamicFullName(user);
      return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (sortBy === 'employee_order') {
      filtered.sort((a, b) => {
        const orderA = a.sort_order ?? 999999;
        const orderB = b.sort_order ?? 999999;
        return orderA - orderB;
      });
    } else {
      filtered.sort((a, b) => {
        const nameA = getDynamicFullName(a).toLowerCase();
        const nameB = getDynamicFullName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    return filtered;
  }, [users, searchTerm, sortBy]);

  const filteredUsers = sortedUsers.filter(user => !hiddenUsers.has(user.id));

  const getUserDocuments = (userId) => {
    return documents.filter(doc => doc.employee_id === userId);
  };

  const toggleUserVisibility = (userId) => {
    setHiddenUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAllUsers = (checked) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleUploadDocument = async (userId, documentTypeId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,.doc,.docx';

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      setUploadingFor({ userId, typeId: documentTypeId });
      try {
        const uploadPromises = files.map(file => UploadPrivateFile({ file }));
                const uploadResults = await Promise.all(uploadPromises);
                const fileUris = uploadResults.map(result => result.file_uri);
                const fileNames = files.map(file => file.name);

                // Ask for expiry date (optional)
                const expiryInput = window.prompt('Fecha de expiración (YYYY-MM-DD) - opcional:', '');
                let expiry_date = expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? expiryInput : undefined;
                // AI fallback
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

            const existingDoc = documents.find(doc => 
              doc.employee_id === userId && doc.document_type_id === documentTypeId
            );

            if (existingDoc) {
              const updatedFileUrls = [...(existingDoc.file_urls || (existingDoc.file_url ? [existingDoc.file_url] : [])), ...fileUris];
              const updatedFileNames = [...(existingDoc.file_names || (existingDoc.file_name ? [existingDoc.file_name] : [])), ...fileNames];

              const updatedDoc = await EmployeeDocument.update(existingDoc.id, {
                file_urls: updatedFileUrls,
                file_names: updatedFileNames,
                ...(expiry_date ? { expiry_date } : {}),
                last_updated_date: new Date().toISOString()
              });
          
          setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
        } else {
          const newDoc = await EmployeeDocument.create({
            employee_id: userId,
            document_type_id: documentTypeId,
            file_urls: fileUris,
            file_names: fileNames,
            upload_date: new Date().toISOString(),
            last_updated_date: new Date().toISOString()
          });
          
          setDocuments(prev => [...prev, newDoc]);
        }

        toast.success(`${files.length} file(s) uploaded successfully`);
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error('Failed to upload files');
      } finally {
        setUploadingFor(null);
      }
    };

    input.click();
  };

  const handleViewDocuments = (user, docType) => {
    const targetName = normalizeName(docType.name);
    const docs = documents.filter(doc => 
      doc.employee_id === user.id && (
        (docType?._groupIds && docType._groupIds.includes(doc.document_type_id)) ||
        (orphanDocTypeIds.has(doc.document_type_id) && clientDocTypeNameById.get(doc.document_type_id) === targetName)
      )
    );
    
    const allFiles = docs.flatMap(doc => {
      const urls = doc.file_urls || (doc.file_url ? [doc.file_url] : []);
      const names = doc.file_names || (doc.file_name ? [doc.file_name] : []);
      return urls.map((url, idx) => ({
        document_id: doc.id,
        file_url: url,
        file_name: names[idx] || `Document ${idx + 1}`,
        upload_date: doc.upload_date,
        expiry_date: doc.expiry_date
      }));
    });

    setViewingDocs({
      user,
      type: docType,
      files: allFiles,
      documentTypeId: docType.id
    });
  };

  const handleRemoveDocument = async (fileUrl) => {
    try {
      const doc = documents.find(d =>
        d.file_urls?.includes(fileUrl) || d.file_url === fileUrl
      );

      if (!doc) return;

      if (doc.file_urls && doc.file_urls.length > 1) {
        const updatedUrls = doc.file_urls.filter(url => url !== fileUrl);
        const fileIndex = doc.file_urls.indexOf(fileUrl);
        const updatedNames = (doc.file_names || []).filter((_, idx) => idx !== fileIndex);

        await EmployeeDocument.update(doc.id, {
          file_urls: updatedUrls,
          file_names: updatedNames.length > 0 ? updatedNames : null,
          last_updated_date: new Date().toISOString()
        });
      } else {
        await EmployeeDocument.delete(doc.id);
      }

      toast.success('Document removed');
      
      const freshData = await EmployeeDocument.list('-updated_date', 20000);
      setDocuments(freshData);
      
      if (viewingDocs) {
        const updatedDocsForViewer = freshData.filter(d =>
          d.employee_id === viewingDocs.user.id && 
          d.document_type_id === viewingDocs.type.id
        );
        
        const allFiles = updatedDocsForViewer.flatMap(d => {
          const urls = d.file_urls || (d.file_url ? [d.file_url] : []);
          const names = d.file_names || (d.file_name ? [d.file_name] : []);
          return urls.map((url, idx) => ({
            document_id: d.id,
            file_url: url,
            file_name: names[idx] || `Document ${idx + 1}`,
            upload_date: d.upload_date,
            expiry_date: d.expiry_date
          }));
        });
        
        if (allFiles.length === 0) {
          setViewingDocs(null);
        } else {
          setViewingDocs(prev => ({ ...prev, files: allFiles }));
        }
      }
    } catch (error) {
      console.error('Failed to remove document:', error);
      toast.error('Failed to remove document');
    }
  };

  const handleUpdateDocument = async (documentId, updates) => {
    try {
      await EmployeeDocument.update(documentId, {
        ...updates,
        last_updated_date: new Date().toISOString()
      });
      
      toast.success('Document updated');
      
      const freshData = await EmployeeDocument.list('-updated_date', 20000);
      setDocuments(freshData);
      
      if (viewingDocs) {
        const updatedDocsForViewer = freshData.filter(d =>
          d.employee_id === viewingDocs.user.id && 
          d.document_type_id === viewingDocs.type.id
        );
        
        const allFiles = updatedDocsForViewer.flatMap(d => {
          const urls = d.file_urls || (d.file_url ? [d.file_url] : []);
          const names = d.file_names || (d.file_name ? [d.file_name] : []);
          return urls.map((url, idx) => ({
            document_id: d.id,
            file_url: url,
            file_name: names[idx] || `Document ${idx + 1}`,
            upload_date: d.upload_date,
            expiry_date: d.expiry_date
          }));
        });
        
        setViewingDocs(prev => ({ ...prev, files: allFiles }));
      }
    } catch (error) {
      console.error('Failed to update document:', error);
      toast.error('Failed to update document');
    }
  };

  const handleToggleNotApplicable = async (userId, docTypeId, currentDoc) => {
    try {
      const isNA = !currentDoc?.is_not_applicable;
      
      if (currentDoc) {
        const updatedDoc = await EmployeeDocument.update(currentDoc.id, {
          is_not_applicable: isNA,
          last_updated_date: new Date().toISOString()
        });
        
        // Update local state directly to avoid page refresh
        setDocuments(prev => prev.map(d => d.id === currentDoc.id ? updatedDoc : d));
      } else {
        const newDoc = await EmployeeDocument.create({
          employee_id: userId,
          document_type_id: docTypeId,
          is_not_applicable: isNA,
          upload_date: new Date().toISOString(),
          last_updated_date: new Date().toISOString()
        });
        
        // Add new doc to local state
        setDocuments(prev => [...prev, newDoc]);
      }
      
      toast.success(isNA ? 'Marked as N/A' : 'Unmarked as N/A');
    } catch (error) {
      console.error('Failed to toggle N/A status:', error);
      toast.error('Failed to update document status');
    }
  };

  const handleUploadMore = async () => {
    if (!viewingDocs) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,.doc,.docx';

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      try {
        const uploadPromises = files.map(file => UploadPrivateFile({ file }));
        const uploadResults = await Promise.all(uploadPromises);
        const fileUris = uploadResults.map(result => result.file_uri);
        const fileNames = files.map(file => file.name);

        const existingDoc = documents.find(doc => 
          doc.employee_id === viewingDocs.user.id && 
          doc.document_type_id === viewingDocs.type.id
        );

        if (existingDoc) {
          const currentFileUrls = existingDoc.file_urls || (existingDoc.file_url ? [existingDoc.file_url] : []);
          const currentFileNames = existingDoc.file_names || (existingDoc.file_name ? [existingDoc.file_name] : []);

          const updatedFileUrls = [...currentFileUrls, ...fileUris];
          const updatedFileNames = [...currentFileNames, ...fileNames];

          // Ask for expiry date (optional)
          const expiryInput = window.prompt('Fecha de expiración (YYYY-MM-DD) - opcional:', existingDoc.expiry_date || '');
          let expiry_date = expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? expiryInput : undefined;
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

          await EmployeeDocument.update(existingDoc.id, {
            file_urls: updatedFileUrls,
            file_names: updatedFileNames,
            ...(expiry_date ? { expiry_date } : {}),
            last_updated_date: new Date().toISOString()
          });
        } else {
          // Ask for expiry date (optional)
          const expiryInput = window.prompt('Fecha de expiración (YYYY-MM-DD) - opcional:', '');
          let expiry_date = expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? expiryInput : undefined;
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

          await EmployeeDocument.create({
            employee_id: viewingDocs.user.id,
            document_type_id: viewingDocs.type.id,
            file_urls: fileUris,
            file_names: fileNames,
            ...(expiry_date ? { expiry_date } : {}),
            upload_date: new Date().toISOString(),
            last_updated_date: new Date().toISOString()
          });
        }

        toast.success(`${files.length} file(s) uploaded`);
        
        const freshData = await EmployeeDocument.list('-updated_date', 20000);
        setDocuments(freshData);
        
        const updatedDocsForViewer = freshData.filter(d =>
          d.employee_id === viewingDocs.user.id && 
          d.document_type_id === viewingDocs.type.id
        );
        
        const allFiles = updatedDocsForViewer.flatMap(d => {
          const urls = d.file_urls || (d.file_url ? [d.file_url] : []);
          const names = d.file_names || (d.file_name ? [d.file_name] : []);
          return urls.map((url, idx) => ({
            document_id: d.id,
            file_url: url,
            file_name: names[idx] || `Document ${idx + 1}`,
            upload_date: d.upload_date,
            expiry_date: d.expiry_date
          }));
        });
        
        setViewingDocs(prev => ({ ...prev, files: allFiles }));
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error('Failed to upload files');
      }
    };

    input.click();
  };

  const handleExportUserDocs = () => {
    setExporting(true);
    try {
      const usersToExport = selectedUserIds.length > 0 
        ? filteredUsers.filter(u => selectedUserIds.includes(u.id))
        : filteredUsers;

      const headers = ['Employee', 'Email', 'Job Role'];
      displayedDocumentTypes.forEach(dt => headers.push(dt.name));

      const rows = usersToExport.map(user => {
        const row = [
          getDynamicFullName(user),
          user.email,
          user.job_role || '-'
        ];

            displayedDocumentTypes.forEach(dt => {
              const userDocs = documents.filter(d => d.employee_id === user.id);
              const doc = findDocForType(userDocs, dt);
              const fileCount = doc ? (doc.file_urls?.length || (doc.file_url ? 1 : 0)) : 0;
              const status = doc?.expiry_date ? getExpiryStatus(doc.expiry_date).text : '-';
              row.push(fileCount > 0 ? `${fileCount} files (${status})` : 'No files');
            });

        return row;
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `employee-documents_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Documents exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export documents');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search employees by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="default"
            size="sm"
            onClick={handleExportUserDocs}
            disabled={exporting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export CSV
          </Button>

          <Button
            onClick={() => setShowUserSelector(!showUserSelector)}
            variant="default"
            size="sm"
            className={cn(
              "border-0 shadow-sm",
              showUserSelector ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {showUserSelector ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            Select Users
          </Button>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="employee_order">Sort by Employee Order</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Button onClick={() => setShowTypeManager(true)} size="sm" variant="default" className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-sm">
              <Settings className="w-4 h-4 mr-2" />
              Manage Types
            </Button>
          )}

          {isAdmin && (
            <Button
              onClick={async () => {
                setRepairing(true);
                try {
                  const res = await repairEmployeeDocumentTypes({ full: true });
                  const data = res?.data || res;
                  const [newDocs, newTypes] = await Promise.all([
                    EmployeeDocument.list('-updated_date', 20000),
                    EmployeeDocumentType.list('sort_order', 2000)
                  ]);
                  setDocuments(newDocs || []);
                  setDocumentTypes(newTypes || []);
                  const msg = data?.migrated != null ? `Repaired: ${data.migrated} docs` : 'Repair completed';
                  toast.success(msg);
                } catch (err) {
                  const status = err?.response?.status || err?.status;
                  toast.error(status === 429 ? 'Repair is being rate-limited, please try again in a moment.' : 'Repair failed');
                } finally {
                  setRepairing(false);
                }
              }}
              variant="outline"
              size="sm"
              disabled={repairing}
              className="border-indigo-200 text-indigo-700"
            >
              {repairing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
              Repair Docs
            </Button>
          )}
        </div>
      </div>

      {/* User Selector */}
      {showUserSelector && (
        <div className="bg-white rounded-lg shadow border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Select users to display:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-2">
            {sortedUsers.map(user => (
              <label key={user.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={!hiddenUsers.has(user.id)}
                  onCheckedChange={() => toggleUserVisibility(user.id)}
                />
                <span className="text-sm text-slate-700 truncate">
                  {getDynamicFullName(user)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Color Code Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-2">Document Expiry Status:</p>
            <div className="flex flex-wrap gap-4 text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Valid (60+ days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Expires in 60 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Expires in 30 days or less</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-0">
                <TableHead className="px-2 py-1 text-left text-xs font-semibold text-slate-700 sticky left-0 bg-slate-50 z-20 w-[220px] h-8 border-r border-slate-200">
                  Employee
                </TableHead>
                <TableHead className="px-2 py-1 text-center text-xs font-semibold text-slate-700 w-[80px] min-w-[80px] h-8">
                  Complete
                </TableHead>
                {displayedDocumentTypes.map(type => (
                  <TableHead key={type.id} className="px-2 py-1 text-center text-xs font-semibold text-slate-700 min-w-[120px] h-8">
                    {type.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + displayedDocumentTypes.length} className="h-24 text-center text-slate-500">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, userIdx) => {
                  const userDocs = getUserDocuments(user.id);
                  const completionPercentage = calculateCompletionPercentage(user.id);
                  
                  return (
                    <TableRow 
                      key={user.id} 
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50 h-9",
                        userIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      )}
                    >
                      <TableCell className="px-2 py-1 sticky left-0 z-10 bg-inherit border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={getDynamicFullName(user)}
                            src={user.avatar_url}
                            isAdmin={user.role === 'admin'}
                            className="h-6 w-6"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-xs text-slate-900 truncate">
                              {getDynamicFullName(user)}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "text-xs font-bold",
                            completionPercentage >= 100 ? 'text-green-600' :
                            completionPercentage >= 75 ? 'text-blue-600' :
                            completionPercentage >= 50 ? 'text-orange-600' :
                            'text-red-600'
                          )}>
                            {completionPercentage}%
                          </span>
                          <div className="w-10 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all",
                                completionPercentage >= 100 ? 'bg-green-500' :
                                completionPercentage >= 75 ? 'bg-blue-500' :
                                completionPercentage >= 50 ? 'bg-orange-500' :
                                'bg-red-500'
                              )}
                              style={{ width: `${completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      {displayedDocumentTypes.map(docType => {
                        const doc = findDocForType(userDocs, docType);
                        const fileCount = doc ? (doc.file_urls?.length || (doc.file_url ? 1 : 0)) : 0;
                        const expiryStatus = doc?.expiry_date ? getExpiryStatus(doc.expiry_date) : null;
                        
                        return (
                          <TableCell key={docType.id} className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1 h-full w-full min-h-[32px] group">
                              {doc?.is_not_applicable ? (
                                <div 
                                  onClick={() => handleToggleNotApplicable(user.id, docType.id, doc)}
                                  className="h-6 px-2 text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 hover:border-red-200 cursor-pointer rounded-md inline-flex items-center justify-center border border-slate-200 transition-colors group/na"
                                  title="Click to mark as required"
                                >
                                  <span className="group-hover/na:hidden">N/A</span>
                                  <span className="hidden group-hover/na:inline flex items-center">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Required
                                  </span>
                                </div>
                              ) : fileCount > 0 ? (
                                <>
                                  {expiryStatus && (
                                    <div 
                                      className={cn(
                                        "w-2 h-2 rounded-full",
                                        expiryStatus.color === 'green' ? 'bg-green-500' :
                                        expiryStatus.color === 'orange' ? 'bg-orange-500' :
                                        'bg-red-500'
                                      )}
                                      title={expiryStatus.text}
                                    />
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDocuments(user, docType)}
                                    className="h-6 px-2 text-[10px]"
                                  >
                                    View ({fileCount})
                                  </Button>
                                  {doc?.expiry_date && (
                                    <span className="text-[10px] text-slate-500 ml-1">
                                      {format(parseISO(doc.expiry_date), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 ml-1">
                                        <MoreHorizontal className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => handleToggleNotApplicable(user.id, docType.id, doc)}>
                                        <Ban className="w-4 h-4 mr-2" />
                                        Mark as N/A
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              ) : (
                                <>
                                  <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleUploadDocument(user.id, docType.id)}
                                                                        disabled={uploadingFor?.userId === user.id && uploadingFor?.typeId === docType.id}
                                                                        className="h-6 px-2 text-[10px]"
                                  >
                                    {uploadingFor?.userId === user.id && uploadingFor?.typeId === docType.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Upload className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleNotApplicable(user.id, docType.id, doc)}
                                    className="h-6 w-6 p-0 text-slate-300 hover:text-slate-500"
                                    title="Mark as N/A"
                                  >
                                    <Ban className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <EmployeeDocumentTypeManager
        isOpen={showTypeManager}
        onClose={() => setShowTypeManager(false)}
        onSuccess={loadData}
      />

      {viewingDocs && (
        <DocumentViewer
          isOpen={!!viewingDocs}
          onClose={() => setViewingDocs(null)}
          title={`${getDynamicFullName(viewingDocs.user)} - ${viewingDocs.type.name}`}
          documents={viewingDocs.files}
          onUpload={handleUploadMore}
          onRemove={handleRemoveDocument}
          onUpdate={handleUpdateDocument}
          canEdit={isAdmin}
          departmentName={viewingDocs.user.department}
        />
      )}
    </div>
  );
}