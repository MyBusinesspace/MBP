import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentViewer from '@/components/shared/DocumentViewer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Filter, FileText, Package, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useData } from '@/components/DataProvider';
import { EmployeeDocument, DocumentType, EmployeeDocumentType, Asset, User, Branch, Customer, Project, TimeEntry, CustomerDocument, ProjectDocument, AssetDocument, CustomerCategory, ProjectCategory, AssetCategory, ProjectDocumentType, AssetDocumentType } from '@/entities/all';

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return { color: null, text: 'No date' };
  const today = new Date();
  const exp = new Date(expiryDate);
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { color: 'red', text: 'Expired' };
  if (diff <= 30) return { color: 'red', text: `Expires in ${diff} days` };
  if (diff <= 60) return { color: 'orange', text: `Expires in ${diff} days` };
  return { color: 'green', text: 'Valid' };
}

export default function CustomReportExplorer() {
  const { currentBranch, loadProjects } = useData();
  const [mode, setMode] = useState('documents'); // 'documents' | 'employee_docs' | 'assets'
  const [loading, setLoading] = useState(true);

  // Common
  const [search, setSearch] = useState('');
  const searchActive = useMemo(() => (search.trim().length >= 2), [search]);
  const [exporting, setExporting] = useState(false);

  // Employee docs state
  const [docs, setDocs] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [users, setUsers] = useState([]);

  // Other matrices
  const [customerDocsMx, setCustomerDocsMx] = useState([]);
  const [projectDocsMx, setProjectDocsMx] = useState([]);
  const [assetDocsMx, setAssetDocsMx] = useState([]);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [assetCategoriesList, setAssetCategoriesList] = useState([]);
  const [projectDocTypes, setProjectDocTypes] = useState([]);
  const [assetDocTypes, setAssetDocTypes] = useState([]);
  const [employeeDocTypes, setEmployeeDocTypes] = useState([]);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDocs, setViewerDocs] = useState([]);
  const [viewerTitle, setViewerTitle] = useState('Document preview');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterExpiry, setFilterExpiry] = useState('all'); // all|expired|30|60|none
  const [filterUser, setFilterUser] = useState('all');

  // Assets state
  const [assets, setAssets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filterAssetCategory, setFilterAssetCategory] = useState('all');
  const [filterAssetStatus, setFilterAssetStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');

  // Si hay branch activo, usarlo por defecto
  useEffect(() => {
    if (currentBranch?.id) setFilterBranch(currentBranch.id);
  }, [currentBranch?.id]);

  // Cascade filters
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterWorkOrder, setFilterWorkOrder] = useState('all');
  const [filterEquipment, setFilterEquipment] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');

  // Unified finder controls
  const [documentSource, setDocumentSource] = useState('client'); // client | project | asset | user
  const [sourceId, setSourceId] = useState('all');
  const [sourceCategory, setSourceCategory] = useState('all');
  const [sourceStatus, setSourceStatus] = useState('all');
  const [sourceDocType, setSourceDocType] = useState('all');

  // Resets en cascada
  useEffect(() => {
    setFilterProject('all');
    setFilterWorkOrder('all');
    setFilterEquipment('all');
    setFilterEmployee('all');
  }, [filterCustomer]);

  useEffect(() => {
    setFilterWorkOrder('all');
    setFilterEquipment('all');
    setFilterEmployee('all');
  }, [filterProject]);

  useEffect(() => {
    setFilterEquipment('all');
    setFilterEmployee('all');
  }, [filterWorkOrder]);

  // Cambiar pestaña: limpiar filtros y búsqueda
  useEffect(() => {
    setSearch('');
    setSelectedDocs({});
    setFilterCustomer('all');
    setFilterProject('all');
    setFilterWorkOrder('all');
    setFilterEquipment('all');
    setFilterEmployee('all');
    setFilterDocType('all');
    setFilterUser('all');
    setFilterExpiry('all');
  }, [mode]);

  // Data for cascade
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [docsData, typesData, usersData, assetsData, branchesData, customersData, projectsData, workOrdersData, customerDocsData, projectDocsData, assetDocsData, customerCats, projectCats, assetCats, projTypes, asstTypes, empTypes] = await Promise.all([
        EmployeeDocument.list('-updated_date', 5000).catch(() => []),
        DocumentType.list('sort_order', 1000).catch(() => []),
        User.list('full_name', 1000).catch(() => []),
        Asset.list('-updated_date', 2000).catch(() => []),
        Branch.list('name', 200).catch(() => []),
        Customer.list('name', 1000).catch(() => []),
        loadProjects(true).catch(() => []),
        TimeEntry.list('-updated_date', 3000).catch(() => []),
        CustomerDocument.list('-updated_date', 5000).catch(() => []),
        ProjectDocument.list('-updated_date', 5000).catch(() => []),
        AssetDocument.list('-updated_date', 5000).catch(() => []),
        CustomerCategory.list('sort_order', 1000).catch(() => []),
        ProjectCategory.list('sort_order', 1000).catch(() => []),
        AssetCategory.list('sort_order', 1000).catch(() => []),
        ProjectDocumentType.list('sort_order', 1000).catch(() => []),
        AssetDocumentType.list('sort_order', 1000).catch(() => []),
        EmployeeDocumentType.list('sort_order', 1000).catch(() => []),
      ]);
      setDocs(Array.isArray(docsData) ? docsData : []);
      setDocTypes(Array.isArray(typesData) ? typesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setWorkOrders(Array.isArray(workOrdersData) ? workOrdersData : []);
      setCustomerDocsMx(Array.isArray(customerDocsData) ? customerDocsData : []);
      setProjectDocsMx(Array.isArray(projectDocsData) ? projectDocsData : []);
      setAssetDocsMx(Array.isArray(assetDocsData) ? assetDocsData : []);
      setCustomerCategories(Array.isArray(customerCats) ? customerCats : []);
      setProjectCategories(Array.isArray(projectCats) ? projectCats : []);
      setAssetCategoriesList(Array.isArray(assetCats) ? assetCats : []);
      setProjectDocTypes(Array.isArray(projTypes) ? projTypes : []);
      setAssetDocTypes(Array.isArray(asstTypes) ? asstTypes : []);
      setEmployeeDocTypes(Array.isArray(empTypes) ? empTypes : []);
    } catch (e) {
      console.error('Failed to load custom report data', e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const filteredEmployeeDocs = useMemo(() => {
    if (mode !== 'employee_docs') return [];
    return docs.filter((d) => {
      if (filterDocType !== 'all' && d.document_type_id !== filterDocType) return false;
      if (filterUser !== 'all' && d.employee_id !== filterUser) return false;

      // Expiry filter
      if (filterExpiry !== 'all') {
        const status = getExpiryStatus(d.expiry_date);
        if (filterExpiry === 'expired' && status.text !== 'Expired') return false;
        if (filterExpiry === '30') {
          if (!d.expiry_date) return false;
          const days = Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
          if (!(days >= 0 && days <= 30)) return false;
        }
        if (filterExpiry === '60') {
          if (!d.expiry_date) return false;
          const days = Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
          if (!(days > 30 && days <= 60)) return false;
        }
        if (filterExpiry === 'none' && !!d.expiry_date) return false;
      }

      // Search (mínimo 2 letras)
      if (searchActive) {
        const user = users.find((u) => u.id === d.employee_id);
        const type = docTypes.find((t) => t.id === d.document_type_id);
        const s = search.toLowerCase();
        const userName = (user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}` || '').toLowerCase();
        if (!userName.includes(s) && !(type?.name || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [mode, docs, filterDocType, filterUser, filterExpiry, searchActive, search, users, docTypes]);

  const assetCategories = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.category || 'Other')));
  }, [assets]);

  const sourceLabel = useMemo(() => ({ client: 'Client', project: 'Project', asset: 'Asset', user: 'User' }[documentSource]), [documentSource]);

  const currentCategoryOptions = useMemo(() => {
    if (documentSource === 'client') return customerCategories;
    if (documentSource === 'project') return projectCategories;
    if (documentSource === 'asset') return assetCategoriesList.length ? assetCategoriesList : assetCategories.map((n) => ({ id: n, name: n }));
    return [];
  }, [documentSource, customerCategories, projectCategories, assetCategoriesList, assetCategories]);

  const currentStatusOptions = useMemo(() => {
    if (documentSource === 'client') return ['all', 'active', 'archived'];
    if (documentSource === 'project') return ['all', 'active', 'on_hold', 'closed', 'archived'];
    if (documentSource === 'asset') return ['all', 'Available', 'In Use', 'Maintenance', 'Decommissioned', 'On Rent'];
    return ['all', 'admin', 'user'];
  }, [documentSource]);

  const currentDocTypeOptions = useMemo(() => {
    if (documentSource === 'client') return docTypes;
    if (documentSource === 'project') return projectDocTypes;
    if (documentSource === 'asset') return assetDocTypes;
    if (documentSource === 'user') return employeeDocTypes;
    return [];
  }, [documentSource, docTypes, projectDocTypes, assetDocTypes, employeeDocTypes]);

  // Cascading options
  const projectsForSelect = useMemo(() => {
    return projects.filter(p => filterCustomer === 'all' || p.customer_id === filterCustomer);
  }, [projects, filterCustomer]);







  const workOrdersForSelect = useMemo(() => {
    return workOrders.filter(w => filterProject === 'all' || w.project_id === filterProject);
  }, [workOrders, filterProject]);

  const equipmentsForSelect = useMemo(() => {
    if (filterWorkOrder === 'all') return [];
    const wo = workOrders.find(w => w.id === filterWorkOrder);
    const ids = [...(wo?.equipment_ids || []), ...(wo?.equipment_id ? [wo.equipment_id] : [])];
    return assets.filter(a => ids.includes(a.id));
  }, [workOrders, filterWorkOrder, assets]);

  const employeesForSelect = useMemo(() => {
    if (filterWorkOrder === 'all') return [];
    const wo = workOrders.find(w => w.id === filterWorkOrder);
    const ids = [...(wo?.employee_ids || []), ...(wo?.employee_id ? [wo.employee_id] : [])];
    return users.filter(u => ids.includes(u.id));
  }, [workOrders, filterWorkOrder, users]);

  // Documents aggregated per cascade selection
  const documentsList = useMemo(() => {
    const items = [];

    const addItem = (url, name, sourceType, sourceName, meta = {}) => {
      if (!url) return;
      items.push({ url, name: name || '', sourceType, sourceName, meta });
    };

    const docTypeFilter = (docTypeId) => (sourceDocType === 'all' ? true : docTypeId === sourceDocType);

    if (documentSource === 'client') {
      const pool = (sourceId === 'all' ? customers : customers.filter(c => c.id === sourceId)).filter(c => {
        if (sourceCategory !== 'all' && !(c.category_ids || []).includes(sourceCategory)) return false;
        if (sourceStatus !== 'all') {
          const active = !c.archived;
          if (sourceStatus === 'active' && !active) return false;
          if (sourceStatus === 'archived' && active) return false;
        }
        return true;
      });
      pool.forEach((cust) => {
        if (sourceDocType === 'all') {
          (cust?.attached_documents || []).forEach(d => addItem(d.url, d.name, 'Customer', cust?.name || ''));
        }
        customerDocsMx.filter(cd => cd.customer_id === cust.id && docTypeFilter(cd.document_type_id)).forEach(cd => {
          const urls = Array.isArray(cd.file_urls) ? cd.file_urls : (cd.file_url ? [cd.file_url] : []);
          const names = Array.isArray(cd.file_names) ? cd.file_names : [];
          urls.forEach((u, idx) => addItem(u, names[idx] || '', 'Customer', cust?.name || '', { docTypeId: cd.document_type_id }));
        });
      });
    }

    if (documentSource === 'project') {
      const pool = (sourceId === 'all' ? projects : projects.filter(p => p.id === sourceId)).filter(p => {
        if (sourceCategory !== 'all' && !(p.category_ids || []).includes(sourceCategory)) return false;
        if (sourceStatus !== 'all' && (p.status || 'active') !== sourceStatus) return false;
        return true;
      });
      pool.forEach((proj) => {
        if (sourceDocType === 'all') {
          (proj?.attached_documents || []).forEach(d => addItem(d.url, d.name, 'Project', proj?.name || ''));
        }
        projectDocsMx.filter(pd => pd.project_id === proj.id && docTypeFilter(pd.document_type_id)).forEach(pd => {
          const urls = Array.isArray(pd.file_urls) ? pd.file_urls : (pd.file_url ? [pd.file_url] : []);
          const names = Array.isArray(pd.file_names) ? pd.file_names : [];
          urls.forEach((u, idx) => addItem(u, names[idx] || '', 'Project', proj?.name || '', { docTypeId: pd.document_type_id }));
        });
      });
    }

    if (documentSource === 'asset') {
      const pool = (sourceId === 'all' ? assets : assets.filter(a => a.id === sourceId)).filter(a => {
        if (sourceCategory !== 'all' && !((a.category || '') === sourceCategory || a.category_id === sourceCategory)) return false;
        if (sourceStatus !== 'all' && (a.status || 'Available') !== sourceStatus) return false;
        return true;
      });
      pool.forEach((eq) => {
        if (sourceDocType === 'all') {
          (eq?.attached_documents || []).forEach(d => addItem(d.url, d.name, 'Asset', eq?.name || ''));
        }
        assetDocsMx.filter(ad => ad.owner_type === 'asset' && ad.owner_id === eq.id && docTypeFilter(ad.document_type_id)).forEach(ad => {
          const urls = Array.isArray(ad.file_urls) ? ad.file_urls : [];
          const names = Array.isArray(ad.file_names) ? ad.file_names : [];
          urls.forEach((u, idx) => addItem(u, names[idx] || '', 'Asset', eq?.name || '', { docTypeId: ad.document_type_id }));
        });
      });
    }

    if (documentSource === 'user') {
      const pool = (sourceId === 'all' ? users : users.filter(u => u.id === sourceId)).filter(u => {
        if (sourceStatus !== 'all' && (u.role || 'user') !== sourceStatus) return false;
        return true;
      });
      pool.forEach((u) => {
        const empDocs = docs.filter(d => d.employee_id === u.id && (sourceDocType === 'all' || d.document_type_id === sourceDocType));
        empDocs.forEach(doc => {
          const urls = doc.file_urls?.length ? doc.file_urls : (doc.file_url ? [doc.file_url] : []);
          const names = Array.isArray(doc.file_names) ? doc.file_names : [];
          urls.forEach((url, idx) => addItem(url, names[idx] || '', 'Employee', (u.nickname || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`)));
        });
      });
    }

    return items;
  }, [documentSource, sourceId, sourceCategory, sourceStatus, sourceDocType, customers, projects, assets, users, customerDocsMx, projectDocsMx, assetDocsMx, docs]);

  const displayedDocuments = useMemo(() => {
    if (!searchActive) return documentsList;
    const s = search.toLowerCase();
    return documentsList.filter(d => 
      (d.name || '').toLowerCase().includes(s) ||
      (d.sourceName || '').toLowerCase().includes(s) ||
      (d.sourceType || '').toLowerCase().includes(s)
    );
  }, [documentsList, searchActive, search]);

  const [selectedDocs, setSelectedDocs] = useState({});
  const allSelected = useMemo(() => documentsList.length > 0 && documentsList.every(d => selectedDocs[d.url]), [documentsList, selectedDocs]);

  const filteredAssets = useMemo(() => {
    if (mode !== 'assets') return [];
    return assets.filter((a) => {
      if (filterAssetCategory !== 'all' && (a.category || 'Other') !== filterAssetCategory) return false;
      if (filterAssetStatus !== 'all' && (a.status || 'Available') !== filterAssetStatus) return false;
      const branchId = currentBranch?.id || filterBranch;
      if (branchId && branchId !== 'all' && a.branch_id !== branchId) return false;
      if (searchActive) {
        const s = search.toLowerCase();
        const name = (a.name || '').toLowerCase();
        if (!name.includes(s)) return false;
      }
      return true;
    });
  }, [mode, assets, filterAssetCategory, filterAssetStatus, filterBranch, currentBranch, searchActive, search]);

  const exportCSV = async () => {
    try {
      setExporting(true);
      let headers = [];
      let rows = [];

      if (mode === 'employee_docs') {
        headers = ['Employee', 'Email', 'Document type', 'Files', 'Expires', 'Status'];
        rows = filteredEmployeeDocs.map((d) => {
          const user = users.find((u) => u.id === d.employee_id);
          const type = docTypes.find((t) => t.id === d.document_type_id);
          const status = getExpiryStatus(d.expiry_date).text;
          const filesCount = d.file_urls?.length || (d.file_url ? 1 : 0) || 0;
          const name = user ? (user.nickname || user.full_name || `${user.first_name || ''} ${user.last_name || ''}`) : '-';
          return [name, user?.email || '-', type?.name || '-', filesCount, d.expiry_date || '-', status];
        });
      } else {
        headers = ['Name', 'Category', 'Status', 'Company', 'Purchase', 'Purchase cost'];
        rows = filteredAssets.map((a) => {
          const branch = branches.find((b) => b.id === a.branch_id);
          return [a.name || '-', a.category || '-', a.status || '-', branch?.name || '-', a.purchase_date || '-', a.purchase_cost ?? 0];
        });
      }

      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mode === 'employee_docs' ? 'employee-documents' : 'assets'}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDocs({});
    } else {
      const next = {};
      documentsList.forEach(d => next[d.url] = true);
      setSelectedDocs(next);
    }
  };

  const exportZIP = async () => {
    const items = documentsList.filter(d => selectedDocs[d.url]).map(d => ({ url: d.url, name: d.name }));
    if (!items.length) {
      toast.error('Select at least one document');
      return;
    }
    const file_uris = items.map(i => i.url);
    const file_names = items.map(i => i.name || (i.url?.split('/')?.pop() || 'file'));
    const res = await base44.functions.invoke('exportDocumentsZip', { file_uris, file_names });
    const blob = new Blob([res.data], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documents.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getSignedUrlIfNeeded = async (url) => {
    if (url?.startsWith('private/')) {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: url, expires_in: 300 });
      return signed_url;
    }
    return url;
  };

  const viewOne = async (url, name) => {
    const finalUrl = await getSignedUrlIfNeeded(url);
    setViewerDocs([{ file_url: finalUrl, file_name: name || (url?.split('/')?.pop() || 'document') }]);
    setViewerTitle(name || 'Document');
    setViewerOpen(true);
  };

  const downloadOne = async (url, name) => {
    const finalUrl = await getSignedUrlIfNeeded(url);
    const a = document.createElement('a');
    a.href = finalUrl;
    a.download = name || (url?.split('/')?.pop() || 'document');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSelectedZip = async () => {
    if (downloadingZip) { toast.info('Download already in progress'); return; }
    const items = documentsList.filter(d => selectedDocs[d.url]).map(d => ({ url: d.url, name: d.name }));
    if (!items.length) { toast.error('Select at least one document'); return; }
    try {
      setDownloadingZip(true);
      toast.success('ZIP download started');
      const file_uris = items.map(i => i.url);
      const file_names = items.map(i => i.name || (i.url?.split('/')?.pop() || 'file'));
      const res = await base44.functions.invoke('exportDocumentsZip', { file_uris, file_names });
      const contentType = res?.headers?.['content-type'] || res?.headers?.get?.('content-type') || '';
      if (!contentType.includes('application/zip')) {
        toast.error('ZIP generation failed');
        return;
      }
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documents.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingZip(false);
    }
  };

  const downloadSelectedMergedPDF = async () => {
    if (downloadingPdf) { toast.info('Download already in progress'); return; }
    const urls = documentsList.filter(d => selectedDocs[d.url]).map(d => d.url);
    if (!urls.length) { toast.error('Select at least one document'); return; }
    try {
      setDownloadingPdf(true);
      toast.success('PDF download started');
      const res = await base44.functions.invoke('mergeDocumentsPdf', { file_uris: urls });
      const contentType = res?.headers?.['content-type'] || res?.headers?.get?.('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        toast.error('Merged PDF could not be created');
        return;
      }
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documents.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" /> Document Finder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-end flex-nowrap overflow-x-auto">
            <div className="shrink-0 w-56">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-2">Document Source {mode==='documents' && (<span className="text-[11px] text-slate-500 hidden md:inline">(Client / Project / Asset / User)</span>)}</label>
              {mode === 'documents' ? (
                <Select value={documentSource} onValueChange={setDocumentSource}>
                  <SelectTrigger className="h-8">
                    <SelectValue>{sourceLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="h-8">
                    <SelectValue>{mode==='documents' ? 'Documents' : mode==='employee_docs' ? 'Employee documents' : 'Assets'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documents"><div className="flex items-center gap-2"><FileText className="w-4 h-4"/> Documents</div></SelectItem>
                    <SelectItem value="employee_docs"><div className="flex items-center gap-2"><FileText className="w-4 h-4"/> Employee documents</div></SelectItem>
                    <SelectItem value="assets"><div className="flex items-center gap-2"><Package className="w-4 h-4"/> Assets</div></SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="shrink-0 w-80">
              <label className="text-xs font-medium text-slate-600">Search (min. 2 letters)</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={mode==='employee_docs' ? 'Employee or document type...' : (mode==='assets' ? 'Search asset...' : 'Search document...')} className="h-8" />
            </div>

            <div>
              <Button onClick={exportCSV} size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700">
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Download className="w-4 h-4 mr-2"/>}
                Export CSV
              </Button>
            </div>
          </div>

          {mode === 'documents' ? (
            <div className="flex gap-2 items-end flex-nowrap overflow-x-auto">
              <div className="shrink-0 w-60">
                <label className="text-xs font-medium text-slate-600">{sourceLabel}</label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger className="h-8"><SelectValue placeholder={`Select ${sourceLabel.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {documentSource === 'client' && customers.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    {documentSource === 'project' && projectsForDropdown.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                    {documentSource === 'asset' && assets.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    {documentSource === 'user' && users.map(u => (<SelectItem key={u.id} value={u.id}>{u.nickname || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="shrink-0 w-56">
                <label className="text-xs font-medium text-slate-600">Select category</label>
                <Select value={sourceCategory} onValueChange={setSourceCategory}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {currentCategoryOptions.map((c) => (
                      <SelectItem key={c.id || c.name} value={c.id || c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="shrink-0 w-48">
                <label className="text-xs font-medium text-slate-600">Select status</label>
                <Select value={sourceStatus} onValueChange={setSourceStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currentStatusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s === 'all' ? 'All' : s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="shrink-0 w-60">
                <label className="text-xs font-medium text-slate-600">Select document type</label>
                <Select value={sourceDocType} onValueChange={setSourceDocType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {currentDocTypeOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : mode === 'employee_docs' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-slate-600">Document type</label>
                <Select value={filterDocType} onValueChange={setFilterDocType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {docTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Employee</label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nickname || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Expiry</label>
                <Select value={filterExpiry} onValueChange={setFilterExpiry}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="30">Expiring in 30 days</SelectItem>
                    <SelectItem value="60">Expiring in 60 days</SelectItem>
                    <SelectItem value="none">No date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Category</label>
                <Select value={filterAssetCategory} onValueChange={setFilterAssetCategory}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {assetCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Status</label>
                <Select value={filterAssetStatus} onValueChange={setFilterAssetStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['all','Available','In Use','Maintenance','Decommissioned','On Rent'].map((s) => (
                      <SelectItem key={s} value={s}>{s === 'all' ? 'All' : s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!currentBranch?.id && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Company</label>
                  <Select value={filterBranch} onValueChange={setFilterBranch}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Results</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[320px]">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400"/></div>
          ) : mode === 'documents' ? (
            <div className="overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    Select all
                  </label>
                  <span className="text-slate-500">{displayedDocuments.length} documents</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={downloadSelectedZip} disabled={downloadingZip}>
                    {downloadingZip ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Download className="w-4 h-4 mr-2"/>}
                    {downloadingZip ? 'Preparing ZIP...' : 'Download selected (ZIP)'}
                  </Button>
                  <Button size="sm" onClick={downloadSelectedMergedPDF} className="bg-indigo-600 hover:bg-indigo-700" disabled={downloadingPdf}>
                    {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Download className="w-4 h-4 mr-2"/>}
                    {downloadingPdf ? 'Merging...' : 'Download 1 PDF'}
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Document Source</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-20">View</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedDocuments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No results</TableCell></TableRow>
                  ) : (
                    displayedDocuments.map((d, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <input type="checkbox" checked={!!selectedDocs[d.url]} onChange={(e) => setSelectedDocs(prev => ({ ...prev, [d.url]: e.target.checked }))} />
                        </TableCell>
                        <TableCell>{d.sourceType} · {d.sourceName}</TableCell>
                        <TableCell>{d.name || '-'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => viewOne(d.url, d.name)}>View</Button>
                        </TableCell>
                        <TableCell className="space-x-1">
                          <Button size="sm" variant="outline" onClick={() => downloadOne(d.url, d.name)}><Download className="w-4 h-4 mr-1"/>Download</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : mode === 'employee_docs' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Files</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployeeDocs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No results</TableCell></TableRow>
                  ) : (
                    filteredEmployeeDocs.map((d) => {
                      const user = users.find((u) => u.id === d.employee_id);
                      const type = docTypes.find((t) => t.id === d.document_type_id);
                      const status = getExpiryStatus(d.expiry_date);
                      const filesCount = d.file_urls?.length || (d.file_url ? 1 : 0) || 0;
                      const name = user ? (user.nickname || user.full_name || `${user.first_name || ''} ${user.last_name || ''}`) : '-';
                      return (
                        <TableRow key={d.id}>
                          <TableCell>{name}</TableCell>
                          <TableCell>{type?.name || '-'}</TableCell>
                          <TableCell className="text-center">{filesCount}</TableCell>
                          <TableCell>{d.expiry_date || '-'}</TableCell>
                          <TableCell>
                            <span className={
                              status.color === 'green' ? 'text-green-600' : status.color === 'orange' ? 'text-amber-600' : 'text-red-600'
                            }>{status.text}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Purchase</TableHead>
                    <TableHead className="text-right">Purchase cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No results</TableCell></TableRow>
                  ) : (
                    filteredAssets.map((a) => {
                      const branch = branches.find((b) => b.id === a.branch_id);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.name}</TableCell>
                          <TableCell>{a.category || '-'}</TableCell>
                          <TableCell>{a.status || '-'}</TableCell>
                          <TableCell>{branch?.name || '-'}</TableCell>
                          <TableCell>{a.purchase_date || '-'}</TableCell>
                          <TableCell className="text-right">{(a.purchase_cost ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        title={viewerTitle}
        documents={viewerDocs}
        canEdit={false}
        departmentName=""
        
        showOpenInNewTab={false}
      />
    </div>
  );
}