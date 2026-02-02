import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Filter, ChevronRight, Building2, FolderOpen, ClipboardList, Wrench, User, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useData } from '@/components/DataProvider';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const ENTITY_TYPES = [
  { id: 'all', name: 'All', icon: Search },
  { id: 'customers', name: 'Clients', icon: Building2 },
  { id: 'projects', name: 'Projects', icon: FolderOpen },
  { id: 'work_orders', name: 'Work Orders', icon: ClipboardList },
  { id: 'contacts', name: 'Contacts', icon: User },
  { id: 'assets', name: 'Assets', icon: Wrench },
];

// Fuzzy/partial match function - searches anywhere in text
const fuzzyMatch = (text, searchQuery) => {
  if (!text || !searchQuery) return false;
  const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedQuery = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // Check if query appears anywhere in the text
  return normalizedText.includes(normalizedQuery);
};

export default function GlobalSearch({ isOpen, onClose }) {
  const { 
    loadCustomers,
    loadProjects,
    loadAssets,
  } = useData();
  
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState({});
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchData, setSearchData] = useState({
    customers: [],
    projects: [],
    assets: [],
    contacts: [],
    workOrders: [],
    docTypes: [],
    customerDocs: []
  });
  const inputRef = useRef(null);

  // Debug de apertura/cierre
  useEffect(() => {
    console.log('🟩 [GlobalSearch] isOpen =>', isOpen);
  }, [isOpen]);

  // Load data whenever the search opens
  useEffect(() => {
    if (!isOpen) return;
    console.log('🟩 [GlobalSearch] iniciando carga de datos');
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [customersData, projectsData, assetsData] = await Promise.all([
          loadCustomers(),
          loadProjects(),
          loadAssets()
        ]);
        
        // Load contacts, work orders, doc types, and customer docs via SDK (safe when entity missing)
        const contactsPromise = base44.entities.Contact ? base44.entities.Contact.list('-updated_date', 500).catch(() => []) : Promise.resolve([]);
        const workOrdersPromise = base44.entities.TimeEntry ? base44.entities.TimeEntry.list('-updated_date', 200).catch(() => []) : Promise.resolve([]);
        const docTypesPromise = base44.entities.DocumentType ? base44.entities.DocumentType.list('sort_order', 1000).catch(() => []) : Promise.resolve([]);
        const customerDocsPromise = base44.entities.CustomerDocument ? base44.entities.CustomerDocument.list('-updated_date', 5000).catch(() => []) : Promise.resolve([]);

        const [contactsData, workOrdersData, docTypesData, customerDocsData] = await Promise.all([
          contactsPromise,
          workOrdersPromise,
          docTypesPromise,
          customerDocsPromise,
        ]);
        if (!Array.isArray(customersData) && customersData) console.warn('customersData not array');
        if (!Array.isArray(projectsData) && projectsData) console.warn('projectsData not array');
        if (!Array.isArray(assetsData) && assetsData) console.warn('assetsData not array');
        
        console.log('🟩 [GlobalSearch] datos cargados', {
          customers: (customersData || []).length,
          projects: (projectsData || []).length,
          assets: (assetsData || []).length,
          contacts: (contactsData || []).length,
          workOrders: (workOrdersData || []).length,
          docTypes: (docTypesData || []).length,
          customerDocs: (customerDocsData || []).length,
        });
        setSearchData({
          customers: Array.isArray(customersData) ? customersData : [],
          projects: Array.isArray(projectsData) ? projectsData : [],
          assets: Array.isArray(assetsData) ? assetsData : [],
          contacts: Array.isArray(contactsData) ? contactsData : [],
          workOrders: Array.isArray(workOrdersData) ? workOrdersData : [],
          docTypes: Array.isArray(docTypesData) ? docTypesData : [],
          customerDocs: Array.isArray(customerDocsData) ? customerDocsData : []
        });
      } catch (error) {
        console.error('Failed to load search data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isOpen, loadCustomers, loadProjects, loadAssets]);

  // Live update doc types and customer documents when edited/added
          useEffect(() => {
            if (!isOpen) return;
            let unsubDocTypes = () => {};
            let unsubCustomerDocs = () => {};
            try {
              const hasDocType = base44?.entities?.DocumentType;
              const canSubscribeDocType = hasDocType && typeof hasDocType.subscribe === 'function';
              if (canSubscribeDocType) {
                unsubDocTypes = hasDocType.subscribe(async () => {
                  try {
                    const types = await hasDocType.list('sort_order', 1000);
                    setSearchData(prev => ({ ...prev, docTypes: Array.isArray(types) ? types : [] }));
                  } catch (e) {
                    console.error('Failed to refresh doc types', e);
                  }
                });
              } else {
                console.warn('DocumentType.subscribe not available, live updates disabled');
              }
            } catch (e) {
              console.warn('DocTypes subscription setup failed', e);
            }
            try {
              const hasCustomerDoc = base44?.entities?.CustomerDocument;
              const canSubscribeCustomerDoc = hasCustomerDoc && typeof hasCustomerDoc.subscribe === 'function';
              if (canSubscribeCustomerDoc) {
                unsubCustomerDocs = hasCustomerDoc.subscribe(async () => {
                  try {
                    const docs = await hasCustomerDoc.list('-updated_date', 5000);
                    setSearchData(prev => ({ ...prev, customerDocs: Array.isArray(docs) ? docs : [] }));
                  } catch (e) {
                    console.error('Failed to refresh customer docs', e);
                  }
                });
              } else {
                console.warn('CustomerDocument.subscribe not available, live updates disabled');
              }
            } catch (e) {
              console.warn('CustomerDocs subscription setup failed', e);
            }
            return () => {
              try { unsubDocTypes && unsubDocTypes(); } catch {}
              try { unsubCustomerDocs && unsubCustomerDocs(); } catch {}
            };
          }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Compute first result URL for Enter key navigation
  const getFirstResultUrl = () => {
    try { console.log('🟩 [GlobalSearch] getFirstResultUrl()', { keys: Object.keys(results || {}), filter }); } catch {}
    if (!results) return null;
    const r = results;
    const priority = filter === 'all' ? ['customers','projects','documents','work_orders','contacts','assets'] : [filter];
    for (const key of priority) {
      const arr = Array.isArray(r[key]) ? r[key] : [];
      if (arr.length === 0) continue;
      const item = arr[0];
      if (key === 'customers') return createPageUrl('clients') + `?id=${item.id}`;
      if (key === 'projects') return createPageUrl('projects') + `?id=${item.id}`;
      if (key === 'documents') {
        return item.kind === 'project_doc'
          ? createPageUrl('projects') + `?id=${item.parentId}`
          : createPageUrl('clients') + `?id=${item.parentId}&tab=documents`;
      }
      if (key === 'work_orders') return createPageUrl('work-orders');
      if (key === 'contacts') return createPageUrl('contacts');
      if (key === 'assets') return createPageUrl('documents') + `?tab=asset&asset_id=${item.id}`;
    }
    return null;
  };

  // Keyboard handling: prevent browser find, handle Enter to open top result
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const url = getFirstResultUrl();
      if (url) {
        console.log('🟩 [GlobalSearch] Enter → navegar a', url);
        handleClose();
        window.location.href = url;
      } else {
        console.warn('🟨 [GlobalSearch] Enter pulsado pero sin resultados / URL');
      }
    }
  };

  useEffect(() => {
    const searchQuery = query.trim();
    
    if (searchQuery.length < 2) {
      console.log('🟩 [GlobalSearch] query demasiado corto (<2):', searchQuery);
      setResults({});
      return;
    }
    // Extra guard: evita crashear si searchData aún no está listo
    if (!searchData || typeof searchData !== 'object') {
      console.warn('🟨 [GlobalSearch] searchData no listo');
      return;
    }

    const { customers, projects, assets, contacts, workOrders, docTypes, customerDocs } = searchData;
    const newResults = {};

    // Search Customers with fuzzy match
    if (filter === 'all' || filter === 'customers') {
      const customerResults = (customers || []).filter(c => 
        fuzzyMatch(c.name, searchQuery) ||
        fuzzyMatch(c.contact_person, searchQuery) ||
        fuzzyMatch(c.email, searchQuery)
      ).slice(0, 5);
      if (customerResults.length > 0) {
        newResults.customers = customerResults;
      }
    }

    // Search Projects with fuzzy match
    if (filter === 'all' || filter === 'projects') {
      const projectResults = (projects || []).filter(p => 
        fuzzyMatch(p.name, searchQuery) ||
        fuzzyMatch(p.description, searchQuery) ||
        fuzzyMatch(p.location_name, searchQuery)
      ).slice(0, 5);
      if (projectResults.length > 0) {
        newResults.projects = projectResults;
      }
    }

    // Search Assets with fuzzy match
    if (filter === 'all' || filter === 'assets') {
      const assetResults = (assets || []).filter(a => 
        fuzzyMatch(a.name, searchQuery) ||
        fuzzyMatch(a.identifier, searchQuery) ||
        fuzzyMatch(a.category, searchQuery) ||
        fuzzyMatch(a.plate_number, searchQuery)
      ).slice(0, 5);
      if (assetResults.length > 0) {
        newResults.assets = assetResults;
      }
    }

    // Search Documents (Clients/Projects) by file name and type
    if (filter === 'all') {
      const matches = [];

      // CustomerDocument entity (with type + filenames)
      (customerDocs || []).forEach(doc => {
        const typeName = (docTypes || []).find(t => t.id === doc.document_type_id)?.name || '';
        const customer = (customers || []).find(c => c.id === doc.customer_id);
        const fileNames = Array.isArray(doc.file_names) ? doc.file_names : (doc.file_name ? [doc.file_name] : []);
        const fileUrls = Array.isArray(doc.file_urls) ? doc.file_urls : (doc.file_url ? [doc.file_url] : []);
        fileNames.forEach((fn, idx) => {
          if (fuzzyMatch(fn, searchQuery) || fuzzyMatch(typeName, searchQuery)) {
            matches.push({ kind: 'client_doc', fileName: fn || 'Document', fileUrl: fileUrls[idx], typeName, parentName: customer?.name || 'Client', parentId: customer?.id });
          }
        });
      });

      // Legacy customer attached_documents
      (customers || []).forEach(c => {
        (c.attached_documents || []).forEach(d => {
          if (fuzzyMatch(d.name, searchQuery)) {
            matches.push({ kind: 'client_doc_legacy', fileName: d.name, fileUrl: d.url, typeName: '', parentName: c.name, parentId: c.id });
          }
        });
      });

      // Project attached_documents
      (projects || []).forEach(p => {
        (p.attached_documents || []).forEach(d => {
          if (fuzzyMatch(d.name, searchQuery)) {
            matches.push({ kind: 'project_doc', fileName: d.name, fileUrl: d.url, typeName: '', parentName: p.name, parentId: p.id });
          }
        });
      });

      if (matches.length > 0) {
        newResults.documents = matches.slice(0, 8);
      }
    }

    // Search Contacts with fuzzy match
    if (filter === 'all' || filter === 'contacts') {
      const contactResults = (contacts || []).filter(c => 
        fuzzyMatch(c.name, searchQuery) ||
        fuzzyMatch(c.company, searchQuery) ||
        fuzzyMatch(c.email, searchQuery) ||
        fuzzyMatch(c.phone, searchQuery)
      ).slice(0, 5);
      if (contactResults.length > 0) {
        newResults.contacts = contactResults;
      }
    }

    // Search Work Orders with fuzzy match
    if (filter === 'all' || filter === 'work_orders') {
      const woResults = (workOrders || []).filter(wo => 
        fuzzyMatch(wo.work_order_number, searchQuery) ||
        fuzzyMatch(wo.title, searchQuery) ||
        fuzzyMatch(wo.work_notes, searchQuery)
      ).slice(0, 5);
      if (woResults.length > 0) {
        newResults.work_orders = woResults;
      }
    }

    setResults(newResults);
    try {
      console.log('🟩 [GlobalSearch] resultados calculados', {
        query: searchQuery,
        counts: {
          customers: newResults.customers?.length || 0,
          projects: newResults.projects?.length || 0,
          documents: newResults.documents?.length || 0,
          work_orders: newResults.work_orders?.length || 0,
          contacts: newResults.contacts?.length || 0,
          assets: newResults.assets?.length || 0,
        }
      });
    } catch (e) { console.warn('🟨 [GlobalSearch] log resultados error', e); }
  }, [query, filter, searchData]);

  const totalResults = useMemo(() => {
    const vals = Object.values(results || {});
    return vals.reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
  }, [results]);

  const handleClose = () => {
    console.log('🟩 [GlobalSearch] cerrar buscador');
    setQuery('');
    setResults({});
    setShowFilterPopover(false);
    try { inputRef.current?.blur?.(); } catch {}
    onClose();
  };

  const handleResultClick = () => {
    handleClose();
  };

  const currentFilter = ENTITY_TYPES.find(e => e.id === filter);

  if (!isOpen) return null; // 🟩 [GlobalSearch] render modal
  // Guard extra: nunca renderizar sin DataProvider
  if (typeof window === 'undefined') return null;

  return (
    <div 
      className="fixed inset-0 z-[300] bg-black/50" 
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="fixed top-0 left-20 w-64 bg-white shadow-2xl h-screen overflow-hidden flex flex-col border-r border-slate-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // evita que pulsar Enter u otras teclas burbujeen al body y cierren el modal
          e.stopPropagation();
          handleKeyDown(e);
        }}
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-900">Search</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Input + Filter */}
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => { const v = e.target.value; console.log('🟩 [GlobalSearch] query =>', v); setQuery(v); }}
                onKeyDown={(e) => { e.stopPropagation(); handleKeyDown(e); }}
                placeholder="Search..."
                className="pl-8 pr-8 h-9 text-sm rounded-lg border border-slate-300 focus:border-blue-500"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border">
                  <Filter className="w-4 h-4 text-blue-600" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-0 z-[400]">
                <div className="py-1">
                  {ENTITY_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => {
                        console.log('🟩 [GlobalSearch] filtro =>', type.id);
                        setFilter(type.id);
                        setShowFilterPopover(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-100 transition-colors",
                        filter === type.id && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <type.icon className="w-3.5 h-3.5" />
                        {type.name}
                      </div>
                      {filter === type.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {filter !== 'all' && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] text-slate-500">Filter:</span>
              <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0.5">
                {currentFilter?.name}
                <button onClick={() => setFilter('all')} className="ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-slate-500">
              <Loader2 className="w-6 h-6 mx-auto mb-2 text-slate-400 animate-spin" />
              <p className="text-[10px]">Loading...</p>
            </div>
          ) : query.trim().length < 2 ? (
            <div className="p-4 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-[10px]">Type 2+ characters</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <p className="text-[10px]">No results for "{query}"</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Customers */}
              {results.customers && results.customers.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Clients ({results.customers.length})
                  </div>
                  {results.customers.map(customer => (
                    <Link
                      key={customer.id}
                      to={createPageUrl('clients') + `?id=${customer.id}`}
                      onClick={handleResultClick}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">{customer.name}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Projects */}
              {results.projects && results.projects.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Projects ({results.projects.length})
                  </div>
                  {results.projects.map(project => (
                    <Link
                      key={project.id}
                      to={createPageUrl('projects') + `?id=${project.id}`}
                      onClick={handleResultClick}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">{project.name}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Documents */}
              {results.documents && results.documents.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Documents ({results.documents.length})
                  </div>
                  {results.documents.map((d, idx) => (
                    <Link
                      key={idx}
                      to={d.kind === 'project_doc' ? (createPageUrl('projects') + `?id=${d.parentId}`) : (createPageUrl('clients') + `?id=${d.parentId}&tab=documents`)}
                      onClick={handleResultClick}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">{d.fileName}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {d.typeName ? `${d.typeName} · ` : ''}{d.parentName}
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Work Orders */}
              {results.work_orders && results.work_orders.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Work Orders ({results.work_orders.length})
                  </div>
                  {results.work_orders.map(wo => (
                    <Link
                      key={wo.id}
                      to={createPageUrl('work-orders')}
                      onClick={handleResultClick}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">
                          {wo.work_order_number} - {wo.title || 'Untitled'}
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Contacts */}
              {results.contacts && results.contacts.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Contacts ({results.contacts.length})
                  </div>
                  {results.contacts.map(contact => (
                    <Link
                      key={contact.id}
                      to={createPageUrl('contacts')}
                      onClick={handleResultClick}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">{contact.name}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Assets */}
              {results.assets && results.assets.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Assets ({results.assets.length})
                  </div>
                  {results.assets.map(asset => (
                    <Link
                      key={asset.id}
                      to={createPageUrl('documents') + `?tab=asset&asset_id=${asset.id}`}
                      onClick={handleResultClick}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">{asset.name}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}