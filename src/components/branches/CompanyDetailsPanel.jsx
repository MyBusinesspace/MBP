import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CompanyDocument, User } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Upload, Download, Trash2, Loader2, FileText, AlertCircle, Building2, MapPin, Users as UsersIcon, Save, Image as ImageIcon, Edit } from 'lucide-react';
import { Branch } from '@/entities/all';
import Avatar from '../Avatar';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import DocumentViewer from '../shared/DocumentViewer';
import FormSettingsEditor from './FormSettingsEditor';

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { color: null, text: 'No expiry' };
  
  const today = new Date();
  const expiry = parseISO(expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, today);
  
  if (daysUntilExpiry < 0) return { color: 'red', text: 'Expired' };
  if (daysUntilExpiry <= 30) return { color: 'red', text: `Expires in ${daysUntilExpiry} days` };
  if (daysUntilExpiry <= 60) return { color: 'orange', text: `Expires in ${daysUntilExpiry} days` };
  return { color: 'green', text: 'Valid' };
};

export default function CompanyDetailsPanel({ isOpen, onClose, company }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (company) {
        setFormData({
            name: company.name || '',
            short_name: company.short_name || '',
            location: company.location || '',
            address: company.address || '',
            phone: company.phone || '',
            email: company.email || '',
            tax_number: company.tax_number || '',
            website: company.website || '',
            logo_url: company.logo_url || '',
            logo_forms_url: company.logo_forms_url || '',
            logo_collapsed_url: company.logo_collapsed_url || '',
            color: company.color || 'blue',
            manager_ids: company.manager_ids || [],
            is_active: company.is_active !== false
        });
    }
  }, [company]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
        await Branch.update(company.id, formData);
        toast.success('Company settings updated');
        // Force reload of parent if possible, or at least update local state?
        // For now just notify success. Ideally we should trigger a reload in parent.
        if (onClose) onClose(); // Close panel to force refresh when reopening or handle differently
    } catch (error) {
        console.error(error);
        toast.error('Failed to save settings');
    } finally {
        setSaving(false);
    }
  };

  const handleImageUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({ ...prev, [field]: file_url }));
        toast.success('Image uploaded');
    } catch (error) {
        console.error(error);
        toast.error('Failed to upload image');
    } finally {
        setLogoUploading(false);
    }
  };
  const [viewingDoc, setViewingDoc] = useState(null);
  
  const [newDoc, setNewDoc] = useState({
    document_type: '',
    document_name: '',
    issue_date: '',
    expiry_date: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && company) {
      loadDocuments();
      loadCompanyUsers();
    }
  }, [isOpen, company]);

  const loadCompanyUsers = async () => {
    try {
      const allUsers = await User.list();
      const filtered = allUsers.filter(u => u.company_id === company.id && !u.archived);
      setCompanyUsers(filtered);
    } catch (error) {
      console.error('Error loading company users:', error);
    }
  };

  const getDynamicFullName = (user) => {
    if (!user) return 'Unknown';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || user.full_name || 'Unknown';
  };

  const getManagerUsers = () => {
    if (!company?.manager_ids || !companyUsers) return [];
    return companyUsers.filter(u => company.manager_ids.includes(u.id));
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await CompanyDocument.filter({ company_id: company.id });
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!newDoc.document_type || !newDoc.document_name) {
      toast.error('Document type and name are required');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,.doc,.docx';

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      setUploading(true);
      try {
        const uploadPromises = files.map(file => base44.integrations.Core.UploadPrivateFile({ file }));
        const uploadResults = await Promise.all(uploadPromises);
        const fileUris = uploadResults.map(result => result.file_uri);
        const fileNames = files.map(file => file.name);

        await CompanyDocument.create({
          company_id: company.id,
          document_type: newDoc.document_type,
          document_name: newDoc.document_name,
          file_urls: fileUris,
          file_names: fileNames,
          issue_date: newDoc.issue_date || null,
          expiry_date: newDoc.expiry_date || null,
          renewal_year: newDoc.expiry_date ? new Date(newDoc.expiry_date).getFullYear() : null,
          notes: newDoc.notes || null,
          upload_date: new Date().toISOString(),
          last_updated_date: new Date().toISOString()
        });

        toast.success(`${files.length} file(s) uploaded successfully`);
        setNewDoc({
          document_type: '',
          document_name: '',
          issue_date: '',
          expiry_date: '',
          notes: ''
        });
        await loadDocuments();
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error('Failed to upload files');
      } finally {
        setUploading(false);
      }
    };

    input.click();
  };

  const handleViewDocument = (doc) => {
    const files = (doc.file_urls || []).map((url, idx) => ({
      document_id: doc.id,
      file_url: url,
      file_name: doc.file_names?.[idx] || `Document ${idx + 1}`,
      upload_date: doc.upload_date,
      expiry_date: doc.expiry_date
    }));

    setViewingDoc({
      document: doc,
      files
    });
  };

  const handleRemoveDocument = async (docId) => {
    if (!confirm('Delete this document? This action cannot be undone.')) return;

    try {
      await CompanyDocument.delete(docId);
      toast.success('Document deleted');
      await loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleExportDocuments = () => {
    try {
      const headers = ['Document Type', 'Document Name', 'Issue Date', 'Expiry Date', 'Status', 'Notes'];
      
      const rows = documents.map(doc => {
        const status = getExpiryStatus(doc.expiry_date);
        return [
          doc.document_type || '',
          doc.document_name || '',
          doc.issue_date ? format(parseISO(doc.issue_date), 'yyyy-MM-dd') : '',
          doc.expiry_date ? format(parseISO(doc.expiry_date), 'yyyy-MM-dd') : '',
          status.text || '',
          doc.notes || ''
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${company.name}_documents_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Documents exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export documents');
    }
  };

  if (!company) return null;

  const branchColors = {
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    teal: 'bg-teal-100 text-teal-800 border-teal-200'
  };

  const managers = getManagerUsers();

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="border-b py-4 px-6">
            <SheetTitle className="text-xl font-bold flex items-center gap-3">
              <Building2 className="w-6 h-6" />
              {company.name}
            </SheetTitle>
            <p className="text-sm text-slate-600">{company.location}</p>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 grid grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="forms">PDF Forms</TabsTrigger>
            <TabsTrigger value="users">Users ({companyUsers.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto m-0 p-6 space-y-6">
                <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
                    <h3 className="text-lg font-semibold">Company Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Name</label>
                            <Input 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Short Name (Sidebar)</label>
                            <Input 
                                value={formData.short_name} 
                                onChange={e => setFormData({...formData, short_name: e.target.value})} 
                                placeholder="e.g. Redcrane"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Short Location</label>
                            <Input 
                                value={formData.location} 
                                onChange={e => setFormData({...formData, location: e.target.value})} 
                                placeholder="e.g. Dubai"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Full Address</label>
                            <Input 
                                value={formData.address} 
                                onChange={e => setFormData({...formData, address: e.target.value})} 
                                placeholder="Full physical address for reports"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <Input 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                                placeholder="+971..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input 
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                placeholder="office@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">TRN / Tax Number</label>
                            <Input 
                                value={formData.tax_number} 
                                onChange={e => setFormData({...formData, tax_number: e.target.value})} 
                                placeholder="Tax Registration Number"
                            />
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Website</label>
                            <Input 
                                value={formData.website} 
                                onChange={e => setFormData({...formData, website: e.target.value})} 
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="space-y-6 border-t pt-6">
                        <h4 className="font-medium text-slate-900">Brand Assets</h4>
                        
                        {/* Main Logo */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Main Logo (Expanded Sidebar)</label>
                            <div className="flex items-center gap-4">
                                {formData.logo_url ? (
                                    <div className="w-20 h-20 border rounded-lg p-1 bg-white relative group">
                                        <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                        <button 
                                            onClick={() => setFormData({...formData, logo_url: ''})}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 text-slate-400">
                                        <ImageIcon className="w-8 h-8" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input 
                                        type="file" 
                                        id="logo-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload('logo_url', e)}
                                        disabled={logoUploading}
                                    />
                                    <Button 
                                        variant="outline" 
                                        onClick={() => document.getElementById('logo-upload').click()}
                                        disabled={logoUploading}
                                    >
                                        {logoUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                        Upload Main Logo
                                    </Button>
                                    <p className="text-xs text-slate-500 mt-1">Used in expanded sidebar and general headers.</p>
                                </div>
                            </div>
                        </div>

                        {/* Collapsed Logo */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Sidebar Icon (Collapsed)</label>
                            <div className="flex items-center gap-4">
                                {formData.logo_collapsed_url ? (
                                    <div className="w-12 h-12 border rounded-lg p-1 bg-white relative group">
                                        <img src={formData.logo_collapsed_url} alt="Icon" className="w-full h-full object-contain" />
                                        <button 
                                            onClick={() => setFormData({...formData, logo_collapsed_url: ''})}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity scale-75"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 text-slate-400">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input 
                                        type="file" 
                                        id="icon-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload('logo_collapsed_url', e)}
                                        disabled={logoUploading}
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => document.getElementById('icon-upload').click()}
                                        disabled={logoUploading}
                                    >
                                        <Upload className="w-3 h-3 mr-2" />
                                        Upload Icon
                                    </Button>
                                    <p className="text-xs text-slate-500 mt-1">Square icon for collapsed sidebar (32x32px recommended).</p>
                                </div>
                            </div>
                        </div>

                        {/* Forms Logo */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Forms & Reports Logo</label>
                            <div className="flex items-center gap-4">
                                {formData.logo_forms_url ? (
                                    <div className="w-32 h-16 border rounded-lg p-1 bg-white relative group">
                                        <img src={formData.logo_forms_url} alt="Form Logo" className="w-full h-full object-contain" />
                                        <button 
                                            onClick={() => setFormData({...formData, logo_forms_url: ''})}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-32 h-16 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 text-slate-400">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input 
                                        type="file" 
                                        id="form-logo-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload('logo_forms_url', e)}
                                        disabled={logoUploading}
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => document.getElementById('form-logo-upload').click()}
                                        disabled={logoUploading}
                                    >
                                        <Upload className="w-3 h-3 mr-2" />
                                        Upload Form Logo
                                    </Button>
                                    <p className="text-xs text-slate-500 mt-1">High-res logo for PDFs and printed forms.</p>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Preview Section */}
                        <div className="mt-6 p-4 bg-slate-100 rounded-lg border border-slate-200">
                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Sidebar Preview</h5>
                            <div className="flex gap-8 items-start">
                                {/* Expanded Preview */}
                                <div>
                                    <p className="text-[10px] text-slate-400 mb-2">Expanded</p>
                                    <div className="w-48 bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex items-center gap-3">
                                        {formData.logo_url ? (
                                            <img src={formData.logo_url} className="w-8 h-8 object-contain" alt="Logo" />
                                        ) : (
                                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-[10px]">Logo</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="h-3 bg-slate-200 rounded w-3/4 mb-1"></div>
                                            <div className="h-2 bg-slate-100 rounded w-1/2"></div>
                                        </div>
                                        <div className="w-4 h-4 bg-slate-100 rounded"></div>
                                    </div>
                                </div>

                                {/* Collapsed Preview */}
                                <div>
                                    <p className="text-[10px] text-slate-400 mb-2">Collapsed</p>
                                    <div className="w-14 h-14 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center">
                                        {formData.logo_collapsed_url ? (
                                            <img src={formData.logo_collapsed_url} className="w-8 h-8 object-contain" alt="Icon" />
                                        ) : (
                                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-[10px]">Icon</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <Button onClick={handleSaveSettings} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </TabsContent>

            {/* PDF Forms Tab */}
            <TabsContent value="forms" className="flex-1 overflow-y-auto m-0 p-6">
                <FormSettingsEditor 
                    company={company} 
                    onSave={() => {
                        // Optionally refresh data
                    }} 
                />
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto m-0 p-6 space-y-6">
              {/* Company Info Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('settings')}>
                    <Edit className="w-3 h-3 mr-2" />
                    Edit Details
                  </Button>
                </div>
                
                {/* Logo Display */}
                <div className="flex justify-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    {company?.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="h-20 object-contain" />
                    ) : (
                        <div className="text-center text-slate-400">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No logo uploaded</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Status</label>
                    <Badge variant={company?.is_active ? 'default' : 'secondary'}>
                      {company?.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Theme</label>
                     <Badge className={`${branchColors[company?.color || 'blue']} border`}>
                        {company?.color || 'blue'}
                      </Badge>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Short Location</label>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {company?.location || <span className="text-slate-400 italic">Not set</span>}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Total Users</label>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <UsersIcon className="w-3 h-3 text-slate-400" />
                            <span>{companyUsers.length} users</span>
                        </div>
                      </div>
                   </div>

                   <div className="pt-2 border-t border-slate-100">
                        <label className="text-xs text-slate-500 mb-1 block">Full Address</label>
                        <p className="text-sm text-slate-700">{company?.address || <span className="text-slate-400 italic">Not set</span>}</p>
                   </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                            <p className="text-sm text-slate-700">{company?.phone || <span className="text-slate-400 italic">Not set</span>}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Email</label>
                            <p className="text-sm text-slate-700">{company?.email || <span className="text-slate-400 italic">Not set</span>}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">TRN / Tax ID</label>
                            <p className="text-sm text-slate-700">{company?.tax_number || <span className="text-slate-400 italic">Not set</span>}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Website</label>
                            <p className="text-sm text-slate-700 truncate">{company?.website || <span className="text-slate-400 italic">Not set</span>}</p>
                        </div>
                    </div>
                </div>
              </div>

              {/* Managers Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Managers</h3>
                {managers.length === 0 ? (
                  <p className="text-sm text-slate-500">No managers assigned</p>
                ) : (
                  <div className="space-y-3">
                    {managers.map((manager) => (
                      <div key={manager.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                        <Avatar
                          name={getDynamicFullName(manager)}
                          src={manager.avatar_url}
                          className="w-10 h-10"
                        />
                        <div>
                          <p className="text-sm font-medium">{getDynamicFullName(manager)}</p>
                          <p className="text-xs text-slate-500">{manager.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="flex-1 overflow-y-auto m-0 p-6">
              <div className="bg-white rounded-lg border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold">Company Users</h3>
                </div>
                <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
                  {companyUsers.length === 0 ? (
                    <div className="p-8 text-center">
                      <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No users assigned to this company</p>
                    </div>
                  ) : (
                    companyUsers.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-slate-50 flex items-center gap-3">
                        <Avatar
                          name={getDynamicFullName(user)}
                          src={user.avatar_url}
                          className="w-10 h-10"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{getDynamicFullName(user)}</p>
                          <p className="text-xs text-slate-500">{user.job_role || 'No job role'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{user.email}</p>
                          {user.department && (
                            <p className="text-xs text-slate-400">{user.department}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="flex-1 overflow-y-auto m-0 p-6 space-y-6">
              {/* Upload Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-900">Upload New Document</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Document Type (e.g., License, Insurance)"
                    value={newDoc.document_type}
                    onChange={(e) => setNewDoc({ ...newDoc, document_type: e.target.value })}
                  />
                  <Input
                    placeholder="Document Name"
                    value={newDoc.document_name}
                    onChange={(e) => setNewDoc({ ...newDoc, document_name: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Issue Date"
                    value={newDoc.issue_date}
                    onChange={(e) => setNewDoc({ ...newDoc, issue_date: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Expiry Date"
                    value={newDoc.expiry_date}
                    onChange={(e) => setNewDoc({ ...newDoc, expiry_date: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Notes (optional)"
                  value={newDoc.notes}
                  onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button onClick={handleUploadDocument} disabled={uploading}>
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Files
                  </Button>
                  <Button variant="outline" onClick={handleExportDocuments} disabled={documents.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Expiry Legend */}
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
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No documents yet. Upload your first document above.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Type</TableHead>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Files</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => {
                        const expiryStatus = getExpiryStatus(doc.expiry_date);
                        const fileCount = doc.file_urls?.length || 0;
                        
                        return (
                          <TableRow key={doc.id} className="hover:bg-slate-50">
                            <TableCell>
                              <Badge variant="outline">{doc.document_type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{doc.document_name}</TableCell>
                            <TableCell>
                              {doc.issue_date ? format(parseISO(doc.issue_date), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              {doc.expiry_date ? format(parseISO(doc.expiry_date), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {expiryStatus.color && (
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      expiryStatus.color === 'green' ? 'bg-green-500' :
                                      expiryStatus.color === 'orange' ? 'bg-orange-500' :
                                      'bg-red-500'
                                    }`}
                                  />
                                )}
                                <span className="text-sm">{expiryStatus.text}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDocument(doc)}
                                >
                                  View ({fileCount})
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      for (const [idx, fileUri] of (doc.file_urls || []).entries()) {
                                        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
                                        const link = document.createElement('a');
                                        link.href = signed_url;
                                        link.download = doc.file_names?.[idx] || `document_${idx + 1}`;
                                        link.click();
                                      }
                                      toast.success('Download started');
                                    } catch (error) {
                                      console.error('Download failed:', error);
                                      toast.error('Failed to download files');
                                    }
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {viewingDoc && (
        <DocumentViewer
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          title={`${company.name} - ${viewingDoc.document.document_name}`}
          documents={viewingDoc.files}
          onRemove={async (fileUrl) => {
            // Handle file removal logic here if needed
            await loadDocuments();
          }}
          canEdit={true}
        />
      )}
    </>
  );
}