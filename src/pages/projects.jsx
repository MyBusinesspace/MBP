import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../components/DataProvider';
import { useDebounce } from '../components/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter,
  MapPin,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ClipboardList,
  Loader2
 } from 'lucide-react';
import { toast } from 'sonner';
import ProjectDetailsPanel from '../components/projects/ProjectDetailsPanel';
import AddProjectPanel from '../components/projects/AddProjectPanel';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '../components/skeletons/PageSkeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProjectSettingsPanel from '../components/projects/ProjectSettingsPanel';
import EquipmentDetailsPanel from '../components/equipment/EquipmentDetailsPanel';
import ProjectDocumentMatrixTab from '../components/projects/ProjectDocumentMatrixTab';
import LocalErrorBoundary from '../components/LocalErrorBoundary';
import { base44 } from '@/api/base44Client';

const statusColors = {
  'active': 'bg-green-100 text-green-800',
  'on_hold': 'bg-yellow-100 text-yellow-800',
  'closed': 'bg-blue-100 text-blue-800',
  'archived': 'bg-gray-100 text-gray-800',
};

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

export default function ProjectsPage() {
  const { currentUser, currentCompany, loadProjects, loadCustomers, loadBranches, loadClientEquipments, loadUsers } = useData();
  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [clientEquipments, setClientEquipments] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [showOnlyWithEquipment, setShowOnlyWithEquipment] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showEquipmentPanel, setShowEquipmentPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [workOrdersByProject, setWorkOrdersByProject] = useState({});
  const [openWOCountByProject, setOpenWOCountByProject] = useState({});
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(new Set());
  const [woDateFrom, setWoDateFrom] = useState('');
  const [woDateTo, setWoDateTo] = useState('');
  const [workOrderCategories, setWorkOrderCategories] = useState([]);
  const [debugInfo, setDebugInfo] = useState({ initialCount: null, fallbackUsed: false, fallbackCount: null, error: null });

  // Helpers para estado de filtros
  const hasActiveFilters = useMemo(() => {
    return (
      (selectedStatus?.length || 0) > 0 ||
      (selectedCategories?.length || 0) > 0 ||
      (searchTerm || '').trim() !== '' ||
      !!showOnlyWithEquipment
    );
  }, [selectedStatus, selectedCategories, searchTerm, showOnlyWithEquipment]);

  const resetAllFilters = () => {
    setSelectedStatus([]);
    setSelectedCategories([]);
    setSearchTerm('');
    setShowOnlyWithEquipment(false);
    setFilterExpanded(false);
    setCurrentPage(1);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem('projectsVisibleColumns');
      const parsed = stored ? JSON.parse(stored) : [];
      return parsed.length > 0 ? parsed : ['name', 'customer_id', 'status', 'categories', 'created_date'];
    } catch (e) {
      
      return ['name', 'customer_id', 'status', 'categories', 'created_date'];
    }
  });

  const isAdmin = currentUser?.role === 'admin';

  const loadPageData = async () => {
    const startTime = performance.now();
    setLoading(true);
    
    try {
      // ✅ FASE 1: Cargar solo los primeros 20 proyectos (paginación inicial)
      const [projectsData, customersData, categoriesData, equipmentsPhase1] = await Promise.all([
        loadProjects(),
        loadCustomers(),
        (async () => {
          try {
            const mod = await import('@/entities/all');
            const list = mod?.ProjectCategory?.list
              ? await mod.ProjectCategory.list('sort_order')
              : await base44.entities.ProjectCategory.list('sort_order', 1000);
            return Array.isArray(list) ? list : [];
          } catch (e) {
            try {
              const list = await base44.entities.ProjectCategory.list('sort_order', 1000);
              return Array.isArray(list) ? list : [];
            } catch {
              return [];
            }
          }
        })(),
        loadClientEquipments()
      ]);
      
      let filteredProjects = (projectsData || []);

      // Fallback: if context returns empty, load directly from API
      if (filteredProjects.length === 0) {
        try {
          const companyId = currentCompany?.id;
          const direct = companyId 
            ? await base44.entities.Project.filter({ branch_id: companyId }, '-updated_date', 500)
            : await base44.entities.Project.list('-updated_date', 500);
          filteredProjects = (Array.isArray(direct) ? direct : []);
        } catch (e) {
          console.error('Fallback load failed', e);
        }
      }
      setProjects(filteredProjects);
      setCustomers(customersData || []);
      setProjectCategories(categoriesData || []);
      setClientEquipments(equipmentsPhase1 || []);
      // Diagnostics: analytics + local banner
      try {
        const initialCountDiag = (projectsData || []).length;
        const fallbackUsedDiag = initialCountDiag === 0 && ((filteredProjects?.length || 0) > 0);
        const fallbackCountDiag = fallbackUsedDiag ? (filteredProjects?.length || 0) : null;
        base44.analytics.track({
          eventName: 'projects_load',
          properties: {
            initial_count: initialCountDiag,
            fallback_used: fallbackUsedDiag,
            fallback_count: fallbackCountDiag,
            company_id: currentCompany?.id || null
          }
        });
        setDebugInfo({ initialCount: initialCountDiag, fallbackUsed: fallbackUsedDiag, fallbackCount: fallbackCountDiag, error: null });
      } catch (e) { /* noop */ }
      
      const phase1Time = performance.now();
      console.log(`✅ Projects Phase 1 loaded in ${Math.round(phase1Time - startTime)}ms`);
      
      // ✅ Quitar loading para mostrar UI inmediatamente
      setLoading(false);
      
      // ✅ FASE 2: Cargar resto de proyectos + data secundaria en background
      Promise.all([
        loadUsers(),
        loadBranches(),
        loadClientEquipments(),
        (async () => {
          try {
            const { TimeEntry } = await import('@/entities/all');
            const openWOs = await TimeEntry.filter({ status: 'open' }, '-updated_date', 1000);
            return Array.isArray(openWOs) ? openWOs : [];
          } catch (e) {
            try {
              const openWOs = await base44.entities.TimeEntry.filter({ status: 'open' }, '-updated_date', 1000);
              return Array.isArray(openWOs) ? openWOs : [];
            } catch (err) {
              console.warn('Open WOs fallback failed', err);
              return [];
            }
          }
        })()
      ]).then(([usersData, branchesData, equipmentsData, openWOs]) => {
        setAllUsers(usersData || []);
        const allowed = ['redcrane', 'redline'];
        const filteredBranches = (branchesData || []).filter(b => {
          const n = (b?.name || '').toLowerCase();
          return allowed.some(k => n.includes(k));
        });
        setBranches(filteredBranches);
        setClientEquipments(equipmentsData || []);

        // Mapear conteo de WOs abiertos por proyecto
        const counts = {};
        (openWOs || []).forEach(wo => {
          const pid = wo?.project_id;
          if (pid) counts[pid] = (counts[pid] || 0) + 1;
        });
        setOpenWOCountByProject(counts);

        const totalTime = performance.now();
        console.log(`✅ Projects fully loaded in ${Math.round(totalTime - startTime)}ms`);
      }).catch(error => {
        console.error('Failed to load secondary data:', error);
      });
      
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadPageData();
    }
  }, [currentCompany?.id, currentUser?.id]);

  // Debug active tab and branch selection
  useEffect(() => {
    console.log('[Projects] 🗂️ activeTab', activeTab);
  }, [activeTab]);
  useEffect(() => {
    console.log('[Projects] 🏷️ selectedBranchId', selectedBranchId);
  }, [selectedBranchId]);

  // Cargar categorías de Work Orders una vez (para mostrar nombre de categoría)
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@/entities/all');
        let cats = [];
        if (mod?.WorkOrderCategory?.list) {
          cats = await mod.WorkOrderCategory.list('sort_order', 1000);
        } else {
          try {
            cats = await base44.entities.WorkOrderCategory.list('sort_order', 1000);
          } catch (err) {
            console.warn('WorkOrderCategory fallback failed', err);
            cats = [];
          }
        }
        setWorkOrderCategories(Array.isArray(cats) ? cats : []);
      } catch (e) {
        console.error('Failed to load WO categories', e);
      }
    })();
  }, []);


  // Handle URL parameter navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        setShowDetailsPanel(true);
      }
    }
  }, [projects]);

  // Deprecated: default branch now handled by robust effect below
  // useEffect(() => {}, [projects, currentCompany?.id]);


