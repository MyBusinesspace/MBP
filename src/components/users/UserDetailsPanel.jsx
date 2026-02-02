import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User as UserIcon, File, Activity, Settings, DollarSign, Receipt, Upload, Loader2, Clock } from 'lucide-react';
import { User, EmployeeDocument, EmployeeDocumentType, DocumentType, EmployeePayrollProfile, PayStub, Department, Team, LeaveRequest, Branch } from '@/entities/all';
import { UploadFile, UploadPrivateFile } from '@/integrations/Core';
import { toast } from 'sonner';
import DocumentViewer from '../shared/DocumentViewer';
import DocumentListTable from '@/components/shared/DocumentListTable';
import Avatar from '../Avatar';
import AvatarViewerDialog from './AvatarViewerDialog';
import ImageCropDialog from './ImageCropDialog';
import { format, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';

const normalizeName = (s) => (s || '').toString().trim().toLowerCase();

export default function UserDetailsPanel({ isOpen, onClose, user, onUpdate }) {
  const [localUser, setLocalUser] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [clientDocTypes, setClientDocTypes] = useState([]);

  const clientTypeNameById = useMemo(() => {
    const m = new Map();
    (clientDocTypes || []).forEach(t => m.set(t.id, normalizeName(t.name)));
    return m;
  }, [clientDocTypes]);

  const knownEmployeeTypeIds = useMemo(() => new Set((documentTypes || []).map(t => t.id)), [documentTypes]);

  const findDocsForType = (docType) => {
    const targetName = normalizeName(docType?.name);
    const direct = (employeeDocuments || []).filter(d => d.document_type_id === docType.id);
    const orphan = (employeeDocuments || []).filter(d => !knownEmployeeTypeIds.has(d.document_type_id) && clientTypeNameById.get(d.document_type_id) === targetName);
    return [...direct, ...orphan];
  };
  const [isUploading, setIsUploading] = useState(false);
  const [viewingDocs, setViewingDocs] = useState(null);

  const userTypeMap = React.useMemo(() => new Map((documentTypes || []).map(t => [t.id, t.name])), [documentTypes]);
  const userTableRows = React.useMemo(() => {
    const rows = [];
    (employeeDocuments || []).forEach(doc => {
      const typeName = userTypeMap.get(doc.document_type_id) || '-';
      const urls = doc.file_urls || (doc.file_url ? [doc.file_url] : []);
      const names = doc.file_names || (doc.file_name ? [doc.file_name] : []);
      urls.forEach((u, idx) => rows.push({ url: u, title: names[idx] || 'document', type: typeName, date: doc.upload_date, documentId: doc.id }));
    });
    return rows;
  }, [employeeDocuments, documentTypes]);

  const userViewFile = (row) => {
    setViewingDocs({ type: { name: row.type }, files: [{ file_url: row.url, file_name: row.title, upload_date: row.date, document_id: row.documentId }] });
  };

  const userDeleteFile = async (row) => {
    await handleRemoveDocument(row.url);
  };
  const [payrollProfile, setPayrollProfile] = useState(null);
  const [payStubs, setPayStubs] = useState([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);
  const [cropImageFile, setCropImageFile] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Effect to load user data based on user prop
  useEffect(() => {
    if (user) {
      setLocalUser(user);
      loadDocuments(user.id); // Pass user.id to document loader
      loadPayrollData(user.id); // Pass user.id to payroll loader
      loadLeaveRequests(user.id);
      loadDepartments();
      loadTeams();
      loadCompanies();
    } else {
      setLocalUser(null); // Clear localUser if user is null
      setDocumentTypes([]);
      setEmployeeDocuments([]);
      setPayrollProfile(null);
      setPayStubs([]);
      setLeaveRequests([]);
    }
  }, [user]); // Depend on user prop

  const loadCurrentUser = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadDocuments = async (employeeId) => {
    try {
      const [empTypes, clientTypes, docs] = await Promise.all([
        EmployeeDocumentType.list('sort_order', 2000),
        DocumentType.list('sort_order', 2000),
        EmployeeDocument.filter({ employee_id: employeeId })
      ]);
      setDocumentTypes(empTypes || []);
      setClientDocTypes(clientTypes || []);
      setEmployeeDocuments(docs || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadPayrollData = async (employeeId) => {
    setLoadingPayroll(true);
    try {
      const [profile, allStubs] = await Promise.all([
        EmployeePayrollProfile.filter({ employee_id: employeeId }).then(data => data?.[0] || null),
        PayStub.filter({ employee_id: employeeId })
      ]);
      setPayrollProfile(profile);
      
      // ✅ OPTIMIZED: Load all PayrollRuns once instead of per stub
      if (!allStubs || allStubs.length === 0) {
        setPayStubs([]);
        return;
      }

      try {
        const { PayrollRun } = await import('@/entities/all');
        const payrollRunIds = [...new Set(allStubs.map(s => s.payroll_run_id).filter(Boolean))];
        
        if (payrollRunIds.length === 0) {
          setPayStubs([]);
          return;
        }

        // ✅ Single API call to get all relevant PayrollRuns
        const allPayrollRuns = await PayrollRun.list('-created_date', 1000);
        const existingRunIds = new Set(allPayrollRuns.map(pr => pr.id));
        
        // Filter stubs to only include those with existing payroll runs
        const validStubs = allStubs.filter(stub => existingRunIds.has(stub.payroll_run_id));
        setPayStubs(validStubs);
      } catch (error) {
        console.warn('Failed to validate payroll runs:', error);
        // On error, show all stubs
        setPayStubs(allStubs);
      }
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    } finally {
      setLoadingPayroll(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await Department.list();
      const sorted = (data || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setDepartments(sorted);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadTeams = async () => {
    try {
      const data = await Team.list();
      const sorted = (data || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setTeams(sorted);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await Branch.list('sort_order');
      setCompanies(data || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadLeaveRequests = async (employeeId) => {
    try {
      const requests = await LeaveRequest.filter({ employee_id: employeeId }, '-created_date');
      setLeaveRequests(requests || []);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    }
  };

  const canEdit = () => {
    if (!currentUser || !localUser) return false;

    // If viewing own profile, can always edit
    if (currentUser.id === localUser.id) return true;

    // If current user is not an admin, they cannot edit others' details
    if (currentUser.role !== 'admin') return false;

    // Admin Leader can always edit others' details
    if (currentUser.admin_role_type === 'leader') {
      return true;
    }

    // Director can edit others' details (either with explicit permission or by default)
    if (currentUser.admin_role_type === 'director') {
      return true;
    }

    // FALLBACK: If admin_role_type is undefined but user is admin, give basic edit permissions
    if (!currentUser.admin_role_type && currentUser.role === 'admin') {
      return true;
    }

    return false;
  };

  const canEditAvatar = () => {
    // Avatar editing permissions are the same as general editing permissions
    return canEdit();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await User.update(localUser.id, localUser);
      toast.success('User updated successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadAvatar = async (file) => {
    if (!canEditAvatar()) {
      return;
    }

    // Create URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setCropImageUrl(imageUrl);
    setCropImageFile(file);
    setShowAvatarDialog(false);
    setShowCropDialog(true);
  };

  const handleEditExistingAvatar = () => {
    if (!canEditAvatar()) {
      return;
    }

    if (!localUser?.avatar_url) return;

    // Open crop dialog with existing avatar
    setCropImageUrl(localUser.avatar_url);
    setCropImageFile(null); // No file, using existing URL
    setShowAvatarDialog(false);
    setShowCropDialog(true);
  };

  const handleSaveCroppedImage = async (blob) => {
    setIsUploading(true);
    try {
      console.log('🔵 [AVATAR] Starting upload...', { blobType: blob.type, blobSize: blob.size });
      
      // Create FormData and append blob as file
      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');
      
      console.log('🔵 [AVATAR] FormData created');
      
      // Get the file from FormData
      const fileFromFormData = formData.get('file');
      console.log('🔵 [AVATAR] File from FormData:', { 
        name: fileFromFormData.name, 
        type: fileFromFormData.type, 
        size: fileFromFormData.size 
      });
      
      const { file_url } = await UploadFile({ file: fileFromFormData });
      console.log('🔵 [AVATAR] Upload successful:', file_url);
      
      await User.update(localUser.id, { avatar_url: file_url });

      setLocalUser({ ...localUser, avatar_url: file_url });
      if (onUpdate) onUpdate();
      setShowCropDialog(false);
      setCropImageUrl(null);
      setCropImageFile(null);

      // Clean up blob URL if it was created from a file
      if (cropImageFile) {
        URL.revokeObjectURL(cropImageUrl);
      }
      
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('❌ [AVATAR] Failed to upload avatar:', error);
      toast.error('Failed to upload avatar: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!canEditAvatar()) {
      return;
    }

    if (!confirm('Remove profile photo?')) return;

    try {
      await User.update(localUser.id, { avatar_url: null });
      setLocalUser({ ...localUser, avatar_url: null });
      if (onUpdate) onUpdate();
      setShowAvatarDialog(false);
    } catch (error) {
      console.error('Failed to remove avatar:', error);
    }
  };

  const handleUploadDocument = async (documentTypeId) => {
    if (!canEdit()) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,.doc,.docx';

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      setIsUploading(true);
      try {
        const uploadPromises = files.map(file => UploadPrivateFile({ file }));
        const uploadResults = await Promise.all(uploadPromises);
        const fileUris = uploadResults.map(result => result.file_uri);
        const fileNames = files.map(file => file.name);

        const existingDoc = employeeDocuments.find(doc => doc.document_type_id === documentTypeId);

        // Ask for expiry date (optional)
        const expiryInput = window.prompt('Expiry date (YYYY-MM-DD) - optional:', existingDoc?.expiry_date || '');
        let expiry_date = expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? expiryInput : undefined;
        // AI fallback if not provided
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

        if (existingDoc) {
         const updatedFileUrls = [...(existingDoc.file_urls || [existingDoc.file_url].filter(Boolean)), ...fileUris];
         const updatedFileNames = [...(existingDoc.file_names || [existingDoc.file_name].filter(Boolean)), ...fileNames];

         await EmployeeDocument.update(existingDoc.id, {
           file_urls: updatedFileUrls,
           file_names: updatedFileNames,
           ...(expiry_date ? { expiry_date } : {}),
           last_updated_date: new Date().toISOString()
         });
        } else {
         await EmployeeDocument.create({
           employee_id: localUser.id,
           document_type_id: documentTypeId,
           file_urls: fileUris,
           file_names: fileNames,
           ...(expiry_date ? { expiry_date } : {}),
           upload_date: new Date().toISOString(),
           last_updated_date: new Date().toISOString()
         });
        }

        await loadDocuments(localUser.id);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  };

  const handleViewDocuments = (docType) => {
    const docs = findDocsForType(docType);
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
      type: docType,
      files: allFiles
    });
  };

  const handleRemoveDocument = async (fileUrl) => {
    if (!canEdit()) {
      return;
    }

    try {
      const doc = employeeDocuments.find(d =>
        d.file_urls?.includes(fileUrl) || d.file_url === fileUrl
      );

      if (!doc) return;

      if (doc.file_urls && doc.file_urls.length > 1) {
        const updatedUrls = doc.file_urls.filter(url => url !== fileUrl);
        const fileIndex = doc.file_urls.indexOf(fileUrl);
        const updatedNames = doc.file_names?.filter((_, idx) => idx !== fileIndex);

        await EmployeeDocument.update(doc.id, {
          file_urls: updatedUrls,
          file_names: updatedNames.length > 0 ? updatedNames : null
        });
      } else {
        await EmployeeDocument.delete(doc.id);
      }

      await loadDocuments(localUser.id);
      setViewingDocs(null);
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  };

  const handleSavePayrollProfile = async () => {
    setIsSaving(true);
    try {
      if (payrollProfile?.id) {
        await EmployeePayrollProfile.update(payrollProfile.id, payrollProfile);
      } else {
        const newProfile = await EmployeePayrollProfile.create({
          ...payrollProfile,
          employee_id: localUser.id
        });
        setPayrollProfile(newProfile);
      }
    } catch (error) {
      console.error('Failed to save payroll profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getLeaveTypeLabel = (type) => {
    const labels = {
      sick_leave: 'Sick Leave',
      unjustified_leave: 'Unjustified Leave',
      holiday: 'Vacation',
      day_off: 'Day Off',
      personal_leave: 'Personal Leave',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!localUser) return null;

  const getDynamicFullName = () => {
    const firstName = localUser.first_name || '';
    const lastName = localUser.last_name || '';
    const nickname = localUser.nickname || '';

    if (nickname) return nickname;
    return `${firstName} ${lastName}`.trim() || localUser.full_name || localUser.email;
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="p-0 overflow-hidden" style={{ width: '50vw', minWidth: '600px', maxWidth: '90vw' }}>
          <SheetHeader className="px-6 py-4 bg-indigo-600 text-white border-b sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div
                className="relative cursor-pointer group"
                onClick={() => setShowAvatarDialog(true)}
              >
                <Avatar
                  name={getDynamicFullName()}
                  src={localUser.avatar_url}
                  isAdmin={localUser.role === 'admin'}
                  className="h-12 w-12"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full transition-all flex items-center justify-center">
                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">
                    View
                  </span>
                </div>
              </div>
              <div>
                <SheetTitle className="text-xl text-white">{getDynamicFullName()}</SheetTitle>
                <p className="text-sm text-slate-600">{localUser.email}</p>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-7 h-auto">
              <TabsTrigger value="details" className="text-xs">
                <UserIcon className="w-3 h-3 mr-1" />
                Details
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                <File className="w-3 h-3 mr-1" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="leave" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Leave
              </TabsTrigger>
              <TabsTrigger value="salary" className="text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                Salary
              </TabsTrigger>
              <TabsTrigger value="payslips" className="text-xs">
                <Receipt className="w-3 h-3 mr-1" />
                Pay Slips
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name" className="text-xs">First Name</Label>
                    <Input
                      id="first_name"
                      value={localUser.first_name || ''}
                      onChange={(e) => setLocalUser({ ...localUser, first_name: e.target.value })}
                      disabled={!canEdit()}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name" className="text-xs">Last Name</Label>
                    <Input
                      id="last_name"
                      value={localUser.last_name || ''}
                      onChange={(e) => setLocalUser({ ...localUser, last_name: e.target.value })}
                      disabled={!canEdit()}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nickname" className="text-xs">Nickname / Display Name</Label>
                  <Input
                    id="nickname"
                    value={localUser.nickname || ''}
                    onChange={(e) => setLocalUser({ ...localUser, nickname: e.target.value })}
                    placeholder="How this person prefers to be called"
                    disabled={!canEdit()}
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    This will be used as their display name in the app
                  </p>
                </div>

                <div>
                  <Label htmlFor="job_role" className="text-xs">Job Role</Label>
                  <Input
                    id="job_role"
                    value={localUser.job_role || ''}
                    onChange={(e) => setLocalUser({...localUser, job_role: e.target.value})}
                    disabled={!canEdit()}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Contact Information</h3>
                <div>
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    value={localUser.email || ''}
                    disabled
                    className="bg-slate-50 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile_phone" className="text-xs">Mobile Phone</Label>
                  <Input
                    id="mobile_phone"
                    value={localUser.mobile_phone || ''}
                    onChange={(e) => setLocalUser({...localUser, mobile_phone: e.target.value})}
                    placeholder="+971 50 123 4567"
                    disabled={!canEdit()}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Employment Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Employment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_number" className="text-xs">Employee Number</Label>
                    <Input
                      id="employee_number"
                      value={localUser.employee_number || ''}
                      disabled
                      className="bg-slate-50 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employment_start_date" className="text-xs">Employment Start Date</Label>
                    <Input
                      id="employment_start_date"
                      type="date"
                      value={localUser.employment_start_date || ''}
                      onChange={(e) => setLocalUser({...localUser, employment_start_date: e.target.value})}
                      disabled={!canEdit()}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="worker_type" className="text-xs">Worker Type</Label>
                    <Select
                      value={String(localUser.worker_type || 'field')}
                      onValueChange={(val) => {
                        console.log('🔍 Worker Type changed:', val);
                        console.log('🔍 Can edit?', canEdit());
                        console.log('🔍 Current user:', localUser);
                        setLocalUser({...localUser, worker_type: val});
                      }}
                      disabled={!canEdit()}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="field">Field Worker</SelectItem>
                        <SelectItem value="office">Office Worker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="department" className="text-xs">Department</Label>
                    <Select
                      value={String(localUser.department || '')}
                      onValueChange={(val) => {
                        console.log('🔍 Department changed:', val);
                        console.log('🔍 Departments list:', departments);
                        setLocalUser({...localUser, department: val === 'none' ? null : val});
                      }}
                      disabled={!canEdit()}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Department</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="team" className="text-xs">Team</Label>
                    <Select
                      value={String(localUser.team_id || '')}
                      onValueChange={(val) => {
                        console.log('🔍 Team changed:', val);
                        console.log('🔍 Teams list:', teams);
                        setLocalUser({...localUser, team_id: val === 'none' ? null : val});
                      }}
                      disabled={!canEdit()}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Team</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="direct_manager" className="text-xs">Direct Manager</Label>
                  <Input
                    id="direct_manager"
                    value={localUser.direct_manager || ''}
                    onChange={(e) => setLocalUser({...localUser, direct_manager: e.target.value})}
                    placeholder="Manager's name"
                    disabled={!canEdit()}
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="company" className="text-xs">Company</Label>
                  <Select
                    value={String(localUser.company_id || '')}
                    onValueChange={(val) => setLocalUser({...localUser, company_id: val === 'none' ? null : val})}
                    disabled={!canEdit()}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue asChild>
                        <span className="text-sm">
                          {companies.find(c => c.id === localUser.company_id)?.name || 'Select company'}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Company</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>


              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthday" className="text-xs">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={localUser.birthday || ''}
                      onChange={(e) => setLocalUser({...localUser, birthday: e.target.value})}
                      disabled={!canEdit()}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender" className="text-xs">Gender</Label>
                    <Select
                      value={String(localUser.gender || '')}
                      onValueChange={(val) => setLocalUser({...localUser, gender: val})}
                      disabled={!canEdit()}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue asChild>
                          <span className="text-sm">
                            {localUser.gender || 'Select gender'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>


              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Additional Information</h3>
                <div>
                  <Label htmlFor="responsibility" className="text-xs">Responsibility</Label>
                  <Textarea
                    id="responsibility"
                    value={localUser.responsibility || ''}
                    onChange={(e) => setLocalUser({...localUser, responsibility: e.target.value})}
                    rows={3}
                    placeholder="Job responsibilities and duties..."
                    disabled={!canEdit()}
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-xs">Notes</Label>
                  <Textarea
                    id="notes"
                    value={localUser.notes || ''}
                    onChange={(e) => setLocalUser({...localUser, notes: e.target.value})}
                    rows={4}
                    placeholder="Add notes about this user..."
                    disabled={!canEdit()}
                    className="text-sm"
                  />
                </div>
              </div>

              {canEdit() && (
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4 space-y-4">
              <DocumentListTable rows={userTableRows} onView={userViewFile} onDelete={userDeleteFile} showHeader={false} />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>User activity will appear here</p>
                <p className="text-xs mt-2">Track logins, changes, and important events</p>
              </div>
            </TabsContent>

            <TabsContent value="leave" className="mt-4 space-y-4">
              <h3 className="text-lg font-semibold">Leave History & Balances</h3>

              {/* Balance Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-xs text-blue-600 font-medium mb-1">Vacation Days Available</div>
                  <div className="text-2xl font-bold text-blue-900">{localUser.vacation_days_available || 0}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-xs text-purple-600 font-medium mb-1">Vacation Days Taken</div>
                  <div className="text-2xl font-bold text-purple-900">{localUser.vacation_days_taken || 0}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-xs text-green-600 font-medium mb-1">Sick Days Available</div>
                  <div className="text-2xl font-bold text-green-900">{localUser.sick_days_available || 0}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-xs text-orange-600 font-medium mb-1">Sick Days Taken</div>
                  <div className="text-2xl font-bold text-orange-900">{localUser.sick_days_taken || 0}</div>
                </div>
              </div>

              {/* Leave Requests List */}
              {leaveRequests.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 mb-3">All Leave Requests</h4>
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="p-4 bg-white rounded-lg border hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">
                              {getLeaveTypeLabel(request.request_type)}
                            </span>
                            <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                              {request.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-600">
                            {request.start_date && format(parseISO(request.start_date), 'MMM d, yyyy')} -
                            {request.end_date && format(parseISO(request.end_date), 'MMM d, yyyy')}
                            {request.total_days && (
                              <span className="ml-2 font-medium text-slate-900">
                                ({request.total_days} {request.total_days === 1 ? 'day' : 'days'})
                              </span>
                            )}
                          </div>
                        </div>
                        {request.created_date && (
                          <div className="text-xs text-slate-500">
                            Requested {format(parseISO(request.created_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>

                      {request.reason && (
                        <div className="text-sm text-slate-600 mb-2 pl-4 border-l-2 border-slate-200">
                          {request.reason}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-slate-500">
                          <span>Payroll: {request.payroll_impact === 'paid' ? 'Paid' : request.payroll_impact === 'unpaid' ? 'Unpaid' : 'Deducted from vacation'}</span>
                          {request.attachment_urls && request.attachment_urls.length > 0 && (
                            <span className="flex items-center gap-1">
                              <File className="w-3 h-3" />
                              {request.attachment_urls.length} attachment(s)
                            </span>
                          )}
                        </div>
                        {request.status === 'approved' && request.approval_date && (
                          <span className="text-green-600">
                            Approved {format(parseISO(request.approval_date), 'MMM d')}
                          </span>
                        )}
                        {request.status === 'rejected' && request.approval_date && (
                          <span className="text-red-600">
                            Rejected {format(parseISO(request.approval_date), 'MMM d')}
                          </span>
                        )}
                      </div>

                      {request.approval_notes && (
                        <div className="mt-2 pt-2 border-t text-xs text-slate-600 bg-slate-50 p-2 rounded">
                          <span className="font-medium">Admin notes:</span> {request.approval_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No leave requests found for this employee.</p>
                  <p className="text-sm mt-2">Leave requests can be created from the Payroll → Leave & Absences page.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="salary" className="mt-4 space-y-4">
              <h3 className="text-lg font-semibold">Salary Conditions</h3>

              {loadingPayroll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pay_type" className="text-xs">Pay Type</Label>
                      <Select
                        value={payrollProfile?.pay_type || 'Hourly'}
                        onValueChange={(val) => setPayrollProfile({...payrollProfile, pay_type: val})}
                        disabled={!canEdit()}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue asChild>
                            <span className="text-sm">
                              {payrollProfile?.pay_type || 'Hourly'}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Salary">Salary</SelectItem>
                          <SelectItem value="Hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pay_rate" className="text-xs">{payrollProfile?.pay_type === 'Salary' ? 'Annual Salary' : 'Hourly Rate'}</Label>
                      <Input
                        id="pay_rate"
                        type="number"
                        value={payrollProfile?.pay_rate || ''}
                        onChange={(e) => setPayrollProfile({...payrollProfile, pay_rate: parseFloat(e.target.value)})}
                        placeholder="0.00"
                        disabled={!canEdit()}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="payment_method" className="text-xs">Payment Method</Label>
                    <Select
                      value={payrollProfile?.payment_method || 'Direct Deposit'}
                      onValueChange={(val) => setPayrollProfile({...payrollProfile, payment_method: val})}
                      disabled={!canEdit()}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue asChild>
                          <span className="text-sm">
                            {payrollProfile?.payment_method || 'Direct Deposit'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direct Deposit">Direct Deposit</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name" className="text-xs">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={payrollProfile?.bank_name || ''}
                        onChange={(e) => setPayrollProfile({...payrollProfile, bank_name: e.target.value})}
                        placeholder="Bank name"
                        disabled={!canEdit()}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_number" className="text-xs">Account Number</Label>
                      <Input
                        id="account_number"
                        value={payrollProfile?.account_number || ''}
                        onChange={(e) => setPayrollProfile({...payrollProfile, account_number: e.target.value})}
                        placeholder="Account number"
                        disabled={!canEdit()}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="routing_number" className="text-xs">Routing Number</Label>
                    <Input
                      id="routing_number"
                      value={payrollProfile?.routing_number || ''}
                      onChange={(e) => setPayrollProfile({...payrollProfile, routing_number: e.target.value})}
                      placeholder="Routing number"
                      disabled={!canEdit()}
                      className="h-9 text-sm"
                    />
                  </div>

                  {canEdit() && (
                    <Button onClick={handleSavePayrollProfile} disabled={isSaving} className="w-full">
                      {isSaving ? 'Saving...' : 'Save Salary Conditions'}
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="payslips" className="mt-4 space-y-4">
              <h3 className="text-lg font-semibold">Pay Slips History</h3>

              {loadingPayroll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : payStubs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No pay slips available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Gross Pay</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payStubs.map((stub) => (
                      <TableRow key={stub.id}>
                        <TableCell>{stub.created_date ? format(parseISO(stub.created_date), 'MMM yyyy') : '-'}</TableCell>
                        <TableCell>${stub.gross_pay?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>${stub.deductions?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="font-semibold">${stub.net_pay?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          <Badge variant={stub.status === 'Paid' ? 'success' : 'warning'}>
                            {stub.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">User Settings</h3>

                {/* Read-only Role Display */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <Label className="text-slate-900 font-semibold">User Role & Permissions</Label>

                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    {localUser.role === 'user' && (
                      <>
                        <span className="text-lg">👤</span>
                        <div>
                          <div className="font-medium">User</div>
                          <div className="text-xs text-slate-500">Standard user access</div>
                        </div>
                      </>
                    )}

                    {localUser.role === 'admin' && localUser.admin_role_type === 'leader' && (
                      <>
                        <span className="text-lg">👑</span>
                        <div>
                          <div className="font-medium">Admin Leader</div>
                          <div className="text-xs text-slate-500">Full access to everything</div>
                        </div>
                      </>
                    )}

                    {localUser.role === 'admin' && localUser.admin_role_type === 'director' && (
                      <>
                        <span className="text-lg">🛡️</span>
                        <div>
                          <div className="font-medium">Admin Director</div>
                          <div className="text-xs text-slate-500">Can manage users, payroll, documents & assets</div>
                        </div>
                      </>
                    )}

                    {localUser.role === 'admin' && localUser.admin_role_type === 'advisor' && (
                      <>
                        <span className="text-lg">⭐</span>
                        <div>
                          <div className="font-medium">Admin Advisor</div>
                          <div className="text-xs text-slate-500">Can manage departments & assets</div>
                        </div>
                      </>
                    )}

                    {localUser.role === 'admin' && !localUser.admin_role_type && (
                      <>
                        <span className="text-lg">⚠️</span>
                        <div>
                          <div className="font-medium">Admin (No Role Type)</div>
                          <div className="text-xs text-amber-600">Role type needs to be assigned</div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded border border-blue-200">
                    ℹ️ To change user roles, go to <strong>Users → Settings</strong> button at the top of the page.
                  </div>

                  {/* Current permissions display */}
                  <div className="text-xs space-y-1 mt-2">
                    <p className="font-semibold text-slate-700">This role has access to:</p>
                    {localUser.role === 'user' && (
                      <ul className="list-disc list-inside space-y-0.5 ml-2 text-slate-600">
                        <li>View their own information</li>
                        <li>Clock in/out and track time</li>
                        <li>View assigned tasks and projects</li>
                      </ul>
                    )}
                    {localUser.role === 'admin' && localUser.admin_role_type === 'advisor' && (
                      <ul className="list-disc list-inside space-y-0.5 ml-2 text-blue-700">
                        <li>Manage departments</li>
                        <li>Manage assets and inventory</li>
                      </ul>
                    )}
                    {localUser.role === 'admin' && localUser.admin_role_type === 'director' && (
                      <ul className="list-disc list-inside space-y-0.5 ml-2 text-orange-700">
                        <li>Delete admin users</li>
                        <li>Access and manage payroll</li>
                        <li>Edit user photos & documents</li>
                        <li>Manage departments</li>
                        <li>Manage assets and inventory</li>
                      </ul>
                    )}
                    {localUser.role === 'admin' && localUser.admin_role_type === 'leader' && (
                      <ul className="list-disc list-inside space-y-0.5 ml-2 text-yellow-700">
                        <li>Full system access</li>
                        <li>Delete any admin users</li>
                        <li>Access and manage payroll</li>
                        <li>Edit all user photos & documents</li>
                        <li>Manage departments and teams</li>
                        <li>Manage all assets and inventory</li>
                      </ul>
                    )}
                    {localUser.role === 'admin' && !localUser.admin_role_type && (
                      <div className="text-amber-700 bg-amber-50 p-2 rounded">
                        ⚠️ This admin needs a role type assigned to have proper permissions.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="status" className="text-xs">Status</Label>
                  <Select
                    value={String(localUser.status || 'Active')}
                    onValueChange={(val) => setLocalUser({...localUser, status: val})}
                    disabled={!canEdit()}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue asChild>
                        <span className="text-sm">
                          {localUser.status || 'Active'}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone" className="text-xs">Timezone</Label>
                  <Input
                    id="timezone"
                    value={localUser.timezone || ''}
                    onChange={(e) => setLocalUser({...localUser, timezone: e.target.value})}
                    placeholder="e.g., America/New_York"
                    disabled={!canEdit()}
                    className="h-9 text-sm"
                  />
                </div>

                {canEdit() && (
                  <Button onClick={handleSave} disabled={isSaving} className="w-full">
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Avatar Viewer Dialog */}
      <AvatarViewerDialog
        isOpen={showAvatarDialog}
        onClose={() => setShowAvatarDialog(false)}
        user={localUser}
        onUpload={handleUploadAvatar}
        onEdit={handleEditExistingAvatar}
        onRemove={handleRemoveAvatar}
        isUploading={isUploading}
        canEdit={canEditAvatar()}
      />

      {/* Image Crop Dialog */}
      <ImageCropDialog
        isOpen={showCropDialog}
        onClose={() => {
          setShowCropDialog(false);
          setCropImageUrl(null);
          setCropImageFile(null);
          setShowAvatarDialog(true);
        }}
        imageUrl={cropImageUrl}
        onSave={handleSaveCroppedImage}
        isSaving={isUploading}
      />

      {/* Document Viewer */}
      {viewingDocs && (
        <DocumentViewer
          isOpen={!!viewingDocs}
          onClose={() => setViewingDocs(null)}
          title={`${viewingDocs.type.name} Documents`}
          documents={viewingDocs.files}
          onRemove={canEdit() ? handleRemoveDocument : undefined}
          onUpdate={async (documentId, updates) => {
            try {
              await EmployeeDocument.update(documentId, { ...updates, last_updated_date: new Date().toISOString() });
              await loadDocuments(localUser.id);
              // refresh viewer
              handleViewDocuments(viewingDocs.type);
              toast.success('Document updated');
            } catch (e) {
              console.error('Update failed', e);
              toast.error('Failed to update document');
            }
          }}
          canEdit={canEdit()}
        />
      )}
    </>
  );
}