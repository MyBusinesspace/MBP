import React, { useState, useEffect, useMemo } from 'react';
import { Customer, ProjectCategory, DocumentType, CustomerDocument } from '@/entities/all';
import { useData } from '../components/DataProvider';
import { useDebounce } from '../components/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin,
  Loader2,
  Settings,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Briefcase
 } from 'lucide-react';
import ClientDocumentMatrixTab from '@/components/clients/ClientDocumentMatrixTab';
import { toast } from 'sonner';
import CustomerDetailsPanel from '../components/customers/CustomerDetailsPanel';
import AddClientPanel from '../components/customers/AddClientPanel';
import ClientSettingsPanel from '../components/customers/ClientSettingsPanel';
import ProjectDetailsPanel from '../components/projects/ProjectDetailsPanel';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '../components/skeletons/PageSkeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const categoryColorConfig = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-800' },
  red: { bg: 'bg-red-100', text: 'text-red-800' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  green: { bg: 'bg-green-100', text: 'text-green-800' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-800' }
};

const defaultColumns = [
  { id: 'client', label: 'Client', locked: true },
  { id: 'contact', label: 'Contact', locked: false },
  { id: 'categories', label: 'Categories', locked: false },
  { id: 'location', label: 'Location', locked: false },
  { id: 'email', label: 'Email', locked: false },
  { id: 'tax_number', label: 'Tax Number', locked: false },
  { id: 'license_number', label: 'License Number', locked: false }
];

export default function ClientsPage() {
  const { currentUser, currentCompany, loadProjects, clientEquipments, loadClientEquipments } = useData();
  
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'documents'
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [showOnlyWithActiveProjects, setShowOnlyWithActiveProjects] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDetailsPanel, setShowProjectDetailsPanel] = useState(false);
  const [docTypes, setDocTypes] = useState([]);
  const [customerDocs, setCustomerDocs] = useState([]);

  // New state for sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Expanded clients state
  const [expandedClients, setExpandedClients] = useState(new Set());

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem('clientsVisibleColumns');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.includes('client')) {
          parsed.unshift('client');
        }
        return parsed;
      }
      return ['client', 'contact', 'categories', 'location', 'email'];
    } catch (e) {
      
      return ['client', 'contact', 'categories', 'location', 'email'];
    }
  });

  const isAdmin = currentUser?.role === 'admin';

  // Get URL params for navigation from other pages
  const urlParams = new URLSearchParams(window.location.search);
  const urlCustomerId = urlParams.get('id');
  const urlTab = urlParams.get('tab');

  // Cargar datos específicos de esta página de forma INDEPENDIENTE
  const loadCustomersData = async () => {
    
    try {
      let customersData;
      let byBranch = [];
      if (currentCompany?.id) {
        byBranch = await Customer.filter({ branch_id: currentCompany.id }, '-updated_date', 5000);
      }
      const all = await Customer.list('-updated_date', 5000);
      const mergedMap = new Map();
      [...(byBranch || []), ...(all || [])].forEach(c => { if (c) mergedMap.set(c.id, c); });
      const merged = Array.from(mergedMap.values());
      setCustomers(merged);
      
    } catch (error) {
      
      toast.error('Failed to load clients');
    }
  };

  const loadUsersData = async () => {
    
    try {
      const { User } = await import('@/entities/all');
      const usersData = await User.list('sort_order', 1000);
      setAllUsers(usersData || []);
      
    } catch (error) {
      
      toast.error('Failed to load users');
    }
  };

  const loadCategoriesData = async () => {
    
    try {
      const { CustomerCategory } = await import('@/entities/all');
      const categoriesData = await CustomerCategory.list('sort_order');
      setCustomerCategories(categoriesData || []);
      
    } catch (error) {
      
    }
  };

  const loadProjectCategoriesData = async () => {
    try {
      const categories = await ProjectCategory.list('sort_order');
      setProjectCategories(categories || []);
    } catch (error) {
      console.error('[ClientsPage] Failed to load project categories:', error);
    }
  };

  // Carga inicial de la página - OPTIMIZADA
  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      try {
        // ✅ FASE 1: Solo lo crítico
        const [customersData, categoriesData] = await Promise.all([
          loadCustomersData(),
          loadCategoriesData()
        ]);
        
        setLoading(false);
        
        // ✅ FASE 2: Background
        Promise.all([
          loadUsersData(),
          loadProjectCategoriesData(),
          loadProjects(true),
          loadClientEquipments(true),
          DocumentType.list('sort_order'),
          CustomerDocument.list('-updated_date', 5000)
        ]).then(([_, __, loadedProjects, ___, types, docs]) => {
          if (loadedProjects) setProjects(loadedProjects);
          setDocTypes(Array.isArray(types) ? types : []);
          setCustomerDocs(Array.isArray(docs) ? docs : []);
        }).catch(console.error);
        
      } catch (error) {
        setLoading(false);
      }
    };

    loadPageData();
  }, [currentCompany]); // Removed showArchived from dependencies

  // Handle customer navigation from URL
  useEffect(() => {
    if (urlCustomerId && customers.length > 0) {
      const targetCustomer = customers.find(c => c.id === urlCustomerId);
      if (targetCustomer) {
        setSelectedCustomer(targetCustomer);
        setShowDetailsPanel(true);
      }
    }
  }, [urlCustomerId, customers]);

  // Switch to Documents tab via URL param
  useEffect(() => {
    if (urlTab === 'documents') {
      setActiveTab('documents');
    }
  }, [urlTab]);



  const handleProjectUpdated = async (updatedProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
  };

  const handleProjectDeleted = async (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setShowProjectDetailsPanel(false);
    setSelectedProject(null);
  };

  const handleOpenWorkOrder = (projectId, workOrderId = null) => {
    if (workOrderId) {
      window.location.href = `/work-orders?work_order_id=${workOrderId}`;
    } else {
      window.location.href = `/work-orders?project_id=${projectId}&action=create`;
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    let filtered = [...customers]; // Create a shallow copy to sort

    // Search filter - by ALL words in ALL fields
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      const queryWords = query.split(' ').filter(w => w.length > 0);
      
      filtered = filtered.filter(customer => {
        const customerCategoryNames = (customer.category_ids || [])
          .map(catId => customerCategories.find(c => c.id === catId)?.name)
          .filter(Boolean);
        
        // Include project details in search
        const customerProjects = projects.filter(p => p.customer_id === customer.id);
        const projectSearchText = customerProjects.map(p => [
          p.name,
          p.description,
          p.status,
          p.location_name,
          p.address,
          p.contact_person,
          p.phone
        ].filter(Boolean).join(' ')).join(' ');

        const searchText = [
          customer.name,
          customer.contact_person,
          customer.email,
          customer.phone,
          customer.address,
          customer.location_name,
          customer.tax_number,
          customer.license_number,
          ...customerCategoryNames,
          ...(customer.document_titles || []),
          projectSearchText
        ].filter(Boolean).join(' ').toLowerCase();

        // Match if ALL query words are found in the search text
        return queryWords.every(word => searchText.includes(word));
      });
    }

    // Category filter - Adjusted to work with existing selectedCategories array (multi-select)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(customer => {
        const customerCategoryIds = customer.category_ids || [];
        return customerCategoryIds.some(catId => selectedCategories.includes(catId));
      });
    }

    // Filter by active projects
    if (showOnlyWithActiveProjects) {
      filtered = filtered.filter(customer => {
        return projects.some(p => (p.customer_id === customer.id) && ((p.status || '').toLowerCase().trim() === 'active'));
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string' || typeof bValue === 'string') {
        const stringA = String(aValue).toLowerCase();
        const stringB = String(bValue).toLowerCase();
        return sortOrder === 'asc' 
          ? stringA.localeCompare(stringB)
          : stringB.localeCompare(stringA); // Corrected to use stringB.localeCompare(stringA) for desc
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [customers, customerCategories, debouncedSearchQuery, selectedCategories, sortBy, sortOrder, showOnlyWithActiveProjects, projects]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCategories, showOnlyWithActiveProjects]);

  // Pagination logic
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const toggleClientExpansion = (clientId) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const categoryCounts = useMemo(() => {
    const counts = {};
    customers.forEach(customer => {
      const categoryIds = customer.category_ids || [];
      categoryIds.forEach(catId => {
        counts[catId] = (counts[catId] || 0) + 1;
      });
    });
    return counts;
  }, [customers]);

  // filteredCategories useMemo removed as category search input is removed

  const handleRowClick = (customer) => {
    if (isMultiSelectMode) {
      handleToggleSelection(customer.id);
    } else {
      setSelectedCustomer(customer);
      setShowDetailsPanel(true);
    }
  };

  const handleToggleSelection = (customerId) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // handleCustomerUpdated function is now used inline in CustomerDetailsPanel props
  const handleCustomerCreated = async (newCustomer) => {
    await loadCustomersData();
    setSelectedCustomer(newCustomer);
  };

  const handleCustomerDeleted = async (customerId) => {
    const confirmed = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await Customer.delete(customerId);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      setShowDetailsPanel(false);
      setSelectedCustomer(null);
      toast.success('Client deleted successfully');
    } catch (error) {
      
      toast.error('Failed to delete client');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) return;
    
    const confirmed = window.confirm(`Delete ${selectedCustomers.size} client(s)? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const promises = Array.from(selectedCustomers).map(id => Customer.delete(id));
      await Promise.all(promises);
      
      toast.success(`${selectedCustomers.size} client(s) deleted`);
      setSelectedCustomers(new Set());
      setIsMultiSelectMode(false);
      
      await loadCustomersData();
    } catch (error) {
      
      toast.error('Failed to delete clients');
    }
  };

  // handleBulkArchive and handleBulkRestore functions removed

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleColumnsChange = (newColumns) => {
    setVisibleColumns(newColumns);
    localStorage.setItem('clientsVisibleColumns', JSON.stringify(newColumns));
  };

  const handleColumnToggle = (columnId) => {
    const column = defaultColumns.find(c => c.id === columnId);
    if (column?.locked) return;

    const newVisible = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];
    
    handleColumnsChange(newVisible);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <Card className="p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentCompany?.clients_tab_icon_url ? '' : 'bg-indigo-100'}`}>
              {currentCompany?.clients_tab_icon_url ? (
                <img src={currentCompany.clients_tab_icon_url} alt="Clients" className="w-10 h-10 object-contain" />
              ) : (
                <Building2 className="w-5 h-5 text-indigo-600" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 header-express">Clients</h1>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsPanel(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs Switcher */}
      <div className="flex gap-2 mb-2">
        <Button variant={activeTab==='list' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('list')}>List</Button>
        <Button variant={activeTab==='documents' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('documents')}>Document Matrix</Button>
      </div>

      {activeTab === 'list' ? (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Top Bar */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {/* Filter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterExpanded(!filterExpanded)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1">{selectedCategories.length}</Badge>
              )}
              {filterExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery} // Updated from searchTerm
                onChange={(e) => setSearchQuery(e.target.value)} // Updated from setSearchTerm
                className="pl-10 h-9"
              />
            </div>

            {/* Archive Toggle button removed */}

            {/* Multi-select Actions */}
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                  className="gap-2"
                >
                  {isMultiSelectMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {isMultiSelectMode ? 'Cancel' : 'Select'}
                </Button>

                {isMultiSelectMode && selectedCustomers.size > 0 && (
                  <>
                    <Badge variant="secondary">{selectedCustomers.size} selected</Badge>
                    {/* Replaced Archive/Restore buttons with Delete */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="gap-2"
                    >
                      <Loader2 className="w-4 h-4" /> {/* Outline specified Loader2 */}
                      Delete
                    </Button>
                  </>
                )}
              </>
            )}

            {/* Active Projects Filter */}
            <div className="flex items-center space-x-2 ml-2">
              <Checkbox 
                id="active-projects-filter" 
                checked={showOnlyWithActiveProjects}
                onCheckedChange={setShowOnlyWithActiveProjects}
              />
              <label 
                htmlFor="active-projects-filter" 
                className="text-sm text-slate-600 cursor-pointer select-none"
              >
                Active Projects Only
              </label>
            </div>
          </div>

          {/* New Client Button */}
          {isAdmin && (
            <Button
              onClick={() => setShowAddPanel(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              New Client
            </Button>
          )}
        </div>

        {/* Expanded Filter Row */}
        {filterExpanded && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="space-y-3">
              {/* Removed category search input */}
              <div className="flex flex-wrap gap-2">
                {customerCategories.map(category => { // Changed from filteredCategories to customerCategories
                  const colorConfig = categoryColorConfig[category.color] || categoryColorConfig.gray;
                  const isSelected = selectedCategories.includes(category.id);
                  const count = categoryCounts[category.id] || 0;
                  
                  return (
                    <div
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border",
                        isSelected 
                          ? `${colorConfig.bg} ${colorConfig.text} border-current` 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      <span className="text-sm">{category.name}</span>
                      <span className="text-xs text-slate-400 ml-1">({count})</span>
                    </div>
                  );
                })}
              </div>
              {selectedCategories.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategories([])}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-0">
                <TableHead className="w-8 px-2 py-1 h-8"></TableHead>
                {isMultiSelectMode && (
                  <TableHead className="px-2 py-1 text-left h-8 w-10">
                    <Checkbox
                      checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
                        } else {
                          setSelectedCustomers(new Set());
                        }
                      }}
                    />
                  </TableHead>
                )}
                {visibleColumns.includes('client') && (
                  <TableHead 
                    className="px-2 py-1 text-left text-xs font-semibold text-slate-700 h-8 w-[200px] cursor-pointer"
                    onClick={() => { setSortBy('name'); setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc')); }}
                  >
                    Client {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="inline-block w-3 h-3 ml-1" /> : <ChevronDown className="inline-block w-3 h-3 ml-1" />)}
                  </TableHead>
                )}
                {visibleColumns.includes('contact') && (
                  <TableHead 
                    className="px-2 py-1 text-left text-xs font-semibold text-slate-700 h-8 w-[140px] cursor-pointer"
                    onClick={() => { setSortBy('contact_person'); setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc')); }}
                  >
                    Contact {sortBy === 'contact_person' && (sortOrder === 'asc' ? <ChevronUp className="inline-block w-3 h-3 ml-1" /> : <ChevronDown className="inline-block w-3 h-3 ml-1" />)}
                  </TableHead>
                )}
                {visibleColumns.includes('categories') && (
                  <TableHead className="px-2 py-1 text-left text-xs font-semibold text-slate-700 h-8 w-[140px]">
                    Categories
                  </TableHead>
                )}
                {visibleColumns.includes('location') && (
                  <TableHead 
                    className="px-2 py-1 text-left text-xs font-semibold text-slate-700 h-8 w-[140px] cursor-pointer"
                    onClick={() => { setSortBy('location_name'); setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc')); }}
                  >
                    Location {sortBy === 'location_name' && (sortOrder === 'asc' ? <ChevronUp className="inline-block w-3 h-3 ml-1" /> : <ChevronDown className="inline-block w-3 h-3 ml-1" />)}
                  </TableHead>
                )}
                {visibleColumns.includes('email') && (
                  <TableHead 
                    className="px-2 py-1 text-left text-xs font-semibold text-slate-700 h-8 w-[140px] cursor-pointer"
                    onClick={() => { setSortBy('email'); setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc')); }}
                  >
                    Email {sortBy === 'email' && (sortOrder === 'asc' ? <ChevronUp className="inline-block w-3 h-3 ml-1" /> : <ChevronDown className="inline-block w-3 h-3 ml-1" />)}
                  </TableHead>
                )}
                {visibleColumns.includes('tax_number') && (
                  <TableHead 
                    className="px-2 py-1 text-left text-xs font-semibold text-slate-700 h-8 w-[120px] cursor-pointer"
                    onClick={() => { setSortBy('tax_number'); setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc')); }}
                  >
                    Tax Number {sortBy === 'tax_number' && (sortOrder === 'asc' ? <ChevronUp className="inline-block w-3 h-3 ml-1" /> : <ChevronDown className="inline-block w-3 h-3 ml-1" />)}
                  </TableHead>
                )}
                {visibleColumns.includes('license_number') && (
                  <TableHead 
                    className="px-2 py-1 text-left text-xs font-semibold text-slate-700 h-8 w-[120px] cursor-pointer"
                    onClick={() => { setSortBy('license_number'); setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc')); }}
                  >
                    License {sortBy === 'license_number' && (sortOrder === 'asc' ? <ChevronUp className="inline-block w-3 h-3 ml-1" /> : <ChevronDown className="inline-block w-3 h-3 ml-1" />)}
                  </TableHead>
                )}
                {/* Column Selector */}
                <TableHead className="px-2 py-1 text-right h-8 w-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="space-y-2 p-2">
                        <p className="text-sm font-medium mb-3">Toggle Columns</p>
                        {defaultColumns.map(column => (
                          <div key={column.id} className="flex items-center gap-2">
                            <Checkbox
                              id={column.id}
                              checked={visibleColumns.includes(column.id)}
                              onCheckedChange={() => handleColumnToggle(column.id)}
                              disabled={column.locked}
                            />
                            <label
                              htmlFor={column.id}
                              className={`text-sm cursor-pointer ${column.locked ? 'text-gray-400' : ''}`}
                            >
                              {column.label}
                              {column.locked && ' (required)'}
                            </label>
                          </div>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + (isMultiSelectMode ? 1 : 0) + 2} className="px-2 py-6 text-center text-slate-500 text-sm">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map(customer => {
                  const isExpanded = expandedClients.has(customer.id);
                  const clientProjects = projects.filter(p => p.customer_id === customer.id);

                  return (
                    <React.Fragment key={customer.id}>
                      <TableRow
                        onClick={() => handleRowClick(customer)}
                        className={cn(
                          "hover:bg-slate-50 cursor-pointer transition-colors h-9",
                          selectedCustomers.has(customer.id) && "bg-indigo-50",
                          isExpanded && "bg-slate-50"
                        )}
                      >
                        <TableCell className="px-2 py-1" onClick={(e) => { e.stopPropagation(); toggleClientExpansion(customer.id); }}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </Button>
                        </TableCell>
                        {isMultiSelectMode && (
                          <TableCell className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedCustomers.has(customer.id)}
                              onCheckedChange={() => handleToggleSelection(customer.id)}
                            />
                          </TableCell>
                        )}
                        {visibleColumns.includes('client') && (
                          <TableCell className="px-2 py-1">
                            <div className="font-medium text-slate-900 truncate text-xs">{customer.name}</div>
                          </TableCell>
                        )}
                        {visibleColumns.includes('contact') && (
                          <TableCell className="px-2 py-1">
                            <div className="text-xs text-slate-600 truncate">{customer.contact_person || '-'}</div>
                            {customer.phone && (
                              <div className="text-[10px] text-slate-400 truncate">{customer.phone}</div>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('categories') && (
                          <TableCell className="px-2 py-1">
                            <div className="flex flex-wrap gap-1">
                              {customer.category_ids?.slice(0, 2).map(catId => {
                                const category = customerCategories.find(c => c.id === catId);
                                return category ? (
                                  <span key={catId} className="text-[10px] text-slate-600 truncate bg-slate-100 px-1 rounded">
                                    {category.name}
                                  </span>
                                ) : null;
                              })}
                              {customer.category_ids?.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{customer.category_ids.length - 2}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.includes('location') && (
                          <TableCell className="px-2 py-1">
                            {customer.location_name || customer.address ? (
                              <div className="flex items-center gap-1 text-xs text-slate-600">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[120px]">{customer.location_name || customer.address}</span>
                              </div>
                            ) : <span className="text-xs text-slate-400">-</span>}
                          </TableCell>
                        )}
                        {visibleColumns.includes('email') && (
                          <TableCell className="px-2 py-1">
                            <div className="text-xs text-slate-600 truncate">{customer.email || '-'}</div>
                          </TableCell>
                        )}
                        {visibleColumns.includes('tax_number') && (
                          <TableCell className="px-2 py-1">
                            <div className="text-xs text-slate-600 truncate">{customer.tax_number || '-'}</div>
                          </TableCell>
                        )}
                        {visibleColumns.includes('license_number') && (
                          <TableCell className="px-2 py-1">
                            <div className="text-xs text-slate-600 truncate">{customer.license_number || '-'}</div>
                          </TableCell>
                        )}
                        <TableCell className="px-2 py-1"></TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={visibleColumns.length + (isMultiSelectMode ? 1 : 0) + 2} className="px-8 py-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-4">
                              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-600" />
                                Projects ({clientProjects.length})
                              </h4>
                              {clientProjects.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No active projects found for this client.</p>
                              ) : (
                                <div className="rounded-md border border-slate-200 overflow-hidden">
                                  <Table>
                                    <TableHeader className="bg-slate-50">
                                      <TableRow className="h-8 border-b border-slate-200">
                                        <TableHead className="text-xs font-medium text-slate-500 h-8">Project Name</TableHead>
                                        <TableHead className="text-xs font-medium text-slate-500 h-8">Status</TableHead>
                                        <TableHead className="text-xs font-medium text-slate-500 h-8">Category</TableHead>
                                        <TableHead className="text-xs font-medium text-slate-500 h-8">Contact Person</TableHead>
                                        <TableHead className="text-xs font-medium text-slate-500 h-8">Phone</TableHead>
                                        <TableHead className="text-xs font-medium text-slate-500 h-8">Site Location</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {clientProjects.map(project => {
                                        const categories = (project.category_ids || [])
                                          .map(id => projectCategories.find(c => c.id === id)?.name)
                                          .filter(Boolean)
                                          .join(', ');
                                        
                                        const contactPerson = project.contact_person || (project.contact_persons && project.contact_persons[0]) || '-';
                                        const phone = project.phone || (project.phones && project.phones[0]) || '-';
                                        const location = project.location_name || project.address || '-';

                                        return (
                                          <TableRow key={project.id} className="h-9 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                            <TableCell className="py-1.5">
                                             <button
                                               onClick={() => {
                                                 setSelectedProject(project);
                                                 setShowProjectDetailsPanel(true);
                                               }}
                                               className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline block truncate max-w-[250px] text-left"
                                             >
                                               {project.name}
                                             </button>
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                              <Badge variant="outline" className="text-[10px] bg-white whitespace-nowrap">
                                                {project.status}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                              <span className="text-xs text-slate-600 truncate block max-w-[150px]" title={categories}>
                                                {categories || '-'}
                                              </span>
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                              <span className="text-xs text-slate-600 truncate block max-w-[150px]">
                                                {contactPerson}
                                              </span>
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                              <span className="text-xs text-slate-600 whitespace-nowrap">
                                                {phone}
                                              </span>
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                              <div className="flex items-center gap-1 text-xs text-slate-600 max-w-[200px]">
                                                {location !== '-' && <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />}
                                                <span className="truncate" title={location}>{location}</span>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(e.target.value)}
              className="h-8 w-16 rounded-md border border-slate-300 bg-white text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages || 1}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                &lt;
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 w-8 p-0"
              >
                &gt;
              </Button>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden p-4">
            <ClientDocumentMatrixTab customers={customers} isAdmin={isAdmin} />
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Documents List</h3>
              {customerDocs.length === 0 ? (
                <div className="text-sm text-slate-500">No documents found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600">
                        <th className="text-left px-3 py-2">Customer</th>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2">File Name</th>
                        <th className="text-left px-3 py-2">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerDocs.flatMap(doc => {
                        const urls = doc.file_urls || (doc.file_url ? [doc.file_url] : []);
                        const names = doc.file_names || (doc.file_name ? [doc.file_name] : []);
                        const typeName = docTypes.find(t => t.id === doc.document_type_id)?.name || '—';
                        const customer = customers.find(c => c.id === doc.customer_id);
                        return urls.map((url, idx) => ({
                          id: `${doc.id}-${idx}`,
                          customerName: customer?.name || 'Unknown',
                          typeName,
                          fileName: names[idx] || `Document ${idx + 1}`,
                          updated: doc.last_updated_date || doc.upload_date,
                          fileUrl: url
                        }));
                      }).map(row => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">{row.customerName}</td>
                          <td className="px-3 py-2">{row.typeName}</td>
                          <td className="px-3 py-2"><a href={row.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{row.fileName}</a></td>
                          <td className="px-3 py-2">{row.updated ? new Date(row.updated).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
      )}

             
      {showDetailsPanel && selectedCustomer && (
        <CustomerDetailsPanel
          customer={selectedCustomer}
          isOpen={showDetailsPanel}
          onClose={() => {
            setShowDetailsPanel(false);
            setSelectedCustomer(null);
          }}
          // Updated onUpdate prop as per outline
          onUpdate={async (updatedCustomer) => {
            setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
            setSelectedCustomer(updatedCustomer);
            await loadCustomersData(); // Reload all customers to ensure consistency
          }}
          onDelete={handleCustomerDeleted}
          users={allUsers}
          customerCategories={customerCategories}
        />
      )}

      {showAddPanel && (
        <AddClientPanel
          isOpen={showAddPanel}
          onClose={() => setShowAddPanel(false)}
          onSuccess={handleCustomerCreated}
          categories={customerCategories}
          existingCustomers={customers}
        />
      )}

      {/* Settings Panel */}
      {showSettingsPanel && (
        <ClientSettingsPanel
          isOpen={showSettingsPanel}
          onClose={() => setShowSettingsPanel(false)}
          onSettingsChanged={async () => {
            await loadCategoriesData();
          }}
        />
      )}

      {/* Project Details Panel */}
      {showProjectDetailsPanel && selectedProject && (
        <ProjectDetailsPanel
          project={selectedProject}
          isOpen={showProjectDetailsPanel}
          onClose={() => {
            setShowProjectDetailsPanel(false);
            setSelectedProject(null);
          }}
          onProjectUpdated={handleProjectUpdated}
          onProjectDeleted={handleProjectDeleted}
          onOpenWorkOrder={handleOpenWorkOrder}
          customers={customers}
          projectCategories={projectCategories}
          clientEquipments={clientEquipments}
        />
      )}
    </div>
  );
}