useEffect(() => {
  // Robust default branch: try company branch, then dominant project branch, then first available branch
  if (!Array.isArray(projects) || projects.length === 0) {
    // If no projects yet but branches exist, use company or first branch
    if (!selectedBranchId && Array.isArray(branches) && branches.length) {
      const fallback = currentCompany?.id || branches[0]?.id;
      if (fallback && fallback !== 'none') setSelectedBranchId(fallback);
    }
    return;
  }

  const hasCurrent = currentCompany?.id && projects.some(p => p && p.branch_id === currentCompany.id);

  const counts = projects.reduce((acc, p) => {
    if (!p) return acc;
    const id = p.branch_id || 'none';
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  let topBranchId = null;
  const entries = Object.entries(counts);
  if (entries.length) {
    topBranchId = entries.sort((a, b) => (b[1] - a[1]))[0]?.[0] || null;
  }

  const fallbackBranchId = Array.isArray(branches) && branches.length ? branches[0]?.id : null;
  const next = hasCurrent ? currentCompany.id : (topBranchId && topBranchId !== 'none' ? topBranchId : fallbackBranchId);
  if (next && next !== selectedBranchId && next !== 'none') {
    setSelectedBranchId(next);
  }
}, [projects, currentCompany?.id, branches, selectedBranchId]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = projects;

    if (debouncedSearchTerm) {
      const query = debouncedSearchTerm.toLowerCase();
      const queryWords = query.split(' ').filter(w => w.length > 0);
      
      filtered = filtered.filter(project => {
        const customer = customers.find(c => c.id === project.customer_id);
        const customerName = customer?.name || customer?.full_name || '';
        const projectCategoryNames = (project.category_ids || [])
          .map(catId => projectCategories.find(c => c.id === catId)?.name)
          .filter(Boolean);
        
        const searchText = [
          project.name,
          customerName,
          project.description,
          project.location_name,
          project.address,
          project.contact_person,
          project.phone,
          project.notes,
          ...projectCategoryNames,
          project.status
        ].filter(Boolean).join(' ').toLowerCase();

        // 1-syllable / partial match: use includes for each word
        return queryWords.every(word => searchText.includes(word));
      });
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(project => {
        const projectCategoryIds = project.category_ids || [];
        return projectCategoryIds.some(catId => selectedCategories.includes(catId));
      });
    }

    if (selectedStatus.length > 0) {
      filtered = filtered.filter(project => {
        const s = (project.status || '').toString().toLowerCase().trim();
        return selectedStatus.includes(s);
      });
    }

    if (showOnlyWithEquipment) {
      filtered = filtered.filter(project => {
        // Count only equipment actually present and linked to this project (avoid stale IDs)
        const hasLinkedEquipment = clientEquipments.some(
          (eq) => eq.project_id === project.id || (project.client_equipment_ids || []).includes(eq.id)
        );
        return hasLinkedEquipment;
      });
    }

    filtered.sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      
      if (aValue === null || aValue === undefined) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === null || bValue === undefined) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [
    projects, 
    customers, 
    projectCategories,
    debouncedSearchTerm,
    selectedCategories,
    selectedStatus,
    showOnlyWithEquipment,
    sortBy,
    sortOrder,
    clientEquipments
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategories, selectedStatus, showOnlyWithEquipment]);

  // Pagination logic
  // ✅ OPTIMIZADO: Solo calcular equipments para proyectos visibles
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);
  
  const visibleProjectIds = useMemo(() => {
    return new Set(paginatedProjects.map(p => p.id));
  }, [paginatedProjects]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const toggleProjectExpansion = (projectId) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
        // Cargar WOs del proyecto al expandir
        loadProjectWorkOrders(projectId);
      }
      return newSet;
    });
  };

  const branchCounts = useMemo(() => {
    const counts = {};
    projects.forEach(p => { const id = p.branch_id || 'none'; counts[id] = (counts[id] || 0) + 1; });
    return counts;
  }, [projects]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    projects.forEach(project => {
      const categoryIds = project.category_ids || [];
      categoryIds.forEach(catId => {
        counts[catId] = (counts[catId] || 0) + 1;
      });
    });
    return counts;
  }, [projects]);

  const projectCounters = useMemo(() => {
    const total = Array.isArray(projects) ? projects.length : 0;
    const withEquipment = (projects || []).reduce((acc, p) => {
      const hasEq = (clientEquipments || []).some(eq => eq?.project_id === p?.id || (p?.client_equipment_ids || []).includes(eq?.id));
      return acc + (hasEq ? 1 : 0);
    }, 0);
    const withOpenWOs = (projects || []).reduce((acc, p) => acc + (((openWOCountByProject[p?.id] || 0) > 0) ? 1 : 0), 0);
    return { total, withEquipment, withOpenWOs };
  }, [projects, clientEquipments, openWOCountByProject]);

  const handleRowClick = (project) => {
    if (isMultiSelectMode) {
      handleToggleSelection(project.id);
    } else {
      setSelectedProject(project);
      setShowDetailsPanel(true);
    }
  };

  const handleToggleSelection = (projectId) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleProjectUpdated = (updatedProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
  };

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
    setSelectedProject(newProject);
    setShowAddPanel(false);
    setShowDetailsPanel(true);
  };

  const handleProjectDeleted = (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setShowDetailsPanel(false);
    setSelectedProject(null);
  };

  const handleOpenWorkOrder = (projectId, workOrderId = null) => {
    
    if (workOrderId) {
      window.location.href = `/work-orders?work_order_id=${workOrderId}`;
    } else {
      window.location.href = `/work-orders?project_id=${projectId}&action=create`;
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.size === 0) return;
    
    const confirmed = window.confirm(`Delete ${selectedProjects.size} project(s)? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const promises = Array.from(selectedProjects).map(id => 
        base44.entities.Project.delete(id)
      );
      await Promise.all(promises);
      
      toast.success(`${selectedProjects.size} project(s) deleted`);
      setProjects(prev => prev.filter(p => !selectedProjects.has(p.id)));
      setSelectedProjects(new Set());
      setIsMultiSelectMode(false);
    } catch (error) {
      
      toast.error('Failed to delete projects');
    }
  };

  const loadProjectWorkOrders = async (projectId) => {
    if (!projectId) return;
    if (workOrdersByProject[projectId]) return;
    setLoadingWorkOrders(prev => {
      const s = new Set(prev);
      s.add(projectId);
      return s;
    });
    try {
      try {
        const { TimeEntry } = await import('@/entities/all');
        const list = await TimeEntry.filter({ project_id: projectId }, '-created_date');
        setWorkOrdersByProject(prev => ({ ...prev, [projectId]: Array.isArray(list) ? list : [] }));
      } catch (errPrimary) {
        try {
          const list = await base44.entities.TimeEntry.filter({ project_id: projectId }, '-created_date');
          setWorkOrdersByProject(prev => ({ ...prev, [projectId]: Array.isArray(list) ? list : [] }));
        } catch (errFallback) {
          console.error('Failed to load work orders for project', projectId, errFallback);
          setWorkOrdersByProject(prev => ({ ...prev, [projectId]: [] }));
        }
      }
      return;
      setWorkOrdersByProject(prev => ({ ...prev, [projectId]: Array.isArray(list) ? list : [] }));
    } catch (e) {
      console.error('Failed to load work orders for project', projectId, e);
      setWorkOrdersByProject(prev => ({ ...prev, [projectId]: [] }));
    } finally {
      setLoadingWorkOrders(prev => {
        const s = new Set(prev);
        s.delete(projectId);
        return s;
      });
    }
  };

   const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleStatusToggle = (status) => {
    setSelectedStatus(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      }
      return [...prev, status];
    });
  };

  const handleColumnsChange = (newColumns) => {
    setVisibleColumns(newColumns);
    localStorage.setItem('projectsVisibleColumns', JSON.stringify(newColumns));
  };

  const availableColumns = [
    { id: 'name', label: 'Project Name' },
    { id: 'customer_id', label: 'Customer' },
    { id: 'status', label: 'Status' },
    { id: 'categories', label: 'Categories' },
    { id: 'created_date', label: 'Created' },
    { id: 'branch_id', label: 'Branch' },
    { id: 'contact_person', label: 'Contact' },
    { id: 'location_name', label: 'Location' }
  ];

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentCompany?.projects_tab_icon_url ? '' : 'bg-pink-100'}`}>
              {currentCompany?.projects_tab_icon_url ? (
                <img src={currentCompany.projects_tab_icon_url} alt="Projects" className="w-10 h-10 object-contain" />
              ) : (
                <Briefcase className="w-5 h-5 text-pink-600" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 header-express">Projects</h1>
            <div className="flex items-center gap-2 ml-2">
              <Badge variant="outline" className="text-xs">Total: {projectCounters.total}</Badge>
              <Badge className="text-xs bg-indigo-600 hover:bg-indigo-700">With Equipment: {projectCounters.withEquipment}</Badge>
              <Badge className="text-xs bg-emerald-600 hover:bg-emerald-700">Open WOs: {projectCounters.withOpenWOs}</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetAllFilters} className="gap-2">
                  Clear Filters
                </Button>
              )}

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
          </div>
        </div>
      </Card>

      {debugInfo?.fallbackUsed && (
        <div className="px-3 py-2 border border-amber-200 bg-amber-50 text-amber-700 rounded-md text-xs">
          Fallback used: context returned {debugInfo.initialCount}, API returned {debugInfo.fallbackCount}.
          <Button variant="outline" size="sm" className="ml-2" onClick={loadPageData}>Reload</Button>
        </div>
      )}
      {Array.isArray(projects) && projects.length === 0 && (
        <div className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-md text-xs">
          No projects after loading. Try Reload to test connection.
          <Button variant="outline" size="sm" className="ml-2" onClick={loadPageData}>Reload</Button>
        </div>
      )}

       <div className="flex gap-2 mb-2">
        <Button variant={activeTab==='list' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('list')}>List</Button>
        <Button variant={activeTab==='documents' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('documents')}>Document Matrix</Button>
      </div>

    {activeTab === 'list' ? (
  <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
    {/* Filters Bar - integrated as table header */}
    <div className="p-4 border-b border-slate-200">
      <div className="flex gap-3 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterExpanded(!filterExpanded)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filter
          {((selectedStatus?.length || 0) + (selectedCategories?.length || 0)) > 0 && (
            <Badge variant="secondary" className="ml-1">
              {(selectedStatus?.length || 0) + (selectedCategories?.length || 0)}
            </Badge>
          )}
          {filterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* With Equipment filter visible for all users */}
        <div className="flex items-center space-x-2 ml-2">
          <Checkbox 
            id="equipment-filter"
            checked={showOnlyWithEquipment || false}
            onCheckedChange={setShowOnlyWithEquipment}
          />
          <label 
            htmlFor="equipment-filter" 
            className="text-sm text-slate-600 cursor-pointer select-none"
          >
            With Equipment
          </label>
        </div>

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

            {isMultiSelectMode && (selectedProjects?.size || 0) > 0 && (
              <>
                <Badge variant="secondary">{selectedProjects.size} selected</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </>
            )}

            <Button
              onClick={() => setShowAddPanel(true)}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </>
        )}
      </div>

      {filterExpanded && (
        <>
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 mb-2">Status</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetAllFilters} className="text-slate-600">Reset</Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {['active', 'on_hold', 'closed', 'archived'].map((status) => {
                const isSelected = selectedStatus?.includes(status);
                return (
                  <div
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border",
                      isSelected
                        ? "bg-slate-100 border-slate-400"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Checkbox checked={isSelected} />
                    <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                  </div>
                );
              })}
            </div>
            {(projectCategories?.length || 0) > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {projectCategories.map(category => {
                    const isSelected = selectedCategories?.includes(category.id);
                    const colorConfig = categoryColorConfig?.[category.color] || categoryColorConfig?.gray || { bg: 'bg-gray-100', text: 'text-gray-700' };
                    const count = categoryCounts?.[category.id] || 0;

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
              </div>
            )}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetAllFilters}
                className="mt-2"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </>
      )}
    </div>
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50 border-0">
            <TableHead className="w-8 px-2 py-1 h-8"></TableHead>
            {isMultiSelectMode && (
              <TableHead className="py-1 px-1 h-7 w-[40px]">
                <Checkbox
                  checked={(selectedProjects?.size || 0) === (filteredProjects?.length || 0) && (filteredProjects?.length || 0) > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
                    } else {
                      setSelectedProjects(new Set());
                    }
                  }}
                />
              </TableHead>
            )}
            {availableColumns.map(column => {
              if (visibleColumns?.includes(column.id)) {
                let width = '140px';
                if (column.id === 'name') width = '200px';
                
                return (
                  <TableHead 
                    key={column.id} 
                    className="py-1 px-2 text-left text-xs font-semibold text-slate-700 h-7"
                    style={{ width }}
                  >
                    {column.label}
                  </TableHead>
                );
              }
              return null;
            })}

            <TableHead className="py-1 px-2 text-right h-7 w-[40px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Settings className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="space-y-2 p-2">
                    <p className="text-sm font-medium mb-3">Toggle Columns</p>
                    {availableColumns.map(column => (
                      <div key={column.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`toggle-${column.id}`}
                          checked={visibleColumns?.includes(column.id)}
                          onCheckedChange={() => {
                            const newVisible = visibleColumns.includes(column.id)
                              ? visibleColumns.filter(id => id !== column.id)
                              : [...visibleColumns, column.id];
                            handleColumnsChange(newVisible);
                          }}
                        />
                        <label htmlFor={`toggle-${column.id}`} className="text-sm cursor-pointer">
                          {column.label}
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
          {(filteredProjects?.length || 0) === 0 ? (
            <TableRow>
              <TableCell colSpan={(visibleColumns?.length || 0) + (isMultiSelectMode ? 1 : 0) + 2} className="h-16 text-center text-slate-500">
                No projects found
              </TableCell>
            </TableRow>
          ) : (
            paginatedProjects.map(project => {
              const customer = customers?.find(c => c.id === project.customer_id);
              const branch = branches?.find(b => b.id === project.branch_id);
              const isExpanded = expandedProjects?.has(project.id);
              
              const projectEquipments = isExpanded 
                ? clientEquipments?.filter(eq => 
                    (project.client_equipment_ids || []).includes(eq.id) || eq.project_id === project.id
                  ) || []
                : [];
              
              return (
                <React.Fragment key={project.id}>
                <TableRow
                  onClick={() => handleRowClick(project)}
                  className={cn(
                    "border-b hover:opacity-80 transition-opacity cursor-pointer",
                    selectedProjects?.has(project.id) && "ring-2 ring-indigo-300",
                    isExpanded && "bg-slate-50"
                  )}
                  style={{ minHeight: '32px' }}
                >
                  <TableCell className="px-2 py-1" onClick={(e) => { e.stopPropagation(); toggleProjectExpansion(project.id); }}>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </Button>
                  </TableCell>
                  {isMultiSelectMode && (
                    <TableCell className="py-0.5 px-1" onClick={(e) => e.stopPropagation()} style={{ width: '40px' }}>
                      <Checkbox
                        checked={selectedProjects?.has(project.id)}
                        onCheckedChange={() => handleToggleSelection(project.id)}
                      />
                    </TableCell>
                  )}
                  {availableColumns.map(column => {
                    if (visibleColumns?.includes(column.id)) {
                      let width = '140px';
                      if (column.id === 'name') width = '200px';
                      
                      switch (column.id) {
                        case 'name':
                          return (
                            <TableCell key={`${project.id}-${column.id}`} className="py-0.5 px-2" style={{ width }}>
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-xs truncate text-slate-900 hover:text-indigo-600 transition-colors">
                                  {project.name}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <ClipboardList className="w-3 h-3" />
                                  <span>{openWOCountByProject[project.id] || 0}</span>
                                  <span className="mx-1">•</span>
                                  <Settings className="w-3 h-3" />
                                  <span>{(clientEquipments || []).filter(eq => (project.client_equipment_ids || []).includes(eq.id) || eq.project_id === project.id).length}</span>
                                </div>
                              </div>
                            </TableCell>
                          );
                        case 'customer_id':
                          return (
                            <TableCell key={`${project.id}-${column.id}`} className="py-0.5 px-2" style={{ width }}>
                              <span className="text-[10px] text-slate-600 truncate block">{customer?.name || '-'}</span>
                            </TableCell>
                          );
                        case 'status':
                          return (
                            <TableCell key={`${project.id}-${column.id}`} className="py-0.5 px-2" style={{ width }}>
                              <span className={cn(
                                "capitalize text-[10px]",
                                project.status === 'active' && "text-green-600",
                                project.status === 'on_hold' && "text-yellow-600",
                                project.status === 'closed' && "text-blue-600",
                                project.status === 'archived' && "text-gray-600",
                              )}>
                                {project.status?.replace('_', ' ')}
                              </span>
                            </TableCell>
                          );
                        case 'categories':
                          return (
                            <TableCell key={`${project.id}-${column.id}`} className="py-0.5 px-2" style={{ width }}>
                              <div className="flex flex-wrap gap-1">
                                {project.category_ids?.slice(0, 2).map(catId => {
                                  const category = projectCategories?.find(c => c.id === catId);
                                  return category ? (
                                    <span key={catId} className="text-[10px] text-slate-600 truncate bg-slate-100 px-1 rounded">
                                      {category.name}
                                    </span>
                                  ) : null;
                                })}
                                {(project.category_ids?.length || 0) > 2 && (
                                  <span className="text-[10px] text-slate-400">
                                    +{project.category_ids.length - 2}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          );
                        case 'created_date':
                          return (
                            <TableCell key={`${project.id}-${column.id}`} className="py-0.5 px-2" style={{ width }}>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {project.created_date ? new Date(project.created_date).toLocaleDateString() : '-'}
                              </span>
                            </TableCell>
                          );
                        case 'branch_id':
                          return (
                            <TableCell key={`${project.id}-${column.id}`} className="py-0.5 px-2" style={{ width }}>
                              <span className="text-[10px] text-slate-600 truncate block">{branch?.name || '-'}</span>
                            </TableCell>
                          );
                        case 'contact_person':
                          return (
                            <TableCell key={`${project.id}-${column.id}`} className="py-0.5 px-2" style={{ width }}>
                              <span className="text-[10px] text-slate-600 truncate block">{project.contact_person || '-'}</span>
                            </TableCell>
                          );
                        case 'location_name':
                          return (
                            <TableCell key={`${project.id}-${column.id}`} className="py-0.5 px-2" style={{ width }}>
                              {project.location_name || project.address ? (
                                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{project.location_name || project.address}</span>
                                </div>
                              ) : <span className="text-[10px] text-slate-400">-</span>}
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    }
                    return null;
                  })}
                  <TableCell className="py-0.5 px-2" style={{ width: '40px' }}></TableCell> 
                </TableRow>
                {isExpanded && (
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableCell colSpan={(visibleColumns?.length || 0) + (isMultiSelectMode ? 1 : 0) + 2} className="px-8 py-4">
                      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-6">
                        {/* Working Orders Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                              <ClipboardList className="w-4 h-4 text-emerald-600" />
                              {(() => {
                                const base = workOrdersByProject[project.id] || [];
                                const filtered = base.filter(wo => {
                                  const cd = wo?.created_date ? new Date(wo.created_date) : null;
                                  if (woDateFrom) { const dFrom = new Date(woDateFrom); if (!cd || cd < dFrom) return false; }
                                  if (woDateTo) { const dTo = new Date(woDateTo); dTo.setHours(23,59,59,999); if (!cd || cd > dTo) return false; }
                                  return true;
                                });
                                const openCount = filtered.filter(wo => (wo.status || '').toLowerCase() === 'open').length;
                                const closedCount = Math.max(filtered.length - openCount, 0);
                                return (<span>Working Orders (Open: {openCount}, Closed: {closedCount})</span>);
                              })()}
                              </h4>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-slate-500">Desde</span>
                                <Input type="date" value={woDateFrom || ''} onChange={(e) => setWoDateFrom(e.target.value)} className="h-7 px-2" />
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-slate-500">Hasta</span>
                                <Input type="date" value={woDateTo || ''} onChange={(e) => setWoDateTo(e.target.value)} className="h-7 px-2" />
                              </div>
                              {(woDateFrom || woDateTo) && (
                                <button className="text-xs text-slate-600 hover:text-slate-900" onClick={() => { setWoDateFrom(''); setWoDateTo(''); }}>
                                  Limpiar
                                </button>
                              )}
                            </div>
                          </div>
                          </div>
                          {loadingWorkOrders.has(project.id) ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Loader2 className="w-4 h-4 animate-spin" /> Cargando órdenes...
                            </div>
                          ) : (workOrdersByProject[project.id]?.length || 0) === 0 ? (
                            <p className="text-xs text-slate-500 italic">No hay working orders para este proyecto.</p>
                          ) : (
                            <div className="rounded-md border border-slate-200 overflow-hidden">
                              <Table>
                                <TableHeader className="bg-slate-50">
                                  <TableRow className="h-8 border-b border-slate-200">
                                    <TableHead className="text-xs font-medium text-slate-500 h-8">Title</TableHead>
                                    <TableHead className="text-xs font-medium text-slate-500 h-8">Category</TableHead>
                                    <TableHead className="text-xs font-medium text-slate-500 h-8">Status</TableHead>
                                    <TableHead className="text-xs font-medium text-slate-500 h-8 text-right">Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(workOrdersByProject[project.id] || [])
                                    .filter(wo => {
                                      const cd = wo?.created_date ? new Date(wo.created_date) : null;
                                      if (woDateFrom) { const dFrom = new Date(woDateFrom); if (!cd || cd < dFrom) return false; }
                                      if (woDateTo) { const dTo = new Date(woDateTo); dTo.setHours(23,59,59,999); if (!cd || cd > dTo) return false; }
                                      return true;
                                    })
                                    .map(wo => (
                                    <TableRow
                                      key={wo.id}
                                      className="h-9 hover:bg-slate-100 border-b border-slate-100 last:border-0 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenWorkOrder(project.id, wo.id);
                                      }}
                                    >
                                      <TableCell className="py-1.5 text-xs text-slate-700">{wo.title || 'Untitled'}</TableCell>
                                      <TableCell className="py-1.5 text-xs text-slate-700">
                                        {(() => { const cat = workOrderCategories.find(c => c.id === wo.work_order_category_id); return cat?.name || '-'; })()}
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        <Badge variant="outline" className={`text-[10px] bg-white whitespace-nowrap ${((wo.status||'').toLowerCase()==='open') ? 'text-green-600' : 'text-slate-600'}`}>
                                          {(wo.status || '').charAt(0).toUpperCase() + (wo.status || '').slice(1)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-1.5 text-right text-xs text-slate-600">{wo.created_date ? new Date(wo.created_date).toLocaleDateString() : '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>

                        {/* Equipment Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-indigo-600" />
                            Equipment ({(projectEquipments?.length || 0)})
                          </h4>
                          {(projectEquipments?.length || 0) === 0 ? (
                            <p className="text-xs text-slate-500 italic">No equipment assigned to this project.</p>
                          ) : (
                            <div className="rounded-md border border-slate-200 overflow-hidden">
                              <Table>
                                <TableHeader className="bg-slate-50">
                                  <TableRow className="h-8 border-b border-slate-200">
                                    <TableHead className="text-xs font-medium text-slate-500 h-8">Name</TableHead>
                                    <TableHead className="text-xs font-medium text-slate-500 h-8">Brand</TableHead>
                                    <TableHead className="text-xs font-medium text-slate-500 h-8">Serial Number</TableHead>
                                    <TableHead className="text-xs font-medium text-slate-500 h-8">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(projectEquipments || []).map(eq => (
                                      <TableRow 
                                        key={eq.id} 
                                        className="h-9 hover:bg-slate-100 border-b border-slate-100 last:border-0 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedEquipment(eq);
                                          setShowEquipmentPanel(true);
                                        }}
                                      >
                                        <TableCell className="py-1.5">
                                          <span className="text-sm font-medium text-indigo-600 hover:underline">
                                            {eq.name}
                                          </span>
                                        </TableCell>
                                        <TableCell className="py-1.5">
                                          <span className="text-xs text-slate-600">
                                            {eq.brand || '-'}
                                          </span>
                                        </TableCell>
                                        <TableCell className="py-1.5">
                                          <span className="text-xs text-slate-600 font-mono">
                                            {eq.serial_number || '-'}
                                          </span>
                                        </TableCell>
                                        <TableCell className="py-1.5">
                                          <Badge variant="outline" className="text-[10px] bg-white whitespace-nowrap">
                                            {eq.status || 'Active'}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
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
          value={itemsPerPage || 25}
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
          Page {currentPage || 1} of {totalPages || 1}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={(currentPage || 1) === 1}
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
  <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden p-4 space-y-3">

    {(() => { const bid = currentCompany?.id || null; const branchList = bid ? projects.filter(p => p && p.branch_id === bid) : (projects||[]); console.log('[Projects] ▶️ render Document Matrix', { selectedBranchId: bid, total: (projects||[]).length, branchFiltered: branchList.length, sample: branchList.slice(0,3).map(p => ({id:p.id, name:p.name})) }); return null; })()}
    {/* Matrix usa projects filtrados por branch para evitar null */}
    <LocalErrorBoundary>
      <ProjectDocumentMatrixTab
        isAdmin={isAdmin}
        branchId={null}
        projects={filteredProjects || []}
      />
    </LocalErrorBoundary>
  </div>
)}


{showDetailsPanel && selectedProject && (
  <ProjectDetailsPanel
    project={selectedProject}
    isOpen={showDetailsPanel}
    onClose={() => {
      setShowDetailsPanel(false);
      setSelectedProject(null);
    }}
    onProjectUpdated={handleProjectUpdated}
    onProjectDeleted={handleProjectDeleted}
    onOpenWorkOrder={handleOpenWorkOrder}
    customers={customers || []}
    projectCategories={projectCategories || []}
    clientEquipments={clientEquipments || []}
  />
)}

{showAddPanel && (
  <AddProjectPanel
    isOpen={showAddPanel}
    onClose={() => setShowAddPanel(false)}
    customers={customers || []}
    onProjectAdded={handleProjectCreated}
  />
)}

{showSettingsPanel && (
  <ProjectSettingsPanel
    isOpen={showSettingsPanel}
    onClose={() => setShowSettingsPanel(false)}
    onSettingsChanged={async () => {
      try {
        const mod = await import('@/entities/all');
        const list = mod?.ProjectCategory?.list
          ? await mod.ProjectCategory.list('sort_order')
          : await base44.entities.ProjectCategory.list('sort_order', 1000);
        setProjectCategories(Array.isArray(list) ? list : []);
      } catch (e) {
        try {
          const list = await base44.entities.ProjectCategory.list('sort_order', 1000);
          setProjectCategories(Array.isArray(list) ? list : []);
        } catch {
          setProjectCategories([]);
        }
      }
    }}
    onCompanyUpdated={(updatedCompany) => {
      // Force re-render with updated icon
    }}
  />
)}

{showEquipmentPanel && selectedEquipment && (
   <EquipmentDetailsPanel
     isOpen={showEquipmentPanel}
     onClose={() => {
       setShowEquipmentPanel(false);
       setSelectedEquipment(null);
     }}
     equipment={selectedEquipment}
     customers={customers || []}
     projects={projects || []}
     onEquipmentUpdated={(updated) => {
       setClientEquipments(prev => prev.map(eq => eq.id === updated.id ? updated : eq));
       setSelectedEquipment(updated);
     }}
     onEquipmentDeleted={async () => {
       setShowEquipmentPanel(false);
       setSelectedEquipment(null);
       if (typeof loadPageData === 'function') await loadPageData();
     }}
     isAdmin={isAdmin}
   />
)}
             </div>
      );
      }