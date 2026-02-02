import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/components/DataProvider';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Settings, Eye, ChevronDown, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { AlertTriangle } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import WorkOrderPDFDialog from '@/components/workorders/WorkOrderPDFDialog';
import WorkOrderDetailsDialog from '@/components/workorders/WorkOrderDetailsDialog';
import OrdersSettingsPanel from '@/components/orders/OrdersSettingsPanel';
import OrdersDocumentMatrixTab from '@/components/workorders/OrdersDocumentMatrixTab';
import UrgentOrderDialog from '@/components/workorders/UrgentOrderDialog';

export default function JobOrdersPage() {
  const { 
    loadUsers, 
    loadProjects, 
    loadCustomers, 
    loadAssets, 
    loadWorkOrderCategories, 
    loadShiftTypes, 
    loadClientEquipments,
    teams: contextTeams,
    currentUser,
    currentCompany
  } = useData();
  
  const [workOrders, setWorkOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [clientEquipments, setClientEquipments] = useState([]);
  const [workingReports, setWorkingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [withEquipment, setWithEquipment] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRows, setSelectedRows] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [showPDFDialog, setShowPDFDialog] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUrgentDialog, setShowUrgentDialog] = useState(false);
const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [ordersOpenLabel, setOrdersOpenLabel] = useState('Open');
  const [ordersClosedLabel, setOrdersClosedLabel] = useState('Closed');
  const [forceReload, setForceReload] = useState(false);
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  // Day navigation helpers
  const selectedDayMode = createdFrom && createdTo && createdFrom === createdTo;
  const shiftDay = (delta) => {
    const base = selectedDayMode ? new Date(createdFrom) : new Date();
    const next = addDays(base, delta);
    const iso = next.toISOString().slice(0, 10);
    setCreatedFrom(iso);
    setCreatedTo(iso);
  };
  const setToday = () => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    setCreatedFrom(iso);
    setCreatedTo(iso);
  };
  const dayLabel = selectedDayMode ? format(new Date(createdFrom), 'EEE dd/MM') : 'All dates';
  // groupBy removed - always grouped by job

  const safeUsers = Array.isArray(users) ? users : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : [];
  const safeClientEquipments = Array.isArray(clientEquipments) ? clientEquipments : [];
  
  const formatWONumber = (n) => {
    if (!n) return '';
    const s = String(n).trim();
    if (/^\d{3,4}\/\d{2}$/i.test(s)) return s; // already like 0019/26
    const m2 = s.match(/^WO-(\d{3,4})\/(\d{2})$/i); // WO-019/26
    if (m2) return `${m2[1]}/${m2[2]}`;
    const m3 = s.match(/^WR-(\d{4})-(\d{1,4})$/i); // WR-2026-0019
    if (m3) return `${m3[2].padStart(4,'0')}/${m3[1].slice(-2)}`;
    const m4 = s.match(/^WO-(\d{4})-(\d{1,4})$/i); // WO-2026-0019
    if (m4) return `${m4[2].padStart(4,'0')}/${m4[1].slice(-2)}`;
    // Any other legacy/free-text formats are invalid for display
    return '-';
  };

  // Smart formatter: handles plain numbers and patterns like "N12" using the reference date for year
  const formatWONumberSmart = (n, refISO) => {
    if (!n) return '';
    const s = String(n).trim();
    const plain = s.match(/^(\d{1,4})$/);
    const nMatch = s.match(/^N(\d{1,6})$/i);
    const yy = (() => {
      if (!refISO) return new Date().getFullYear().toString().slice(-2);
      try { return new Date(refISO).getFullYear().toString().slice(-2); } catch { return new Date().getFullYear().toString().slice(-2); }
    })();
    if (plain) {
      return `${plain[1].padStart(4,'0')}/${yy}`;
    }
    if (nMatch) {
      const num = nMatch[1];
      if (num.length <= 4) {
        return `${num.padStart(4,'0')}/${yy}`;
      }
    }
    return formatWONumber(s);
  };

  // Parse serials like 0018/26 -> 260018 for sorting; N12 -> 12 (fallback)
  const parseSerial = (s) => {
    if (!s) return -1;
    const m = String(s).trim().match(/^(\d{3,4})\/(\d{2})$/);
    if (m) return parseInt(m[2] + m[1], 10);
    const n = String(s).trim().match(/^N(\d{1,6})$/i);
    if (n) return parseInt(String(n[1]).padStart(4,'0'), 10);
    return -1;
  };

  // Format date in Asia/Dubai timezone for dd/MM/yy
  const formatDateInDubai = (iso) => {
    if (!iso) return '-';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dubai',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }).format(new Date(iso));
    } catch (e) {
      try { return format(parseISO(iso), 'dd/MM/yy'); } catch { return '-'; }
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Mantener equipos sincronizados con el DataProvider
  useEffect(() => {
    setTeams(contextTeams || []);
  }, [contextTeams]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [usersData, projectsData, customersData, assetsData, categoriesData, shiftTypesData, clientEquipmentsData, entriesData, workingReportsData] = await Promise.all([
        loadUsers(),
        loadProjects(),
        loadCustomers(),
        loadAssets(),
        loadWorkOrderCategories(),
        loadShiftTypes(),
        loadClientEquipments(),
        base44.entities.TimeEntry.list('-updated_date', 2000),
        base44.entities.WorkingReport.list('-updated_date', 2000)
      ]);

      setUsers(usersData || []);
      setProjects(projectsData || []);
      setCustomers(customersData || []);
      setAssets(assetsData || []);
      setCategories(categoriesData || []);
      setShiftTypes(shiftTypesData || []);
      setClientEquipments(clientEquipmentsData || []);
      setTeams(contextTeams || []);
      setWorkOrders(entriesData || []);
      setWorkingReports(workingReportsData || []);

      // Disabled auto-fix to speed up page load. Use the "Asignar números WO" button when needed.

      // Disabled auto-renumber on load to avoid delays.

      // Removed auto-normalization of WO numbers to avoid unintended renumbering

      try {
        const [openSetting] = await base44.entities.AppSettings.filter({ setting_key: 'orders_column_open_label' });
        const [closedSetting] = await base44.entities.AppSettings.filter({ setting_key: 'orders_column_closed_label' });
        if (openSetting?.setting_value) setOrdersOpenLabel(openSetting.setting_value);
        if (closedSetting?.setting_value) setOrdersClosedLabel(closedSetting.setting_value);
      } catch (e) { /* ignore */ }

      // Disabled background backfill on load.

      console.log('✅ All data loaded:', {
        users: usersData?.length,
        projects: projectsData?.length,
        customers: customersData?.length,
        categories: categoriesData?.length
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixWONumbers = async () => {
    try {
      toast.info('Asignando números de WO...');
      try {
        await base44.functions.invoke('runRenumberWorkOrdersApply', {});
      } catch (err) {
        await base44.functions.invoke('backfillMissingWon', { dry_run: false, limit: 10000 });
      }
      const reloaded = await base44.entities.TimeEntry.list('-updated_date', 2000);
      setWorkOrders(reloaded || []);
      toast.success('Números de WO actualizados');
    } catch (e) {
      console.error('Fix WO numbers failed:', e);
      toast.error('No se pudieron actualizar los números');
    }
  };

  const loadWorkOrders = async () => {
    try {
      const entries = await base44.entities.TimeEntry.list('-updated_date');
      setWorkOrders(entries || []);
    } catch (error) {
      console.error('Error loading work orders:', error);
    }
  };

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      // With equipment filter
      if (withEquipment && (!wo.equipment_ids || wo.equipment_ids.length === 0)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && wo.work_order_category_id !== selectedCategory) {
        return false;
      }

      // Date range filter (planned_start_time)
      if (createdFrom || createdTo) {
        if (!wo.planned_start_time) return false;
        const date = parseISO(wo.planned_start_time);
        if (createdFrom) {
          const from = startOfDay(new Date(createdFrom));
          if (date < from) return false;
        }
        if (createdTo) {
          const to = endOfDay(new Date(createdTo));
          if (date > to) return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const project = safeProjects.find(p => p.id === wo.project_id);
        let customer = null;
        if (project) customer = safeCustomers.find(c => c.id === project.customer_id) || null;
        if (!customer && wo.customer_id) customer = safeCustomers.find(c => c.id === wo.customer_id) || null;
        const category = safeCategories.find(c => c.id === wo.work_order_category_id);

        const matchesSearch = 
          wo.title?.toLowerCase().includes(query) ||
          wo.work_order_number?.toLowerCase().includes(query) ||
          project?.name?.toLowerCase().includes(query) ||
          customer?.name?.toLowerCase().includes(query) ||
          category?.name?.toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [workOrders, searchQuery, withEquipment, selectedCategory, createdFrom, createdTo, safeProjects, safeCustomers, safeCategories]);

  const groupedWorkOrders = useMemo(() => {
    const groups = {};

    // Siempre agrupar por Job (título o número)
    filteredWorkOrders.forEach(wo => {
      const key = wo.title || wo.work_order_number || 'Untitled';
      if (!groups[key]) groups[key] = [];
      groups[key].push(wo);
    });

    let grouped = Object.entries(groups).map(([title, orders]) => {
          const openDateObj = orders.reduce((min, o) => {
            const d = o.planned_start_time ? parseISO(o.planned_start_time) : null;
            if (!d) return min;
            return (!min || d < min) ? d : min;
          }, null);
          const fallback = orders.reduce((min, o) => {
            const d = o.created_date ? parseISO(o.created_date) : null;
            if (!d) return min;
            return (!min || d < min) ? d : min;
          }, null);
          const openDate = (openDateObj || fallback)?.toISOString() || null;
          return {
            title,
            orders,
            firstOrder: orders[0],
            openDate
          };
        });

    grouped.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title': {
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        }
        case 'client': {
          const aProject = safeProjects.find(p => p.id === a.firstOrder.project_id);
          const bProject = safeProjects.find(p => p.id === b.firstOrder.project_id);
          const aCustomer = aProject ? safeCustomers.find(c => c.id === aProject.customer_id) : null;
          const bCustomer = bProject ? safeCustomers.find(c => c.id === bProject.customer_id) : null;
          aValue = aCustomer?.name || '';
          bValue = bCustomer?.name || '';
          break;
        }
        case 'project': {
          const aProj = safeProjects.find(p => p.id === a.firstOrder.project_id);
          const bProj = safeProjects.find(p => p.id === b.firstOrder.project_id);
          aValue = aProj?.name || '';
          bValue = bProj?.name || '';
          break;
        }
        case 'category': {
          const aCat = safeCategories.find(c => c.id === a.firstOrder.work_order_category_id);
          const bCat = safeCategories.find(c => c.id === b.firstOrder.work_order_category_id);
          aValue = aCat?.name || '';
          bValue = bCat?.name || '';
          break;
        }
        case 'created_date': {
          // Sort by earliest scheduled date (open date)
          aValue = a.openDate || '';
          bValue = b.openDate || '';
          break;
        }
        case 'finish_date': {
          const aClosedOrders = a.orders.filter(o => o.status === 'closed');
          const bClosedOrders = b.orders.filter(o => o.status === 'closed');
          aValue = aClosedOrders.length > 0 
            ? aClosedOrders.reduce((latest, order) => {
                const orderDate = order.updated_date ? parseISO(order.updated_date) : null;
                if (!latest || (orderDate && orderDate > latest)) {
                  return orderDate;
                }
                return latest;
              }, null)?.toISOString() || ''
            : '';
          bValue = bClosedOrders.length > 0 
            ? bClosedOrders.reduce((latest, order) => {
                const orderDate = order.updated_date ? parseISO(order.updated_date) : null;
                if (!latest || (orderDate && orderDate > latest)) {
                  return orderDate;
                }
                return latest;
              }, null)?.toISOString() || ''
            : '';
          break;
        }
        case 'wo_number': {
          aValue = parseSerial(a.firstOrder.work_order_number);
          bValue = parseSerial(b.firstOrder.work_order_number);
          break;
        }
        case 'wr_number': {
          const getMinWR = (grp) => {
            let min = Infinity;
            const ids = new Set(grp.orders.map(o=>o.id));
            (workingReports || []).forEach((wr) => {
              if (ids.has(wr.time_entry_id)) {
                const val = parseSerial(wr.report_number);
                if (val >= 0 && val < min) min = val;
              }
            });
            return isFinite(min) ? min : -1;
          };
          aValue = getMinWR(a);
          bValue = getMinWR(b);
          break;
        }
        default: {
          aValue = '';
          bValue = '';
        }
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
    });

    return grouped;
  }, [filteredWorkOrders, sortBy, sortOrder, safeProjects, safeCustomers, safeCategories]);

  const handleViewPDF = async (wo) => {
    const project = safeProjects.find(p => p.id === wo.project_id);
    const customer = project ? safeCustomers.find(c => c.id === project.customer_id) : (wo.customer_id ? safeCustomers.find(c => c.id === wo.customer_id) : null);
    const assignedUserIds = new Set([...(wo.employee_ids || [])]);
    if (wo.employee_id && !assignedUserIds.has(wo.employee_id)) assignedUserIds.add(wo.employee_id);
    const assignedUsers = safeUsers.filter(u => assignedUserIds.has(u.id));
    const assignedTeams = safeTeams.filter(t => (wo.team_ids || []).includes(t.id));
    const assignedAssets = [...safeAssets, ...safeClientEquipments].filter(a => (wo.equipment_ids || []).includes(a.id));
    const woCategory = safeCategories.find(c => c.id === wo.work_order_category_id);
    const shiftType = safeShiftTypes.find(s => s.id === wo.shift_type_id);

    let branchData = null;
    try {
      const branchId = wo.branch_id || project?.branch_id || null;
      if (branchId) {
        const arr = await base44.entities.Branch.filter({ id: branchId }, '-updated_date', 1);
        branchData = (arr && arr[0]) || null;
      }
    } catch (e) {
      console.warn('Failed to load branch for PDF', e);
    }

    setShowPDFDialog({
      workOrder: wo,
      project,
      customer,
      branch: branchData,
      assignedUsers,
      assignedTeams,
      assignedAssets,
      woCategory,
      shiftType
    });
  };

  const toggleRowSelection = (woId) => {
    setSelectedRows(prev => 
      prev.includes(woId) ? prev.filter(id => id !== woId) : [...prev, woId]
    );
  };

  const toggleAllRows = () => {
    if (selectedRows.length === groupedWorkOrders.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(groupedWorkOrders.map(g => `group-${g.title}`));
    }
  };

  const toggleRowExpansion = (woId) => {
    setExpandedRows(prev => 
      prev.includes(woId) ? prev.filter(id => id !== woId) : [...prev, woId]
    );
  };

  const handleCreateJobOrder = () => {
    setSelectedEntry(null);
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  const handleEditJobOrder = (order) => {
    setSelectedEntry(order);
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  const handleSaveJobOrder = async (formData) => {
    try {
      setIsSaving(true);
      // Enforce branch_id presence (block creation without it)
      if (isCreating) {
        const project = projects.find(p => p.id === formData.project_id);
        const resolvedBranch = formData.branch_id || project?.branch_id || currentCompany?.id;
        if (!resolvedBranch) {
          alert('Cannot create: missing Branch. Select a Project linked to a Branch or set a company.');
          return;
        }
        await base44.entities.TimeEntry.create({ ...formData, branch_id: resolvedBranch });
      } else {
        await base44.entities.TimeEntry.update(selectedEntry.id, formData);
      }
      await loadAllData();
      setIsDialogOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error saving job order:', error);
      alert('Failed to save job order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteJobOrder = async (entryId) => {
    try {
      await base44.entities.TimeEntry.delete(entryId);
      // Actualización local (sin refrescar toda la página ni perder el scroll/filtros)
      setWorkOrders((prev) => prev.filter((wo) => wo.id !== entryId));
      setIsDialogOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error deleting job order:', error);
      alert('Failed to delete job order');
    }
  };

    const toggleOrderStatus = async (order) => {
      const next = order.status === 'open' ? 'closed' : 'open';
      await base44.entities.TimeEntry.update(order.id, { status: next });
      setWorkOrders(prev => prev.map(wo => wo.id === order.id ? { ...wo, status: next } : wo));
    };

     const renderCollapsedRows = (group) => {
    const byKey = new Map();
    group.orders.forEach(o => {
      const key = o.work_order_number || `${(o.planned_start_time||'').slice(0,16)}_${(o.team_ids && o.team_ids[0]) || o.team_id || 'none'}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { base: o, users: new Set(o.employee_ids || []) });
      } else {
        (o.employee_ids || []).forEach(id => existing.users.add(id));
        if ((o.start_time && !existing.base.start_time) || (o.end_time && !existing.base.end_time)) {
          existing.base = o;
        }
      }
    });
    const collapsed = Array.from(byKey.values()).map(v => ({ ...v.base, employee_ids: Array.from(v.users) }));
    return collapsed
      .sort((a, b) => {
        const dateA = a.planned_start_time ? new Date(a.planned_start_time).getTime() : 0;
        const dateB = b.planned_start_time ? new Date(b.planned_start_time).getTime() : 0;
        return dateB - dateA;
      })
      .map((order) => {
        const firstInstruction = order.work_description_items?.[0]?.text || order.task || '-';
        const assignedUserIds = new Set([...(order.employee_ids || [])]);
        if (order.employee_id && !assignedUserIds.has(order.employee_id)) assignedUserIds.add(order.employee_id);
        (order.team_ids || []).forEach(teamId => {
          safeUsers.forEach(u => { if (u.team_id === teamId) assignedUserIds.add(u.id); });
        });
        const assignedUsers = safeUsers.filter(u => assignedUserIds.has(u.id));
        const clockIn = order.start_time ? format(parseISO(order.start_time), 'MM/dd HH:mm') : '-';
        const clockOut = order.end_time ? format(parseISO(order.end_time), 'MM/dd HH:mm') : '-';
        const totalTime = order.duration_minutes ? `${Math.floor(order.duration_minutes / 60)}h ${order.duration_minutes % 60}m` : '-';
        const orderDate = order.planned_start_time ? format(parseISO(order.planned_start_time), 'dd/MM/yy') : '-';
        const equipmentIds = order.equipment_ids || [];
        const allEquipment = [...safeAssets, ...safeClientEquipments];
        const orderEquipment = allEquipment.filter(eq => equipmentIds.includes(eq.id));

        const wrForOrder = (workingReports || []).find(w => w.time_entry_id === order.id);
        const ref = order.start_time || order.planned_start_time || order.created_date;
        const yy = ref ? new Date(ref).getFullYear().toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
        const finalNum = wrForOrder?.report_number
          ? formatWONumberSmart(wrForOrder.report_number, wrForOrder.created_date || ref)
          : '-';

        return (
          <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 h-9">
            <td className="px-3 py-1.5">
              <span className="text-[11px] font-medium text-indigo-600">{finalNum || '-'}</span>
            </td>
            <td className="px-3 py-1.5">
              <span className="text-[11px] text-slate-600">{orderDate}</span>
            </td>
            <td className="px-3 py-1.5">
              {orderEquipment.length > 0 ? (
                <div className="flex items-center gap-1">
                  {orderEquipment.slice(0, 2).map(eq => (
                    <div key={eq.id} className="w-5 h-5 rounded-full bg-slate-800 border border-white flex items-center justify-center" title={eq.name}>
                      <span className="text-[8px] text-white font-bold">{eq.name?.substring(0, 2).toUpperCase() || 'EQ'}</span>
                    </div>
                  ))}
                  {orderEquipment.length > 2 && (
                    <span className="text-[10px] text-slate-500 ml-1">+{orderEquipment.length - 2}</span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">-</span>
              )}
            </td>
            <td className="px-3 py-1.5">
              <span className="text-[11px] text-slate-700 truncate block max-w-[200px]">{firstInstruction}</span>
            </td>
            <td className="px-3 py-1.5">
              <div className="flex items-center -space-x-2">
                {assignedUsers.length > 0 ? (
                  assignedUsers.slice(0, 4).map((user, idx) => (
                    <div key={user.id} className="relative" style={{ zIndex: assignedUsers.length - idx }}>
                      <Avatar user={user} size="xs" />
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400">-</span>
                )}
                {assignedUsers.length > 4 && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-[9px] font-medium text-slate-600">
                    +{assignedUsers.length - 4}
                  </div>
                )}
              </div>
            </td>
            <td className="px-3 py-1.5">
              <span className="text-[11px] text-slate-600">{clockIn}</span>
            </td>
            <td className="px-3 py-1.5">
              <span className="text-[11px] text-slate-600">{clockOut}</span>
            </td>
            <td className="px-3 py-1.5">
              <span className="text-[11px] font-medium text-slate-700">{totalTime}</span>
            </td>
            <td className="px-3 py-1.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleOrderStatus(order)} className="h-6 px-2 text-[10px]">
                  {order.status === 'open' ? 'Close' : 'Open'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEditJobOrder(order)} className="h-6 px-2 text-[10px] text-slate-600 hover:text-slate-700 hover:bg-slate-100">Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleViewPDF(order)} className="h-6 w-6 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                  <Eye className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (window.confirm('Delete this work order?')) handleDeleteJobOrder(order.id); }}
                  className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        );
      });
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
            <span className="text-lg">📋</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Orders</h1>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowSettings(true)}>
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex gap-2">
        <Button variant={activeTab==='list' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('list')}>List</Button>
        <Button variant={activeTab==='documents' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('documents')}>Document Matrix</Button>
      </div>

      {activeTab === 'list' ? (
        <>
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">


            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {safeCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <Input type="date" value={createdFrom} onChange={(e)=>setCreatedFrom(e.target.value)} className="h-9 w-36" />
              <span className="text-slate-400 text-xs">to</span>
              <Input type="date" value={createdTo} onChange={(e)=>setCreatedTo(e.target.value)} className="h-9 w-36" />
              {(createdFrom || createdTo) && (
                <Button variant="ghost" size="sm" className="h-9" onClick={()=>{ setCreatedFrom(''); setCreatedTo(''); }}>
                  Clear
                </Button>
              )}
            </div>

            {/* Day navigator (prev / next / today) */}
            <div className="flex items-center gap-1 ml-2">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftDay(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-[120px] text-xs text-slate-600 text-center">
                {dayLabel}
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftDay(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={setToday}>
                Today
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search job orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Job Title</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="created_date">{ordersOpenLabel}</SelectItem>
                  <SelectItem value="finish_date">{ordersClosedLabel}</SelectItem>
                  <SelectItem value="wo_number">WO N</SelectItem>
                  <SelectItem value="wr_number">WR N</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withEquipment}
                onChange={(e) => setWithEquipment(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-sm text-slate-700">With Equipment</span>
            </label>
          </div>

          <div className="flex items-center gap-2 ml-auto">

            <Button 
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              onClick={handleCreateJobOrder}
            >
              <Plus className="w-4 h-4" />
              Job Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowUrgentDialog(true)}
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Urgent Order
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th 
                className="text-left px-2 py-1 text-xs font-semibold text-slate-700 h-8 cursor-pointer hover:bg-slate-100"
                onClick={() => { setSortBy('title'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              >
                Working Order {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left px-2 py-1 text-xs font-semibold text-slate-700 h-8">WO #</th>
              <th 
                className="text-left px-2 py-1 text-xs font-semibold text-slate-700 h-8 cursor-pointer hover:bg-slate-100"
                onClick={() => { setSortBy('client'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              >
                Client {sortBy === 'client' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left px-2 py-1 text-xs font-semibold text-slate-700 h-8 cursor-pointer hover:bg-slate-100"
                onClick={() => { setSortBy('project'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              >
                Project {sortBy === 'project' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left px-2 py-1 text-xs font-semibold text-slate-700 h-8 cursor-pointer hover:bg-slate-100"
                onClick={() => { setSortBy('category'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              >
                Categories {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left px-2 py-1 text-xs font-semibold text-slate-700 h-8 cursor-pointer hover:bg-slate-100"
                onClick={() => { setSortBy('created_date'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
                >
                  {ordersOpenLabel} {sortBy === 'created_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              <th 
                className="text-left px-2 py-1 text-xs font-semibold text-slate-700 h-8 cursor-pointer hover:bg-slate-100"
                onClick={() => { setSortBy('finish_date'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
                >
                  {ordersClosedLabel} {sortBy === 'finish_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              <th className="text-center px-2 py-1 text-xs font-semibold text-slate-700 h-8 w-16"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-12 text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : groupedWorkOrders.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-12 text-slate-500">
                  No job orders found
                </td>
              </tr>
            ) : (
              groupedWorkOrders.map((group) => {
                const wo = group.firstOrder;
                const project = safeProjects.find(p => p.id === wo.project_id);
                const customer = project ? safeCustomers.find(c => c.id === project.customer_id) : null;
                const category = safeCategories.find(c => c.id === wo.work_order_category_id);
                
                // Find the most recent closed order to get finish date
                const closedOrders = group.orders.filter(o => o.status === 'closed');
                const isClosed = closedOrders.length > 0;
                const finishDate = closedOrders.length > 0 
                  ? closedOrders.reduce((latest, order) => {
                      const orderDate = order.updated_date ? parseISO(order.updated_date) : null;
                      if (!latest || (orderDate && orderDate > latest)) {
                        return orderDate;
                      }
                      return latest;
                    }, null)
                  : null;
                
                const groupId = `group-${group.title}`;
                const isSelected = selectedRows.includes(groupId);
                const isExpanded = expandedRows.includes(groupId);



                return (
                    <React.Fragment key={groupId}>
                    <tr
                      key={`${groupId}-main`}
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer h-9",
                        isSelected && "bg-indigo-50"
                      )}
                      onClick={() => toggleRowSelection(groupId)}
                    >
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(groupId);
                            }}
                            className="hover:bg-slate-200 rounded p-1 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <span className="text-xs font-medium text-slate-900">
                            {group.title}
                          </span>
                          {group.orders.length > 1 && (
                            <Badge variant="outline" className="text-[10px] ml-2">
                              {group.orders.length} reports
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <span className={cn("text-xs font-medium", wo?.archived ? "text-slate-500 line-through" : "text-slate-700")}>{wo?.work_order_number ? formatWONumberSmart(wo.work_order_number, wo.start_time || wo.planned_start_time || wo.created_date) : ''}</span>
                      </td>
                      <td className="px-2 py-1">
                        <span className="text-xs text-slate-700 truncate block">
                          {customer?.name || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <span className="text-xs text-slate-700 truncate block">
                          {project?.name || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        {category ? (
                          <Badge variant="outline" className="text-[10px]">
                            {category.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <span className="text-[10px] text-slate-600">
                          {group.openDate ? formatDateInDubai(group.openDate) : '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <span className="text-[10px] text-slate-600">
                          {finishDate ? format(finishDate, 'MM/dd/yyyy') : '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                        <Badge variant={isClosed ? 'default' : 'outline'} className="text-[10px]">
                          {isClosed ? 'Closed' : 'Open'}
                        </Badge>
                      </td>
                    </tr>
{isExpanded ? (
                      <tr key={`${groupId}-exp`} className="bg-white">
                        <td colSpan="8" className="px-12 py-6">
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            {/* Work Order Reports */}
                            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                              <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                                <span>📋</span>
                                {(() => { const map=new Map(); group.orders.forEach(o=>{ const key = o.work_order_number || `${(o.planned_start_time||'').slice(0,16)}_${(o.team_ids && o.team_ids[0]) || o.team_id || 'none'}`; map.set(key,true); }); return `Work Order Reports (${map.size})`; })()}
                              </h4>
                            </div>
                            <table className="w-full">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8">WR #</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8">Scheduled date</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8">Equipment</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8">Instruction</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8">Users</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8">Clock In</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8">Clock Out</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8">Total Hrs</th>
                                  <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase h-8 w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {renderCollapsedRows(group)}
                              </tbody>


                            </table>

                            {/* All Attached Documents from all orders */}
                            {(() => {
                              const allDocs = group.orders.flatMap(o => o.file_urls || []);
                              return allDocs.length > 0 && (
                                <>
                                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 mt-6">
                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                      <span>📎</span>
                                      Other Attached Documents ({allDocs.length})
                                    </h4>
                                  </div>
                                  <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                      <tr>
                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">Document</th>
                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">Type</th>
                                        <th className="text-center px-4 py-2 text-xs font-semibold text-slate-600">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {allDocs.map((fileUrl, index) => {
                                        const fileName = fileUrl.split('/').pop() || `Document ${index + 1}`;
                                        const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

                                        return (
                                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                              <span className="text-sm text-slate-700">{fileName}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                              <Badge variant="outline" className="text-xs">
                                                {fileExt === 'pdf' ? 'PDF' : fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'png' ? 'Image' : 'Document'}
                                              </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(fileUrl, '_blank')}
                                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                              >
                                                View
                                              </Button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

        </>
       ) : (
         <div className="p-6">
          <OrdersDocumentMatrixTab entries={workOrders} categories={safeCategories} />
        </div>
      )}

      {/* PDF Dialog */}
      {showPDFDialog && (
        <WorkOrderPDFDialog
          workOrder={showPDFDialog.workOrder}
          project={showPDFDialog.project}
          customer={showPDFDialog.customer}
          branch={showPDFDialog.branch}
          assignedUsers={showPDFDialog.assignedUsers}
          assignedTeams={showPDFDialog.assignedTeams}
          assignedAssets={showPDFDialog.assignedAssets}
          woCategory={showPDFDialog.woCategory}
          shiftType={showPDFDialog.shiftType}
          onClose={() => setShowPDFDialog(null)}
        />
      )}

      <OrdersSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
{/* Job Order Dialog */}
      <WorkOrderDetailsDialog
        isOpen={isDialogOpen}
        entry={selectedEntry}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedEntry(null);
        }}
        onSave={handleSaveJobOrder}
        onDelete={handleDeleteJobOrder}
        projects={safeProjects}
        users={safeUsers}
        teams={safeTeams}
        customers={safeCustomers}
        assets={safeAssets}
        clientEquipments={safeClientEquipments}
        categories={safeCategories}
        shiftTypes={safeShiftTypes}
        isCreating={isCreating}
        isSaving={isSaving}
        allEntries={workOrders}
        onSelectExistingWorkOrder={(wo) => {
          setIsCreating(false);
          setSelectedEntry(wo);
        }}
        onCreateNewWorkOrder={() => {
          setIsCreating(true);
          setSelectedEntry(null);
        }}
      />

      <UrgentOrderDialog
        isOpen={showUrgentDialog}
        onClose={() => setShowUrgentDialog(false)}
        projects={safeProjects}
        currentUser={currentUser}
        currentCompany={currentCompany}
        onCreated={async () => {
          await loadAllData();
          setShowUrgentDialog(false);
        }}
      />
    </div>
  );
}