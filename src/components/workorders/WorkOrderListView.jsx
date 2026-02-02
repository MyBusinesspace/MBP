import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import UnifiedToolbar from './UnifiedToolbar';
import {
  Trash2,
  Loader2,
  RefreshCw,
  ArchiveX,
  FileDown
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import TeamAvatar from '../shared/TeamAvatar';

export default function WorkOrderListView({
  entries = [],
  projects = [],
  users = [],
  teams = [],
  customers = [],
  assets = [],
  categories = [],
  shiftTypes = [],
  projectCategories = [],
  isRefreshing = false,
  onRefresh,
  onEditWorkOrder,
  onBulkDelete,
  onBulkArchive,
  isReadOnly = false,
  selectedEntries,
  onToggleSelection,
  onViewModeChange,
  viewMode = 'list'
}) {
  const [sortBy, setSortBy] = useState('default');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewPeriod, setViewPeriod] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  
  // ✅ NUEVOS FILTROS POR TABS
  const [filterRecurring, setFilterRecurring] = useState('all'); // 'all', 'recurring', 'standard'
  const [filterProjectCategory, setFilterProjectCategory] = useState('all'); // 'all' or category_id
  const [filterWOCategory, setFilterWOCategory] = useState('all'); // 'all' or category_id

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedEntries.size === tableEntries.length && tableEntries.length > 0) {
      tableEntries.forEach(entry => {
        if (selectedEntries.has(entry.id)) {
          onToggleSelection(entry.id);
        }
      });
    } else {
      tableEntries.forEach(entry => {
        if (!selectedEntries.has(entry.id)) {
          onToggleSelection(entry.id);
        }
      });
    }
  };

   const toggleStatus = async (ev, entry) => {
     if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
     const next = entry.status === 'open' ? 'closed' : 'open';
     await base44.entities.TimeEntry.update(entry.id, { status: next });
     if (typeof onRefresh === 'function') onRefresh();
   };

   const handleNavigate = (direction) => {
    if (viewPeriod === 'day') {
      if (direction === 0) {
        setCurrentDate(new Date());
      } else {
        setCurrentDate(prev => addDays(prev, direction));
      }
    } else if (viewPeriod === 'week') {
      if (direction === 0) {
        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
      } else {
        setCurrentWeekStart(prev => addWeeks(prev, direction));
      }
    } else if (viewPeriod === 'month') {
      if (direction === 0) {
        setCurrentMonth(new Date());
      } else {
        setCurrentMonth(prev => addMonths(prev, direction));
      }
    }
  };

  const getPeriodLabel = () => {
    if (viewPeriod === 'day') {
      return format(currentDate, 'MMMM d, yyyy - EEEE');
    } else if (viewPeriod === 'week') {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      return `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else if (viewPeriod === 'month') {
      return format(currentMonth, 'MMMM yyyy');
    }
    return 'All Work Orders';
  };

  const filteredByPeriod = useMemo(() => {
    // Custom date range filter
    if (dateFrom || dateTo) {
      return entries.filter(entry => {
        if (!entry.planned_start_time) return false;
        try {
          const entryDate = entry.planned_start_time
            ? parseISO(entry.planned_start_time)
            : entry.start_time
            ? parseISO(entry.start_time)
            : entry.task_start_date
            ? parseISO(entry.task_start_date + 'T00:00:00')
            : null;
          const fromDate = dateFrom ? new Date(dateFrom) : null;
          const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;
          
          if (fromDate && entryDate < fromDate) return false;
          if (toDate && entryDate > toDate) return false;
          return true;
        } catch (error) {
          return false;
        }
      });
    }

    if (viewPeriod === 'all') return entries;

    return entries.filter(entry => {
      if (!entry.planned_start_time) return false;
      try {
        const entryDate = parseISO(entry.planned_start_time);

        if (viewPeriod === 'day') {
          return isSameDay(entryDate, currentDate);
        } else if (viewPeriod === 'week') {
          const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
          return isWithinInterval(entryDate, { start: currentWeekStart, end: weekEnd });
        } else if (viewPeriod === 'month') {
          const monthStart = startOfMonth(currentMonth);
          const monthEnd = endOfMonth(currentMonth);
          return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
        }
        return true;
      } catch (error) {
        console.error("Error parsing planned_start_time:", entry.planned_start_time, error);
        return false;
      }
    });
  }, [entries, viewPeriod, currentDate, currentWeekStart, currentMonth, dateFrom, dateTo]);

  // ✅ APLICAR TODOS LOS FILTROS
  const filteredByAdvancedFilters = useMemo(() => {
    let filtered = [...filteredByPeriod];
    
    // 1️⃣ Filtro de recurrencia
    if (filterRecurring === 'recurring') {
      filtered = filtered.filter(entry => {
        if (entry.is_repeating === true) return true; // ✅ CHANGED
        
        if (entry.activity_log && Array.isArray(entry.activity_log)) {
          const hasRecurringCreation = entry.activity_log.some(log => {
            return log.action === 'Created' && 
                   log.details && 
                   (log.details.includes('repeating from') || // ✅ CHANGED
                    log.details.includes('(repeating)')); // ✅ CHANGED
          });
          if (hasRecurringCreation) return true;
        }
        return false;
      });
    } else if (filterRecurring === 'standard') {
      filtered = filtered.filter(entry => {
        if (entry.is_repeating === true) return false; // ✅ CHANGED
        
        if (entry.activity_log && Array.isArray(entry.activity_log)) {
          const hasRecurringCreation = entry.activity_log.some(log => {
            return log.action === 'Created' && 
                   log.details && 
                   (log.details.includes('repeating from') || // ✅ CHANGED
                    log.details.includes('(repeating)')); // ✅ CHANGED
          });
          if (hasRecurringCreation) return false;
        }
        return true;
      });
    }
    
    // 2️⃣ Filtro de categoría de proyecto
    if (filterProjectCategory !== 'all') {
      filtered = filtered.filter(entry => {
        const project = projects.find(p => p.id === entry.project_id);
        if (!project || !project.category_ids || !Array.isArray(project.category_ids)) {
          return false;
        }
        return project.category_ids.includes(filterProjectCategory);
      });
    }
    
    // 3️⃣ Filtro de categoría de WO
    if (filterWOCategory !== 'all') {
      filtered = filtered.filter(entry => entry.work_order_category_id === filterWOCategory);
    }
    
    return filtered;
  }, [filteredByPeriod, filterRecurring, filterProjectCategory, filterWOCategory, projects]);

  // ✅ CALCULAR NÚMEROS SECUENCIALES PRIMERO (antes de filtrar por búsqueda)
  const entriesWithSequence = useMemo(() => {
    const allEntriesWithTime = [...filteredByAdvancedFilters];

    // ✅ ORDENAR: Primero por fecha, luego por team, luego por HORA (cronológico)
    allEntriesWithTime.sort((a, b) => {
      const dateA = a.planned_start_time ? a.planned_start_time.split('T')[0] : '9999-12-31';
      const dateB = b.planned_start_time ? b.planned_start_time.split('T')[0] : '9999-12-31';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const teamIdA = a.team_id || (a.team_ids && a.team_ids.length > 0 ? a.team_ids[0] : null);
      const teamIdB = b.team_id || (b.team_ids && b.team_ids.length > 0 ? b.team_ids[0] : null);
      
      const teamA = teamIdA ? teams.find(t => t.id === teamIdA) : null;
      const teamB = teamIdB ? teams.find(t => t.id === teamIdB) : null;
      
      const teamNameA = teamA?.name || 'ZZZ_Unassigned';
      const teamNameB = teamB?.name || 'ZZZ_Unassigned';
      const teamComparison = teamNameA.localeCompare(teamNameB);
      if (teamComparison !== 0) {
        return teamComparison;
      }

      // ✅ ORDENAR POR HORA (timestamp completo)
      const timeA = a.planned_start_time ? parseISO(a.planned_start_time).getTime() : 0;
      const timeB = b.planned_start_time ? parseISO(b.planned_start_time).getTime() : 0;
      return timeA - timeB;
    });

    // Agrupar por día y equipo para calcular N1 of N
    const ordersByDayTeam = {};
    
    allEntriesWithTime.forEach(entry => {
      const entryDate = entry.planned_start_time ? entry.planned_start_time.split('T')[0] : 'no-date';
      const teamId = entry.team_id || (entry.team_ids && entry.team_ids.length > 0 ? entry.team_ids[0] : null);
      const team = teamId ? teams.find(t => t.id === teamId) : null;
      const teamName = team?.name || 'Unassigned';
      
      const key = `${entryDate}_${teamName}`;
      if (!ordersByDayTeam[key]) {
        ordersByDayTeam[key] = [];
      }
      ordersByDayTeam[key].push(entry);
    });

    // ✅ Asignar números secuenciales CRONOLÓGICOS: N1 of 4, N2 of 4, etc.
    Object.keys(ordersByDayTeam).forEach(key => {
      const groupOrders = ordersByDayTeam[key];
      const total = groupOrders.length;
      
      groupOrders.forEach((entry, index) => {
        // ✅ SIEMPRE usar posición cronológica
        entry._displayNumber = `N${index + 1} of ${total}`;
        // ✅ Guardar el work_order_number original para referencia
        entry._originalNumber = entry.work_order_number;
      });
    });

    return allEntriesWithTime;
  }, [filteredByAdvancedFilters, teams]);

  const filteredAndSortedEntries = useMemo(() => {
    let currentEntries = [...entriesWithSequence];

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      currentEntries = currentEntries.filter(entry => {
        const woNumber = (formatWONumber(entry.work_order_number, entry.planned_start_time || entry.created_date) || '').toLowerCase();
        const title = (entry.title || '').toLowerCase();
        const workNotes = (entry.work_notes || '').toLowerCase();
        const status = (entry.status || '').toLowerCase();
        
        const project = projects.find(p => p.id === entry.project_id);
        const projectName = (project?.name || '').toLowerCase();
        
        const customer = project?.customer_id ? customers.find(c => c.id === project.customer_id) : null;
        const customerName = (customer?.name || '').toLowerCase();
        
        const searchText = [woNumber, title, workNotes, status, projectName, customerName].join(' ');
        return searchText.includes(query);
      });
    }

    // Aplicar ordenamiento solo si NO es 'default'
    if (sortBy !== 'default') {
      currentEntries.sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'work_order_number': {
            const parseSerial = (str) => {
              const m = String(str || '').match(/^(\d{3,4})\/(\d{2})$/);
              return m ? parseInt(`${m[2]}${m[1]}`, 10) : -1;
            };
            const fa = formatWONumber(a.work_order_number, a.planned_start_time || a.created_date);
            const fb = formatWONumber(b.work_order_number, b.planned_start_time || b.created_date);
            aVal = parseSerial(fa);
            bVal = parseSerial(fb);
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
          }
          case 'project':
            const projectA = projects.find(p => p.id === a.project_id);
            const projectB = projects.find(p => p.id === b.project_id);
            aVal = projectA?.name?.toLowerCase() || '';
            bVal = projectB?.name?.toLowerCase() || '';
            break;
          case 'customer':
            const projA = projects.find(p => p.id === a.project_id);
            const projB = projects.find(p => p.id === b.project_id);
            const custA = projA?.customer_id ? customers.find(c => c.id === projA.customer_id) : null;
            const custB = projB?.customer_id ? customers.find(c => c.id === projB.customer_id) : null;
            aVal = custA?.name?.toLowerCase() || '';
            bVal = custB?.name?.toLowerCase() || '';
            break;
          case 'team':
            const teamIdA = a.team_id || (a.team_ids && a.team_ids.length > 0 ? a.team_ids[0] : null);
            const teamIdB = b.team_id || (b.team_ids && b.team_ids.length > 0 ? b.team_ids[0] : null);
            const teamA = teamIdA ? teams.find(t => t.id === teamIdA) : null;
            const teamB = teamIdB ? teams.find(t => t.id === teamIdB) : null;
            aVal = teamA?.name?.toLowerCase() || '';
            bVal = teamB?.name?.toLowerCase() || '';
            break;
          case 'user':
            const userIdA = a.employee_ids && a.employee_ids.length > 0 ? a.employee_ids[0] : null;
            const userIdB = b.employee_ids && b.employee_ids.length > 0 ? b.employee_ids[0] : null;
            const userA = userIdA ? users.find(u => u.id === userIdA) : null;
            const userB = userIdB ? users.find(u => u.id === userIdB) : null;
            const userNameA = userA ? (userA.nickname || `${userA.first_name || ''} ${userA.last_name || ''}`.trim()) : '';
            const userNameB = userB ? (userB.nickname || `${userB.first_name || ''} ${userB.last_name || ''}`.trim()) : '';
            aVal = userNameA.toLowerCase();
            bVal = userNameB.toLowerCase();
            break;
          case 'planned_start':
            aVal = a.planned_start_time ? parseISO(a.planned_start_time).getTime() : 0;
            bVal = b.planned_start_time ? parseISO(b.planned_start_time).getTime() : 0;
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }

    return currentEntries;
  }, [entriesWithSequence, sortBy, sortOrder, projects, searchQuery, customers, teams, users]);

  const handleExport = async (formatType) => {
    if (filteredAndSortedEntries.length === 0) {
      toast.error('No work orders to export');
      return;
    }

    if (formatType === 'pdf') {
      setIsExportingPDF(true);
      try {
        let startDate, endDate;

        if (viewPeriod === 'day') {
          startDate = format(currentDate, 'yyyy-MM-dd');
          endDate = format(currentDate, 'yyyy-MM-dd');
        } else if (viewPeriod === 'week') {
          startDate = format(currentWeekStart, 'yyyy-MM-dd');
          endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else if (viewPeriod === 'month') {
          startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
          endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
        } else if (viewPeriod === 'all') {
          startDate = undefined; 
          endDate = undefined;
        } else {
          toast.error('Select a valid period first');
          setIsExportingPDF(false);
          return;
        }

        const response = await base44.functions.invoke('exportWorkOrdersPDF', {
          startDate,
          endDate
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        let filename = `work-orders-${viewPeriod}`;
        if (startDate) {
          filename += `-${startDate}`;
        } else {
          filename += `-all`;
        }
        filename += `.pdf`;

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        toast.success('PDF downloaded successfully');
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Failed to export PDF');
      } finally {
        setIsExportingPDF(false);
      }
    } else if (formatType === 'excel') {
      setIsExportingExcel(true);
      try {
        toast.info('Excel export coming soon');
      } catch (error) {
        console.error('Export Excel error:', error);
        toast.error('Failed to export Excel');
      } finally {
        setIsExportingExcel(false);
      }
    }
  };

  const SortButton = ({ column, children }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
    >
      {children}
      {sortBy === column && (
        <span className="text-xs">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  const formatWONumber = (val, refISO) => {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{3,4}\/\d{2}$/.test(s)) return s;
  let m = s.match(/^WO-(\d{4})-(\d{1,4})$/i) || s.match(/^WR-(\d{4})-(\d{1,4})$/i);
  if (m) return `${String(m[2]).padStart(4,'0')}/${String(m[1]).slice(-2)}`;
  m = s.match(/^(\d{1,4})$/);
  if (m) {
    const yy = (() => { try { return new Date(refISO || new Date()).getFullYear().toString().slice(-2); } catch { return new Date().getFullYear().toString().slice(-2); } })();
    return `${String(m[1]).padStart(4,'0')}/${yy}`;
  }
  return '';
};
const tableEntries = filteredAndSortedEntries;

// Auto-fix disabled to improve performance; use the renumber button when needed.

  return (
    <div className="space-y-3">
      <style>{`
        body { overflow-x: auto !important; }
      `}</style>
      
      <UnifiedToolbar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        currentDateLabel={getPeriodLabel()}
        onNavigatePrev={() => handleNavigate(-1)}
        onNavigateNext={() => handleNavigate(1)}
        onNavigateToday={() => handleNavigate(0)}
        todayLabel="Today"
        isMultiSelectMode={selectedEntries.size > 0}
        onToggleMultiSelect={() => {
          if (selectedEntries.size > 0) {
            tableEntries.forEach(entry => {
              if (selectedEntries.has(entry.id)) {
                onToggleSelection(entry.id);
              }
            });
          }
        }}
        viewPeriod={viewPeriod}
        onViewPeriodChange={setViewPeriod}
      />

      {/* Actions bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">
            {tableEntries.length} work orders
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={isExportingPDF}
            className="h-9 text-sm gap-1.5"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={isExportingExcel}
            className="h-9 text-sm gap-1.5"
          >
            {isExportingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Excel
          </Button>

          {selectedEntries.size > 0 && !isReadOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onBulkArchive && typeof onBulkArchive === 'function') {
                    onBulkArchive();
                  }
                }}
                className="h-9 text-sm gap-1.5"
              >
                <ArchiveX className="w-4 h-4" />
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onBulkDelete && typeof onBulkDelete === 'function') {
                    onBulkDelete();
                  }
                }}
                className="h-9 text-sm gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </>
          )}

          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing} className="h-9 w-9">
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 relative overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="w-8 p-2 bg-slate-50">
                  <Checkbox
                    checked={selectedEntries.size === tableEntries.length && tableEntries.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-24 bg-slate-50">WR #</th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-24 bg-slate-50">
                  <SortButton column="work_order_number">WO #</SortButton>
                </th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-[18%] bg-slate-50">
                  <SortButton column="project">Project</SortButton>
                </th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-[14%] bg-slate-50">
                  <SortButton column="customer">Customer</SortButton>
                </th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-[12%] bg-slate-50">
                  <SortButton column="team">Team</SortButton>
                </th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-[12%] bg-slate-50">
                  <SortButton column="user">Users</SortButton>
                </th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-16 bg-slate-50">
                  <SortButton column="planned_start">Time</SortButton>
                </th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 bg-slate-50">Notes</th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-16 bg-slate-50">
                  <SortButton column="status">Status</SortButton>
                </th>
                <th className="text-left p-2 text-xs font-semibold text-slate-700 w-12 bg-slate-50">Files</th>
              </tr>
            </thead>
            <tbody>
              {tableEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-500 text-sm">
                    {searchQuery ? 'No work orders found matching your search' : 'No work orders found for this period'}
                  </td>
                </tr>
              ) : (
                tableEntries.map((entry) => {
                  const project = projects.find(p => p.id === entry.project_id);
                  const customer = project?.customer_id ? customers.find(c => c.id === project.customer_id) : null;
                  
                  const assignedTeams = teams
                    .filter(t => (entry.team_ids || []).includes(t.id))
                    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
                  
                  const assignedUsers = users.filter(u => (entry.employee_ids || []).includes(u.id));

                  const startTime = entry.planned_start_time ? format(parseISO(entry.planned_start_time), 'HH:mm') : '';
                  const dateStr = entry.planned_start_time ? format(parseISO(entry.planned_start_time), 'dd/MM') : '';

                  const isSelected = selectedEntries instanceof Set && selectedEntries.has(entry.id);
                  const fileUrls = entry.file_urls || [];
                  const hasFiles = fileUrls.length > 0;

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => onEditWorkOrder(entry)}
                    >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleSelection(entry.id)}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                      <td className="p-2">
                        <span className="font-mono text-xs font-medium text-slate-900">
                          {reportsMap?.get(entry.id) || '-'}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={cn("font-mono text-xs font-medium", entry.archived ? "text-slate-500 line-through" : "text-slate-900")}>
                          {formatWONumber(entry.work_order_number, entry.planned_start_time || entry.created_date) || ''}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="font-medium text-xs text-slate-900 truncate">
                          {project?.name || '-'}
                        </div>
                      </td>
                      <td className="p-2 text-xs text-slate-600">
                        <div className="truncate">
                          {customer?.name || '-'}
                        </div>
                      </td>
                      <td className="p-2">
                        {assignedTeams.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {assignedTeams.slice(0, 2).map(team => (
                              <TeamAvatar key={team.id} team={team} size="sm" />
                            ))}
                            {assignedTeams.length > 2 && (
                              <span className="text-xs text-slate-500">+{assignedTeams.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {assignedUsers.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {assignedUsers.slice(0, 2).map(user => (
                              <Avatar key={user.id} user={user} size="sm" />
                            ))}
                            {assignedUsers.length > 2 && (
                              <span className="text-xs text-slate-500">+{assignedUsers.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-2 text-xs text-slate-600">
                        <div className="text-[10px]">{dateStr}</div>
                        <div className="font-medium text-xs">{startTime}</div>
                      </td>
                      <td className="p-2 text-xs text-slate-600">
                        <div className="truncate text-[11px]">
                          {entry.work_notes || entry.title || '-'}
                        </div>
                      </td>
                      <td className="p-2">
                        <Button
                          variant={entry.status === 'open' ? 'outline' : 'secondary'}
                          size="sm"
                          onClick={(e) => toggleStatus(e, entry)}
                          className={cn(
                            "h-6 px-2 text-[10px]",
                            entry.status === 'open' && "bg-green-100 text-green-700 hover:bg-green-100",
                            entry.status === 'closed' && "bg-slate-100 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          {entry.status === 'open' ? 'Close' : 'Open'}
                        </Button>
                      </td>
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        {hasFiles ? (
                          <Badge variant="secondary" className="text-[10px] px-1">
                            {fileUrls.length}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
}