import React, { useState, useEffect, useMemo } from 'react';
import { CustomerDocument, DocumentType } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, Loader2, Search, Settings, AlertCircle, Eye, EyeOff, ArrowUpDown, Ban, CheckCircle2, MoreHorizontal, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import DocumentViewer from '@/components/shared/DocumentViewer';
import DocumentTypeManager from '@/components/documents/DocumentTypeManager';
import { format, parseISO, differenceInDays } from 'date-fns';
import { UploadPrivateFile } from '@/integrations/Core';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/skeletons/PageSkeleton';

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { color: null, text: 'No expiry date' };
  const today = new Date();
  const expiry = parseISO(expiryDate);
  const days = differenceInDays(expiry, today);
  if (days < 0) return { color: 'red', text: 'Expired' };
  if (days <= 30) return { color: 'red', text: `Expires in ${days} days` };
  if (days <= 60) return { color: 'orange', text: `Expires in ${days} days` };
  return { color: 'green', text: 'Valid' };
};

export default function ClientDocumentMatrixTab({ customers = [], isAdmin }) {
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDocs, setViewingDocs] = useState(null);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [onlyWithDocs, setOnlyWithDocs] = useState(false);
  const [hiddenCustomers, setHiddenCustomers] = useState(new Set());
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadData(); }, []);

  // Live updates: subscribe to document and type changes
  useEffect(() => {
    let unsubDocs = () => {};
    let unsubTypes = () => {};
    try {
      unsubDocs = CustomerDocument.subscribe(async () => {
        try { const fresh = await CustomerDocument.list(); setDocuments(fresh || []); } catch {}
      });
    } catch {}
    try {
      unsubTypes = DocumentType.subscribe(async () => {
        try { const types = await DocumentType.list('sort_order'); setDocumentTypes(types || []); } catch {}
      });
    } catch {}
    return () => { try {unsubDocs();} catch{} try{unsubTypes();} catch{} };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsData, typesData] = await Promise.all([
        CustomerDocument.list(),
        DocumentType.list('sort_order')
      ]);
      setDocuments(docsData || []);
      setDocumentTypes(typesData || []);
    } catch (e) {
      console.error('Failed to load customer documents:', e);
      toast.error('Failed to load customer documents');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (c) => c?.name || 'Unknown Customer';

  const sortedCustomers = useMemo(() => {
    let filtered = customers.filter(c => {
      if (!c) return false;
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const q = searchTerm.toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    if (sortBy === 'name') {
      filtered.sort((a, b) => getCustomerName(a).toLowerCase().localeCompare(getCustomerName(b).toLowerCase()));
    }
    return filtered;
  }, [customers, searchTerm, sortBy]);

  const filteredCustomers = sortedCustomers.filter(c => {
    if (hiddenCustomers.has(c.id)) return false;
    if (!onlyWithDocs) return true;
    const docs = getCustomerDocuments(c.id);
    return docs.some(d => (d.file_urls?.length || (d.file_url ? 1 : 0)) > 0);
  });

  function getCustomerDocuments(customerId) { return documents.filter(d => d.customer_id === customerId); }

  const toggleCustomerVisibility = (customerId) => {
    setHiddenCustomers(prev => {
      const s = new Set(prev);
      s.has(customerId) ? s.delete(customerId) : s.add(customerId);
      return s;
    });
  };

  const handleSelectAllCustomers = (checked) => {
    setSelectedCustomerIds(checked ? filteredCustomers.map(c => c.id) : []);
  };

  const handleSelectCustomer = (id, checked) => {
    setSelectedCustomerIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const handleUploadDocument = async (customerId, documentTypeId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,.doc,.docx';
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      setUploadingFor({ customerId, typeId: documentTypeId });
      try {
        const uploadPromises = files.map(file => UploadPrivateFile({ file }));
        const uploadResults = await Promise.all(uploadPromises);
        const fileUris = uploadResults.map(r => r.file_uri);
        const fileNames = files.map(f => f.name);

        const existingDoc = documents.find(d => d.customer_id === customerId && d.document_type_id === documentTypeId);
        // Ask for expiry date (optional)
        const expiryInput = window.prompt('Fecha de expiración (YYYY-MM-DD) - opcional:', existingDoc?.expiry_date || '');
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

        if (existingDoc) {
          const updatedUrls = [...(existingDoc.file_urls || (existingDoc.file_url ? [existingDoc.file_url] : [])), ...fileUris];
          const updatedNames = [...(existingDoc.file_names || (existingDoc.file_name ? [existingDoc.file_name] : [])), ...fileNames];
          const updated = await CustomerDocument.update(existingDoc.id, {
            file_urls: updatedUrls,
            file_names: updatedNames,
            ...(expiry_date ? { expiry_date } : {}),
            last_updated_date: new Date().toISOString()
          });
          setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
        } else {
          const created = await CustomerDocument.create({
            customer_id: customerId,
            document_type_id: documentTypeId,
            file_urls: fileUris,
            file_names: fileNames,
            ...(expiry_date ? { expiry_date } : {}),
            upload_date: new Date().toISOString(),
            last_updated_date: new Date().toISOString()
          });
          setDocuments(prev => [...prev, created]);
        }
        toast.success(`${files.length} file(s) uploaded`);
      } catch (err) {
        console.error('Upload failed', err);
        toast.error('Failed to upload files');
      } finally {
        setUploadingFor(null);
      }
    };
    input.click();
  };

  const handleViewDocuments = (customer, docType) => {
    const docs = documents.filter(d => d.customer_id === customer.id && d.document_type_id === docType.id);
    const files = docs.flatMap(doc => {
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
    setViewingDocs({ customer, type: docType, files, documentTypeId: docType.id });
  };

  const handleRemoveDocument = async (fileUrl) => {
    try {
      const doc = documents.find(d => d.file_urls?.includes(fileUrl) || d.file_url === fileUrl);
      if (!doc) return;
      if (doc.file_urls && doc.file_urls.length > 1) {
        const updatedUrls = doc.file_urls.filter(u => u !== fileUrl);
        const idx = doc.file_urls.indexOf(fileUrl);
        const updatedNames = (doc.file_names || []).filter((_, i) => i !== idx);
        await CustomerDocument.update(doc.id, {
          file_urls: updatedUrls,
          file_names: updatedNames.length ? updatedNames : null,
          last_updated_date: new Date().toISOString()
        });
      } else {
        await CustomerDocument.delete(doc.id);
      }
      toast.success('Document removed');
      const fresh = await CustomerDocument.list();
      setDocuments(fresh || []);
      if (viewingDocs) {
        const docsForViewer = fresh.filter(d => d.customer_id === viewingDocs.customer.id && d.document_type_id === viewingDocs.type.id);
        const files = docsForViewer.flatMap(d => {
          const urls = d.file_urls || (d.file_url ? [d.file_url] : []);
          const names = d.file_names || (d.file_name ? [d.file_name] : []);
          return urls.map((url, idx) => ({ document_id: d.id, file_url: url, file_name: names[idx] || `Document ${idx + 1}`, upload_date: d.upload_date, expiry_date: d.expiry_date }));
        });
        setViewingDocs(files.length ? { ...viewingDocs, files } : null);
      }
    } catch (e) {
      console.error('Remove failed', e);
      toast.error('Failed to remove document');
    }
  };

  const handleUpdateDocument = async (documentId, updates) => {
    try {
      await CustomerDocument.update(documentId, { ...updates, last_updated_date: new Date().toISOString() });
      toast.success('Document updated');
      const fresh = await CustomerDocument.list();
      setDocuments(fresh || []);
      if (viewingDocs) {
        const docsForViewer = fresh.filter(d => d.customer_id === viewingDocs.customer.id && d.document_type_id === viewingDocs.type.id);
        const files = docsForViewer.flatMap(d => {
          const urls = d.file_urls || (d.file_url ? [d.file_url] : []);
          const names = d.file_names || (d.file_name ? [d.file_name] : []);
          return urls.map((url, idx) => ({ document_id: d.id, file_url: url, file_name: names[idx] || `Document ${idx + 1}`, upload_date: d.upload_date, expiry_date: d.expiry_date }));
        });
        setViewingDocs(prev => ({ ...prev, files }));
      }
    } catch (e) {
      console.error('Update failed', e);
      toast.error('Failed to update document');
    }
  };

  const handleToggleNotApplicable = async (customerId, docTypeId, currentDoc) => {
    try {
      const isNA = !currentDoc?.is_not_applicable;
      if (currentDoc) {
        const updated = await CustomerDocument.update(currentDoc.id, { is_not_applicable: isNA, last_updated_date: new Date().toISOString() });
        setDocuments(prev => prev.map(d => d.id === currentDoc.id ? updated : d));
      } else {
        const created = await CustomerDocument.create({ customer_id: customerId, document_type_id: docTypeId, is_not_applicable: isNA, upload_date: new Date().toISOString(), last_updated_date: new Date().toISOString() });
        setDocuments(prev => [...prev, created]);
      }
      toast.success(isNA ? 'Marked as N/A' : 'Unmarked as N/A');
    } catch (e) {
      console.error('Toggle N/A failed', e);
      toast.error('Failed to update status');
    }
  };

  const handleExportCustomerDocs = () => {
    setExporting(true);
    try {
      const customersToExport = selectedCustomerIds.length > 0 ? filteredCustomers.filter(c => selectedCustomerIds.includes(c.id)) : filteredCustomers;
      const headers = ['Customer', 'Email', 'Phone'];
      documentTypes.forEach(dt => headers.push(dt.name));
      const rows = customersToExport.map(c => {
        const row = [getCustomerName(c), c.email || '-', c.phone || '-'];
        documentTypes.forEach(dt => {
          const doc = documents.find(d => d.customer_id === c.id && d.document_type_id === dt.id);
          const fileCount = doc ? (doc.file_urls?.length || (doc.file_url ? 1 : 0)) : 0;
          const status = doc?.expiry_date ? getExpiryStatus(doc.expiry_date).text : '-';
          row.push(fileCount > 0 ? `${fileCount} files (${status})` : 'No files');
        });
        return row;
      });
      const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client-documents_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch (e) {
      console.error('Export failed', e);
      toast.error('Export failed');
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search customers by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="default" size="sm" onClick={handleExportCustomerDocs} disabled={exporting} className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm">
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Export CSV
          </Button>
          <Button onClick={() => setShowCustomerSelector(!showCustomerSelector)} variant="default" size="sm" className={cn("border-0 shadow-sm", showCustomerSelector ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white") }>
            {showCustomerSelector ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />} Select Customers
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Checkbox id="only-docs" checked={onlyWithDocs} onCheckedChange={setOnlyWithDocs} />
            <label htmlFor="only-docs" className="text-sm text-slate-600">Only with documents</label>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowTypeManager(true)} size="sm" variant="default" className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-sm">
              <Settings className="w-4 h-4 mr-2" /> Manage Types
            </Button>
          )}
        </div>
      </div>

      {showCustomerSelector && (
        <div className="bg-white rounded-lg shadow border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Select customers to display:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-2">
            {sortedCustomers.map(c => (
              <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                <Checkbox checked={!hiddenCustomers.has(c.id)} onCheckedChange={() => toggleCustomerVisibility(c.id)} />
                <span className="text-sm text-slate-700 truncate flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" /> {getCustomerName(c)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-2">Document Expiry Status:</p>
            <div className="flex flex-wrap gap-4 text-xs text-blue-800">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Valid (60+ days)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span>Expires in 60 days</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Expires in 30 days or less</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-0">
                <TableHead className="px-2 py-1 text-left text-xs font-semibold text-slate-700 sticky left-0 bg-slate-50 z-20 w-[240px] h-8 border-r border-slate-200">Customer</TableHead>
                <TableHead className="px-2 py-1 text-center text-xs font-semibold text-slate-700 w-[80px] min-w-[80px] h-8">Complete</TableHead>
                {documentTypes.map(type => (
                  <TableHead key={type.id} className="px-2 py-1 text-center text-xs font-semibold text-slate-700 min-w-[120px] h-8">{type.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + documentTypes.length} className="h-24 text-center text-slate-500">No customers found.</TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer, rowIdx) => {
                  const custDocs = getCustomerDocuments(customer.id);
                  const completedTypes = new Set(custDocs.filter(d => (d.file_urls?.length || d.file_url || d.is_not_applicable)).map(d => d.document_type_id));
                  const completion = documentTypes.length ? Math.round((completedTypes.size / documentTypes.length) * 100) : 0;
                  return (
                    <TableRow key={customer.id} className={cn("border-b border-slate-100 hover:bg-slate-50 h-9", rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
                      <TableCell className="px-2 py-1 sticky left-0 z-10 bg-inherit border-r border-slate-100">
                        <div className="min-w-0">
                          <p className="font-medium text-xs text-slate-900 truncate">{getCustomerName(customer)}</p>
                          <p className="text-[10px] text-slate-500 truncate">{customer.email || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn("text-xs font-bold",
                            completion >= 100 ? 'text-green-600' : completion >= 75 ? 'text-blue-600' : completion >= 50 ? 'text-orange-600' : 'text-red-600')}>{completion}%</span>
                          <div className="w-10 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all",
                              completion >= 100 ? 'bg-green-500' : completion >= 75 ? 'bg-blue-500' : completion >= 50 ? 'bg-orange-500' : 'bg-red-500')} style={{ width: `${completion}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      {documentTypes.map(dt => {
                        const doc = custDocs.find(d => d.document_type_id === dt.id);
                        const fileCount = doc ? (doc.file_urls?.length || (doc.file_url ? 1 : 0)) : 0;
                        const expiry = doc?.expiry_date ? getExpiryStatus(doc.expiry_date) : null;
                        return (
                          <TableCell key={dt.id} className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1 h-full w-full min-h-[32px] group">
                              {doc?.is_not_applicable ? (
                                <div onClick={() => handleToggleNotApplicable(customer.id, dt.id, doc)} className="h-6 px-2 text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 hover:border-red-200 cursor-pointer rounded-md inline-flex items-center justify-center border border-slate-200 transition-colors group/na" title="Click to mark as required">
                                  <span className="group-hover/na:hidden">N/A</span>
                                  <span className="hidden group-hover/na:inline flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" />Required</span>
                                </div>
                              ) : fileCount > 0 ? (
                                <>
                                  {expiry && (<div className={cn("w-2 h-2 rounded-full", expiry.color === 'green' ? 'bg-green-500' : expiry.color === 'orange' ? 'bg-orange-500' : 'bg-red-500')} title={expiry.text} />)}
                                  <Button variant="outline" size="sm" onClick={() => handleViewDocuments(customer, dt)} className="h-6 px-2 text-[10px]">View ({fileCount})</Button>
                               {doc?.expiry_date && (
                                 <span className="text-[10px] text-slate-500 ml-1">{format(parseISO(doc.expiry_date), 'MMM d, yyyy')}</span>
                               )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 ml-1"><MoreHorizontal className="w-3 h-3" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => handleToggleNotApplicable(customer.id, dt.id, doc)}><Ban className="w-4 h-4 mr-2" />Mark as N/A</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleUploadDocument(customer.id, dt.id)} disabled={uploadingFor?.customerId === customer.id && uploadingFor?.typeId === dt.id} className="h-6 px-2 text-[10px]">{uploadingFor?.customerId === customer.id && uploadingFor?.typeId === dt.id ? (<Loader2 className="w-3 h-3 animate-spin" />) : (<Upload className="w-3 h-3" />)}</Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleToggleNotApplicable(customer.id, dt.id, doc)} className="h-6 w-6 p-0 text-slate-300 hover:text-slate-500" title="Mark as N/A"><Ban className="w-3 h-3" /></Button>
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

      <DocumentTypeManager isOpen={showTypeManager} onClose={() => setShowTypeManager(false)} onSuccess={loadData} showFoldersTab />

      {viewingDocs && (
        <DocumentViewer
          isOpen={!!viewingDocs}
          onClose={() => setViewingDocs(null)}
          title={`${getCustomerName(viewingDocs.customer)} - ${viewingDocs.type.name}`}
          documents={viewingDocs.files}
          onUpload={async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,application/pdf,.doc,.docx';
            input.onchange = async (e) => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;
              try {
                const uploads = await Promise.all(files.map(file => UploadPrivateFile({ file })));
                const uris = uploads.map(u => u.file_uri);
                const names = files.map(f => f.name);
                const anyDoc = documents.find(d => d.customer_id === viewingDocs.customer.id && d.document_type_id === viewingDocs.type.id);

                // Ask for expiry date (optional)
                const expiryInput = window.prompt('Fecha de expiración (YYYY-MM-DD) - opcional:', anyDoc?.expiry_date || '');
                const expiry_date = expiryInput && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? expiryInput : undefined;

                if (anyDoc) {
                  // AI fallback if no manual expiry
                  if (!expiry_date && uris[0]) {
                    try {
                      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uris[0] });
                      const ai = await base44.integrations.Core.ExtractDataFromUploadedFile({
                        file_url: signed_url,
                        json_schema: { type: 'object', properties: { expiry_date: { type: 'string' } } }
                      });
                      const out = ai?.output;
                      const aiDate = (Array.isArray(out) ? out[0]?.expiry_date : out?.expiry_date) || undefined;
                      if (aiDate) expiry_date = aiDate;
                    } catch (e) { console.warn('AI expiry extract failed', e); }
                  }

                  await CustomerDocument.update(anyDoc.id, {
                    file_urls: [...(anyDoc.file_urls || (anyDoc.file_url ? [anyDoc.file_url] : [])), ...uris],
                    file_names: [...(anyDoc.file_names || (anyDoc.file_name ? [anyDoc.file_name] : [])), ...names],
                    ...(expiry_date ? { expiry_date } : {}),
                    last_updated_date: new Date().toISOString()
                  });
                } else {
                  await CustomerDocument.create({
                    customer_id: viewingDocs.customer.id,
                    document_type_id: viewingDocs.type.id,
                    file_urls: uris,
                    file_names: names,
                    ...(expiry_date ? { expiry_date } : {}),
                    upload_date: new Date().toISOString(),
                    last_updated_date: new Date().toISOString()
                  });
                }
                const fresh = await CustomerDocument.list();
                setDocuments(fresh || []);
                const docsForViewer = fresh.filter(d => d.customer_id === viewingDocs.customer.id && d.document_type_id === viewingDocs.type.id);
                const filesNew = docsForViewer.flatMap(d => {
                  const urls = d.file_urls || (d.file_url ? [d.file_url] : []);
                  const nms = d.file_names || (d.file_name ? [d.file_name] : []);
                  return urls.map((url, idx) => ({ document_id: d.id, file_url: url, file_name: nms[idx] || `Document ${idx + 1}`, upload_date: d.upload_date, expiry_date: d.expiry_date }));
                });
                setViewingDocs(prev => ({ ...prev, files: filesNew }));
                toast.success(`${files.length} file(s) uploaded`);
              } catch (err) {
                console.error('Upload failed', err);
                toast.error('Failed to upload files');
              }
            };
            input.click();
          }}
          onRemove={handleRemoveDocument}
          onUpdate={handleUpdateDocument}
          canEdit={isAdmin}
        />
      )}
    </div>
  );
}