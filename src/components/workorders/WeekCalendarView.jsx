import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO, addDays, isSameDay, isSunday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Copy,
  AlertCircle,
  Search,
  EyeOff,
  MoreVertical,
  Download,
  Loader2,
  Check,
  File
} from 'lucide-react';
import { PublicHoliday, LeaveRequest } from '@/entities/all';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import Avatar from '../Avatar';
import TeamAvatar from '../shared/TeamAvatar';
import { TimeEntry } from '@/entities/all';

export default function WeekCalendarView({
  currentWeekStart,
  onWeekChange,
  entries = [],
  projects = [],
  categories = [],
  users = [],
  teams = [],
  customers = [],
  shiftTypes = [],
  assets = [],
  clientEquipments = [],
  onEntryClick,
  onCreateWO,
  getCategoryColor,
  onCategoryChange,
  isMultiSelectMode,
  selectedEntries,
  onToggleSelection,
  onDrop,
  draggedWorkOrder,
  onDragStart,
  isReadOnly,
  weekStartsOn = 1,
  onCopyWorkOrders,
  onPasteWorkOrders,
  copiedWorkOrders,
  contextMenuDate,
  viewBy = 'project',
  onViewByChange,
  workOrdersByUser = [],
  workOrdersByTeam = [],
  overlappingUsersMap = new Map(),
  showOverlapPanel = false,
  onToggleOverlapPanel,
  onDataChanged,
  onHideOverlaps,
  onClearHiddenOverlaps,
  allEntries, // ✅ Receive all entries
  onShowFilters,
  onShowTeams,
  onViewModeChange,
  viewMode = 'week',
  selectedDayInWeek
}) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeAllEntries = Array.isArray(allEntries) ? allEntries : safeEntries;
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : [];
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeClientEquipments = Array.isArray(clientEquipments) ? clientEquipments : [];

  const [selectedOverlapDetails, setSelectedOverlapDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rowSearchQuery, setRowSearchQuery] = useState('');

  // ✅ IMPORTAR useDebounce dinámicamente
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [debouncedRowSearchQuery, setDebouncedRowSearchQuery] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedRowSearchQuery(rowSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [rowSearchQuery]);
  const [selectedOverlaps, setSelectedOverlaps] = useState(new Set());
  const [togglingStatusId, setTogglingStatusId] = useState(null);
  const [localStatusMap, setLocalStatusMap] = useState({}); // ✅ Track local status changes
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);

  // Load public holidays and approved leaves
  useEffect(() => {
    PublicHoliday.list().then(setPublicHolidays).catch(console.error);
    LeaveRequest.filter({ status: 'approved' }).then(setApprovedLeaves).catch(console.error);
  }, []);

  const weekStart = currentWeekStart;
  
  // ✅ Calculate week days based on selectedDayInWeek if provided
  const weekDays = useMemo(() => {
    if (selectedDayInWeek) {
      // Center the week around selectedDayInWeek (show 3 days before, selectedDay, 3 days after)
      return Array.from({ length: 7 }, (_, i) => addDays(selectedDayInWeek, i - 3));
    }
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart, selectedDayInWeek]);

  const filteredEntries = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return safeEntries;
    
    const query = debouncedSearchQuery.toLowerCase();
    return safeEntries.filter(entry => {
      const matchesNumber = entry.work_order_number?.toLowerCase().includes(query);
      const matchesTitle = entry.title?.toLowerCase().includes(query);
      const matchesNotes = entry.work_notes?.toLowerCase().includes(query);
      const project = safeProjects.find(p => p.id === entry.project_id);
      const matchesProject = project?.name?.toLowerCase().includes(query);
      const customer = project?.customer_id ? safeCustomers.find(c => c.id === project.customer_id) : null;
      const matchesCustomer = customer?.name?.toLowerCase().includes(query);
      const entryUserIds = entry.employee_ids || [];
      if (entry.employee_id && !entryUserIds.includes(entry.employee_id)) entryUserIds.push(entry.employee_id);
      
      const assignedUsers = safeUsers.filter(u => entryUserIds.includes(u.id));
      const matchesUser = assignedUsers.some(user => {
        const userName = (user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.email || '').toLowerCase();
        return userName.includes(query);
      });

      const entryTeamIds = entry.team_ids || [];
      if (entry.team_id && !entryTeamIds.includes(entry.team_id)) entryTeamIds.push(entry.team_id);

      const assignedTeams = safeTeams.filter(t => entryTeamIds.includes(t.id));
      const matchesTeam = assignedTeams.some(team => {
        return (team.name || '').toLowerCase().includes(query);
      });
      
      return matchesNumber || matchesTitle || matchesNotes || matchesProject || matchesCustomer || matchesUser || matchesTeam;
    });
  }, [safeEntries, debouncedSearchQuery, safeProjects, safeCustomers, safeUsers, safeTeams]);

  const weekEntries = useMemo(() => {
    // Align filtering window with the 7 visible days (sliding week around selectedDayInWeek)
    const start = weekDays[0];
    const end = addDays(weekDays[weekDays.length - 1], 1); // half-open interval

    const entries = filteredEntries.filter(entry => {
      try {
        const entryDate = entry.planned_start_time
          ? parseISO(entry.planned_start_time)
          : entry.start_time
          ? parseISO(entry.start_time)
          : entry.task_start_date
          ? parseISO(entry.task_start_date + 'T00:00:00')
          : null;
        const isInRange = entryDate && entryDate >= start && entryDate < end; // half-open interval
        return isInRange;
      } catch (error) {
        console.warn('Error parsing date in weekEntries:', error);
        return false;
      }
    });

    return entries;
  }, [filteredEntries, weekDays]);

  const projectsWithEntries = useMemo(() => {
    const projectMap = new Map();
    
    weekEntries.forEach(entry => {
      const projectId = entry.project_id;
      if (!projectId) return;
      
      if (!projectMap.has(projectId)) {
        const project = safeProjects.find(p => p.id === projectId);
        if (project) {
          projectMap.set(projectId, { ...project, entries: [] });
        }
      }
      
      projectMap.get(projectId)?.entries.push(entry);
    });
    
    // ✅ OPTIMIZADO: Limitar a 30 proyectos visibles (scroll virtual en futuro)
    return Array.from(projectMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [weekEntries, safeProjects]);

  const usersWithEntries = useMemo(() => {
    const userMap = new Map();
    
    safeUsers.forEach(user => {
      if (!user.archived) {
        userMap.set(user.id, { ...user, entries: [] });
      }
    });
    
    weekEntries.forEach(entry => {
      const employeeIds = [...(entry.employee_ids || [])];
      if (entry.employee_id && !employeeIds.includes(entry.employee_id)) {
        employeeIds.push(entry.employee_id);
      }
      // Fallback: if no explicit users, infer from team members
      if (employeeIds.length === 0 && (entry.team_ids?.length || entry.team_id)) {
        const teamIds = new Set([...(entry.team_ids || [])]);
        if (entry.team_id) teamIds.add(entry.team_id);
        safeUsers.forEach(u => { if (u.team_id && teamIds.has(u.team_id)) employeeIds.push(u.id); });
      }
      
      employeeIds.forEach(userId => {
        if (userMap.has(userId)) {
          userMap.get(userId).entries.push(entry);
        }
      });
    });
    
    return Array.from(userMap.values()).sort((a, b) => {
      const aName = a.nickname || a.first_name || a.email;
      const bName = b.nickname || b.first_name || b.email;
      return aName.localeCompare(bName);
    });
  }, [weekEntries, safeUsers]);

  const teamsWithEntries = useMemo(() => {
    const teamMap = new Map();

    // Seed with existing teams
    safeTeams.forEach(team => {
      teamMap.set(team.id, { ...team, entries: [] });
    });

    // Collect entries per team
    weekEntries.forEach(entry => {
      const teamIds = [...(entry.team_ids || [])];
      if (entry.team_id && !teamIds.includes(entry.team_id)) {
        teamIds.push(entry.team_id);
      }

      if (teamIds.length === 0) {
        // Unassigned bucket
        const UNASSIGNED_ID = '__unassigned__';
        if (!teamMap.has(UNASSIGNED_ID)) {
          teamMap.set(UNASSIGNED_ID, { id: UNASSIGNED_ID, name: 'Unassigned', sort_order: 99999, entries: [] });
        }
        teamMap.get(UNASSIGNED_ID).entries.push(entry);
      } else {
        teamIds.forEach(teamId => {
          if (!teamId) return;
          if (teamMap.has(teamId)) {
            teamMap.get(teamId).entries.push(entry);
          }
        });
      }
    });

    return Array.from(teamMap.values())
      .filter(t => t.entries.length > 0)
      .sort((a, b) => {
        const sortOrderA = a.sort_order ?? 9999;
        const sortOrderB = b.sort_order ?? 9999;
        if (sortOrderA !== sortOrderB) return sortOrderA - sortOrderB;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [weekEntries, safeTeams]);

  const totalEntriesCount = useMemo(() => {
    return filteredEntries.length;
  }, [filteredEntries]);

  // ✅ MEJORADO: Sistema de tracks por CLIENTE (customer_id) para continuidad visual
  const getCustomerTracksForEntity = (entityId) => {
    if (viewBy !== 'team' && viewBy !== 'user') return null;
    
    const allEntriesWithTime = [];
    
    weekDays.forEach((day, dayIndex) => {
      const dayEntries = filteredEntries.filter(entry => {
        const entryDate = entry.planned_start_time
        ? parseISO(entry.planned_start_time)
        : entry.start_time
        ? parseISO(entry.start_time)
        : entry.task_start_date
        ? parseISO(entry.task_start_date + 'T00:00:00')
        : null;
        if (!entryDate || !isSameDay(entryDate, day)) return false;
        
        if (viewBy === 'team') {
          const tIds = entry.team_ids || [];
          if (entityId === '__unassigned__') {
            return (tIds.length === 0) && !entry.team_id;
          }
          return tIds.includes(entityId) || entry.team_id === entityId;
        } else if (viewBy === 'user') {
          const uIds = entry.employee_ids || [];
          return uIds.includes(entityId) || entry.employee_id === entityId;
        }
        return false;
      });
      
      dayEntries.forEach(entry => {
        if (entry.project_id && entry.planned_start_time) {
          // ✅ NUEVO: Obtener customer_id del proyecto
          const project = safeProjects.find(p => p.id === entry.project_id);
          const customerId = project?.customer_id;
          
          if (customerId) {
            allEntriesWithTime.push({
              customerId: customerId,  // ✅ CAMBIADO: usar customerId en vez de projectId
              projectId: entry.project_id,
              timestamp: new Date(entry.planned_start_time).getTime(),
              woNumber: entry.work_order_number,
              dayIndex
            });
          }
        }
      });
    });
    
    // Ordenar cronológicamente
    allEntriesWithTime.sort((a, b) => a.timestamp - b.timestamp);
    
    const trackMap = {};
    let currentTrack = 0;
    
    // ✅ MEJORADO: Asignar tracks por CLIENTE
    allEntriesWithTime.forEach(entry => {
      if (trackMap[entry.customerId] === undefined) {
        trackMap[entry.customerId] = currentTrack;
        currentTrack++;
      }
    });
    
    return trackMap;
  };

  // ✅ MEJORADO: Obtener entries organizados por secuencia (1/N, 2/N, etc.)
  const getEntriesForDayWithTracks = (day, entityId) => {
    const dayEntries = filteredEntries.filter(entry => {
      const entryDate = entry.planned_start_time
        ? parseISO(entry.planned_start_time)
        : entry.start_time
        ? parseISO(entry.start_time)
        : entry.task_start_date
        ? parseISO(entry.task_start_date + 'T00:00:00')
        : null;
      if (!entryDate) return false;
      
      const isSameDayMatch = isSameDay(entryDate, day);
      if (!isSameDayMatch) return false;
      
      if (viewBy === 'project') {
        return entry.project_id === entityId;
      } else if (viewBy === 'user') {
        const uIds = entry.employee_ids || [];
        const direct = uIds.includes(entityId) || entry.employee_id === entityId;
        if (direct) return true;
        const user = safeUsers.find(u => u.id === entityId);
        if (!user?.team_id) return false;
        const tIds = entry.team_ids || [];
        if (entry.team_id && !tIds.includes(entry.team_id)) tIds.push(entry.team_id);
        return tIds.includes(user.team_id);
      } else if (viewBy === 'team') {
        const tIds = entry.team_ids || [];
        return tIds.includes(entityId) || entry.team_id === entityId;
      }
      
      return false;
    });

    // ✅ NUEVO: Ordenar por hora cronológica para todas las vistas
    // Esto asegura que 1/N aparezca arriba y N/N abajo
    return dayEntries.sort((a, b) => {
      const timeA = a.planned_start_time ? parseISO(a.planned_start_time).getTime() : 0;
      const timeB = b.planned_start_time ? parseISO(b.planned_start_time).getTime() : 0;
      
      if (timeA !== timeB) return timeA - timeB;

      const extractNumber = (str) => {
                  if (!str) return 0;
                  const match = String(str).match(/(\d+)$/);
                  return match ? parseInt(match[1], 10) : 0;
                };
      
      return extractNumber(a.work_order_number) - extractNumber(b.work_order_number);
    });
  };

  const getWorkOrderSequence = (entry, day, entityId) => {
    // ✅ Use safeAllEntries to count total sequence, ignoring filters
    const dayEntries = safeAllEntries.filter(e => {
      const entryDate = e.planned_start_time
        ? parseISO(e.planned_start_time)
        : e.start_time
        ? parseISO(e.start_time)
        : e.task_start_date
        ? parseISO(e.task_start_date + 'T00:00:00')
        : null;
      if (!entryDate || !isSameDay(entryDate, day)) return false;
      
      // ✅ Check if entity matches (Project, Team, or User)
      if (viewBy === 'project') {
        return e.project_id === entityId;
      } else if (viewBy === 'user') {
        const uIds = e.employee_ids || [];
        if (e.employee_id && !uIds.includes(e.employee_id)) uIds.push(e.employee_id);
        if (uIds.includes(entityId)) return true;
        const user = safeUsers.find(u => u.id === entityId);
        if (!user?.team_id) return false;
        const tIds = e.team_ids || [];
        if (e.team_id && !tIds.includes(e.team_id)) tIds.push(e.team_id);
        return tIds.includes(user.team_id);
      } else { // team
        const tIds = e.team_ids || [];
        if (e.team_id && !tIds.includes(e.team_id)) tIds.push(e.team_id);
        if (entityId === '__unassigned__') {
          return tIds.length === 0 && !e.team_id;
        }
        return tIds.includes(entityId);
      }
    });
    
    // ✅ ORDENAR POR HORA DE INICIO PLANEADA (cronológico)
    const sortedEntries = dayEntries.sort((a, b) => {
      const timeA = a.planned_start_time ? parseISO(a.planned_start_time).getTime() : 0;
      const timeB = b.planned_start_time ? parseISO(b.planned_start_time).getTime() : 0;
      
      if (timeA !== timeB) return timeA - timeB;

      // Si tienen la misma hora, ordenar por número de work order
      const extractNumber = (str) => {
                  if (!str) return 0;
                  const match = String(str).match(/(\d+)$/);
                  return match ? parseInt(match[1], 10) : 0;
                };
      
      return extractNumber(a.work_order_number) - extractNumber(b.work_order_number);
    });
    
    const position = sortedEntries.findIndex(e => e.id === entry.id) + 1;
    const total = sortedEntries.length;
    
    return { position, total };
  };

  // ✅ MEJORADO: Detectar link verificando que el CLIENTE coincide
  const getCustomerLinkInfo = (entry, currentDayIndex, entityId) => {
    if ((viewBy !== 'team' && viewBy !== 'user') || currentDayIndex >= 6) {
      return null;
    }
    
    const currentDay = weekDays[currentDayIndex];
    const nextDay = weekDays[currentDayIndex + 1];
    const nextDayEntries = getEntriesForDayWithTracks(nextDay, entityId);
    
    // ✅ NUEVO: Obtener el customer_id del entry actual
    const currentProject = safeProjects.find(p => p.id === entry.project_id);
    const currentCustomerId = currentProject?.customer_id;
    
    if (!currentCustomerId) return null;
    
    // ✅ MEJORADO: Buscar entry del MISMO CLIENTE en el día siguiente
    const matchingEntry = nextDayEntries.find(e => {
      const nextProject = safeProjects.find(p => p.id === e.project_id);
      return nextProject?.customer_id === currentCustomerId;
    });
    
    if (!matchingEntry) {
      return null;
    }
    
    const trackMap = getCustomerTracksForEntity(entityId);
    const currentTrack = trackMap[currentCustomerId] ?? 999;
    
    const matchingProject = safeProjects.find(p => p.id === matchingEntry.project_id);
    const matchingCustomerId = matchingProject?.customer_id;
    const nextTrack = matchingCustomerId ? (trackMap[matchingCustomerId] ?? 999) : 999;
    
    if (currentTrack !== nextTrack) {
      return null;
    }
    
    const targetIndex = nextDayEntries.indexOf(matchingEntry);
    
    return {
      hasLink: true,
      targetEntryIndex: targetIndex,
      targetTrack: nextTrack
    };
  };

  // Helper to check if a day is a public holiday
  const isPublicHoliday = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return publicHolidays.some(h => h.date === dateStr);
  };

  // Helper to get public holiday name
  const getPublicHolidayName = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const holiday = publicHolidays.find(h => h.date === dateStr);
    return holiday?.name || null;
  };

  // Helper to check if user is on leave for a given day
  const isUserOnLeave = (userId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return approvedLeaves.some(leave => {
      if (leave.employee_id !== userId) return false;
      return dateStr >= leave.start_date && dateStr <= leave.end_date;
    });
  };

  // Get users on leave for a specific day
  const getUsersOnLeaveForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return approvedLeaves
      .filter(leave => dateStr >= leave.start_date && dateStr <= leave.end_date)
      .map(leave => leave.employee_id);
  };

  const getDayStats = (day) => {
    const dayEntries = filteredEntries.filter(entry => {
      const entryDate = entry.planned_start_time
        ? parseISO(entry.planned_start_time)
        : entry.start_time
        ? parseISO(entry.start_time)
        : entry.task_start_date
        ? parseISO(entry.task_start_date + 'T00:00:00')
        : null;
      return entryDate && isSameDay(entryDate, day);
    });
    
    // Get users on leave for this specific day
    const usersOnLeaveToday = getUsersOnLeaveForDay(day);
    
    // ✅ Count UNIQUE field workers with ACTIVE reports (is_active=true)
    const fieldWorkersWithActiveReports = new Set();
    dayEntries.forEach(entry => {
      // Only count workers from entries that have is_active = true
      if (!entry.is_active) return;

      const uIds = [...(entry.employee_ids || [])];
      if (entry.employee_id && !uIds.includes(entry.employee_id)) uIds.push(entry.employee_id);

      uIds.forEach(userId => {
        const user = safeUsers.find(u => u.id === userId);
        if (user && !user.archived) {
          const userTeam = safeTeams.find(t => t.id === user.team_id);
          // Only count as field worker if they have a team with worker_type === 'field'
          if (userTeam && userTeam.worker_type === 'field') {
            fieldWorkersWithActiveReports.add(userId);
          }
        }
      });
    });

    let totalHours = 0;
    dayEntries.forEach(entry => {
      if (entry.planned_start_time && entry.planned_end_time) {
        const start = parseISO(entry.planned_start_time);
        const end = parseISO(entry.planned_end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });

    // ✅ Calculate total available field workers (excluding those on leave)
    const totalAvailableFieldWorkers = new Set();
    safeUsers.forEach(u => {
      if (!u.archived) {
        const userTeam = safeTeams.find(t => t.id === u.team_id);
        // Only count as field worker if they have a team with worker_type === 'field'
        // Exclude users on leave for this day
        if (userTeam && userTeam.worker_type === 'field' && !usersOnLeaveToday.includes(u.id)) {
          totalAvailableFieldWorkers.add(u.id);
        }
      }
    });
    
    return {
      total: dayEntries.length,
      closed: dayEntries.filter(e => e.status === 'closed').length,
      open: dayEntries.filter(e => e.status === 'open').length,
      fieldWorkersActive: fieldWorkersWithActiveReports.size,
      totalFieldWorkers: totalAvailableFieldWorkers.size,
      totalHours: Math.round(totalHours * 10) / 10,
      estimatedCost: Math.round(totalHours * 25)
    };
  };

  const handleDragStart = (e, entry) => {
    if (isReadOnly) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('workOrder', JSON.stringify(entry));
    if (onDragStart) {
      onDragStart(entry);
    }
  };

  const handleDragOver = (e) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, day, entityId) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedWorkOrder || !day) {
      console.warn('⚠️ Missing draggedWorkOrder or day in WeekCalendarView handleDrop');
      return;
    }

    if (!(day instanceof Date) || isNaN(day.getTime())) {
      console.error('❌ Invalid day in WeekCalendarView handleDrop:', day);
      return;
    }

    // ✅ FIX: Preserve original time when dropping to a new day
    // Get the original start time hours/minutes from the dragged work order
    let targetDateTime = new Date(day);
    
    if (draggedWorkOrder.planned_start_time) {
      try {
        const originalStart = parseISO(draggedWorkOrder.planned_start_time);
        // Keep original hours and minutes, only change the date
        targetDateTime.setHours(
          originalStart.getHours(),
          originalStart.getMinutes(),
          originalStart.getSeconds(),
          originalStart.getMilliseconds()
        );
      } catch (error) {
        console.warn('⚠️ Could not parse original start time, using midnight');
      }
    }

    if (onDrop) {
      onDrop(draggedWorkOrder, entityId, targetDateTime);
    }
  };

  const weekOverlaps = useMemo(() => {
    const overlaps = [];
    
    overlappingUsersMap.forEach((data, userId) => {
      const conflictsArray = data.conflicts || [];
      conflictsArray.forEach(conflict => {
        const wo1Date = conflict.wo1?.planned_start_time ? parseISO(conflict.wo1.planned_start_time) : null;
        const wo2Date = conflict.wo2?.planned_start_time ? parseISO(conflict.wo2.planned_start_time) : null;
        
        const isInWeek = (wo1Date && weekDays.some(day => isSameDay(day, wo1Date))) ||
                        (wo2Date && weekDays.some(day => isSameDay(day, wo2Date)));
        
        if (isInWeek) {
          overlaps.push({
            userId,
            conflict,
            user: data.user
          });
        }
      });
    });
    
    return overlaps;
  }, [overlappingUsersMap, weekDays]);

  const handleHideSelectedOverlaps = async () => {
    if (selectedOverlaps.size === 0) {
      toast.error('No overlaps selected');
      return;
    }

    const overlapIds = Array.from(selectedOverlaps);
    await onHideOverlaps(overlapIds);
    setSelectedOverlaps(new Set());
    toast.success(`Hidden ${overlapIds.length} overlap(s)`);
  };

  // ✅ Toggle status between open and closed with sequence rules
  const handleToggleStatus = async (e, entry) => {
    e.preventDefault();
    e.stopPropagation();

    if (togglingStatusId) return;

    const newStatus = entry.status === 'closed' ? 'open' : 'closed';

    // Helper to normalize strings
    const norm = (s) => (s || '').trim().toLowerCase();
    const getTime = (wo) => {
      if (wo?.planned_start_time) return new Date(wo.planned_start_time).getTime();
      if (wo?.start_time) return new Date(wo.start_time).getTime();
      return 0;
    };

    // Build group (same project + title)
    const group = (safeAllEntries || []).filter(w => (
      w.project_id === entry.project_id && (norm(w.title) === norm(entry.title))
    ));

    const sorted = [...group].sort((a,b) => getTime(a) - getTime(b));
    const isLatest = sorted.length === 0 || sorted[sorted.length-1]?.id === entry.id;

    // If trying to close an older one while a newer exists, block
    if (newStatus === 'closed' && !isLatest) {
      toast.warning('No puedes cerrar una orden antigua si existe una más reciente programada');
      return;
    }

    setTogglingStatusId(entry.id);

    try {
      if (newStatus === 'closed') {
        // Close this and all previous in the chain
        const cutoffTime = getTime(entry);
        const toClose = sorted.filter(w => getTime(w) <= cutoffTime && w.status !== 'closed');

        // Optimistic UI
        setLocalStatusMap(prev => {
          const next = { ...prev };
          toClose.forEach(w => { next[w.id] = 'closed'; });
          return next;
        });

        await Promise.all(toClose.map(w => TimeEntry.update(w.id, { status: 'closed' })));
      } else {
        // Re-open single entry
        setLocalStatusMap(prev => ({ ...prev, [entry.id]: 'open' }));
        await TimeEntry.update(entry.id, { status: 'open' });
      }

      if (onDataChanged) onDataChanged();
    } catch (error) {
      toast.error('No se pudo actualizar el estado');
      // Revert local map for involved ids
      setLocalStatusMap(prev => {
        const next = { ...prev };
        if (newStatus === 'closed') {
          const cutoffTime = getTime(entry);
          const toClose = sorted.filter(w => getTime(w) <= cutoffTime);
          toClose.forEach(w => delete next[w.id]);
        } else {
          delete next[entry.id];
        }
        return next;
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const entities = viewBy === 'project' ? projectsWithEntries :
                  viewBy === 'user' ? usersWithEntries :
                  teamsWithEntries;

  const sortedEntities = useMemo(() => {
    if (!entities || entities.length === 0) return [];
    
    return [...entities].sort((a, b) => {
      if (viewBy === 'project') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (viewBy === 'user') {
        const nameA = a.nickname || a.first_name || a.email || '';
        const nameB = b.nickname || b.first_name || b.email || '';
        return nameA.localeCompare(nameB);
      } else if (viewBy === 'team') {
        const sortOrderA = a.sort_order ?? 9999;
        const sortOrderB = b.sort_order ?? 9999;
        
        if (sortOrderA !== sortOrderB) {
          return sortOrderA - sortOrderB;
        }
        
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [entities, viewBy]);

  const visibleEntities = useMemo(() => {
    if (!debouncedRowSearchQuery) return sortedEntities;
    const lowerQuery = debouncedRowSearchQuery.toLowerCase();
    return sortedEntities.filter(entity => {
      let name = '';
      if (viewBy === 'project') name = entity.name;
      else if (viewBy === 'user') name = entity.nickname || entity.first_name || entity.email;
      else name = entity.name;
      return name?.toLowerCase().includes(lowerQuery);
    });
  }, [sortedEntities, debouncedRowSearchQuery, viewBy]);

  return (
    <div className="flex flex-col space-y-4">
      <style>{`
        body { overflow-x: auto !important; }
      `}</style>

      <div className="bg-white rounded-lg border border-slate-200 relative">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: '1000px' }}>
          <colgroup>
            <col style={{ width: '160px', minWidth: '160px', maxWidth: '160px' }} />
            {weekDays.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            {/* ✅ STICKY: Fila de headers con días */}
            <tr className="sticky top-0 z-20 bg-slate-50 shadow-sm">
              {/* ✅ STICKY: Celda de esquina superior izquierda - altura igual a headers de días */}
              <th className="border-r-[3px] border-b-[3px] border-slate-500 bg-slate-100 sticky left-0 z-30 shadow-md align-top" style={{ width: '160px', minWidth: '160px', maxWidth: '160px' }}>
                <div className="flex flex-col">
                  {/* Match Row 1 height */}
                  <div className="px-1.5 h-7 flex items-center border-b border-slate-200">
                    <div className="relative w-full">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <Input
                        className="h-6 pl-7 text-xs w-full bg-white"
                        placeholder={`Search ${viewBy}...`}
                        value={rowSearchQuery}
                        onChange={(e) => setRowSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Match Row 2 height */}
                  <div className="h-5 border-b border-slate-200" />
                  {/* Match Row 3 height */}
                  <div className="h-5 border-b border-slate-200" />
                  {/* Match Row 4 height */}
                  <div className="h-6 border-b border-slate-200" />
                  {/* Match Row 5 height */}
                  <div className="h-5" />
                </div>
              </th>
              
              {/* ✅ STICKY: Headers de días - ALTURA FIJA UNIFORME */}
              {weekDays.map((day, dayIdx) => {
                const stats = getDayStats(day);
                const isToday = isSameDay(day, new Date());
                const isSundayDay = isSunday(day);
                const isHoliday = isPublicHoliday(day);
                const holidayName = getPublicHolidayName(day);
                const dayEntries = filteredEntries.filter(entry => {
                  const entryDate = entry.planned_start_time
        ? parseISO(entry.planned_start_time)
        : entry.start_time
        ? parseISO(entry.start_time)
        : entry.task_start_date
        ? parseISO(entry.task_start_date + 'T00:00:00')
        : null;
                  return entryDate && isSameDay(entryDate, day);
                });

                return (
                  <th
                    key={dayIdx}
                    className={cn(
                      "border-r border-b-[3px] border-slate-200 border-b-slate-500 bg-slate-50 p-0 align-top",
                      isToday && "bg-blue-50 border-l-2 border-r-2 border-t-2 border-l-blue-500 border-r-blue-500 border-t-blue-500",
                      isSundayDay && "bg-red-50/50",
                      isHoliday && "bg-purple-50/50"
                    )}
                  >
                    <div className="flex flex-col">
                      {/* Row 1: Day name + date + menu */}
                      <div className="flex items-center justify-between px-2 h-7 border-b border-slate-200">
                        <div className={cn(
                          "flex items-baseline gap-1", 
                          isToday && "text-blue-600",
                          isSundayDay && "text-red-600",
                          isHoliday && "text-purple-600"
                        )}>
                          <span className="text-xs font-semibold">{format(day, 'EEE')}</span>
                          <span className="text-sm font-bold">{format(day, 'd/M')}</span>
                          {isSundayDay && <span className="text-[9px] ml-1">🔴</span>}
                          {isHoliday && <span className="text-[9px] ml-1">🎉</span>}
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onCreateWO && onCreateWO(null, day, 'open', null, null)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Create Working Report
                            </DropdownMenuItem>
                            {dayEntries.length > 0 && (
                              <DropdownMenuItem onClick={() => onCopyWorkOrders && onCopyWorkOrders(dayEntries, day)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy {dayEntries.length} WO(s)
                              </DropdownMenuItem>
                            )}
                            {copiedWorkOrders && copiedWorkOrders.workOrders && copiedWorkOrders.workOrders.length > 0 && (
                              <DropdownMenuItem onClick={() => onPasteWorkOrders && onPasteWorkOrders(day)}>
                                <File className="w-4 h-4 mr-2" />
                                Paste {copiedWorkOrders.workOrders.length} WO(s)
                              </DropdownMenuItem>
                            )}
                            {dayEntries.length > 0 && (
                              <DropdownMenuItem onClick={() => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                window.location.href = `/WorkOrdersSummaryPDFView?startDate=${dateStr}&endDate=${dateStr}&groupBy=team`;
                              }}>
                                <Download className="w-4 h-4 mr-2" />
                                Export PDF
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Row 2: Workers field count */}
                      <div className="px-2 h-5 flex items-center text-[10px] text-slate-600 border-b border-slate-200">
                        <span className="font-medium">Workers on field: {stats.fieldWorkersActive}/{stats.totalFieldWorkers}</span>
                      </div>

                      {/* Row 3: Hours + Cost */}
                      <div className="px-2 h-5 flex items-center justify-between text-[10px] border-b border-slate-200">
                        <span className="text-slate-600">{stats.totalHours}h</span>
                        <span className="text-slate-600 font-medium">${stats.estimatedCost}</span>
                      </div>

                      {/* Row 4: Status badges - altura fija */}
                      <div className="flex items-center gap-1 px-1.5 h-6 border-b border-slate-200">
                        {stats.open > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                            Open: {stats.open}
                          </Badge>
                        )}
                        {stats.closed > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-green-100 text-green-700 font-medium whitespace-nowrap">
                            Closed: {stats.closed}
                          </Badge>
                        )}
                        {stats.total === 0 && <span className="text-[9px] text-slate-400">—</span>}
                      </div>

                      {/* Row 5: Holiday name - altura fija */}
                      <div className={cn(
                        "px-1.5 h-5 flex items-center justify-center text-[8px] font-medium truncate",
                        isHoliday && holidayName ? "bg-purple-100 text-purple-700" : "text-transparent"
                      )}>
                        {isHoliday && holidayName ? `🎉 ${holidayName}` : '—'}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* ✅ Filas de entidades (Projects/Teams/Users con sus WOs) */}
            {visibleEntities.map((entity, entityIdx) => {
              let entityName = '';
              let clientName = '';
              
              if (viewBy === 'project') {
                entityName = entity.name;
                const customer = safeCustomers.find(c => c.id === entity.customer_id);
                clientName = customer?.name || '';
              } else if (viewBy === 'user') {
                entityName = entity.nickname || entity.first_name || entity.email;
              } else {
                entityName = entity.name;
              }

              return (
                <tr key={entity.id} className="border-b-[3px] border-slate-500 last:border-b-0">
                  {/* ✅ OPTIMIZADO: ancho fijo igual al header */}
                  <td className="p-1.5 border-r-[3px] border-slate-500 bg-slate-100 sticky left-0 z-10 align-top shadow-sm" style={{ width: '160px', minWidth: '160px', maxWidth: '160px' }}>
                    <div className="flex items-center gap-1.5">
                      {viewBy === 'user' && <Avatar user={entity} size="xs" />}
                      {viewBy === 'team' && entity.id !== '__unassigned__' && <TeamAvatar team={entity} size="xs" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate" title={entityName}>{entityName}</div>
                        {viewBy === 'project' && clientName && (
                          <div className="text-[10px] text-slate-500 truncate" title={clientName}>{clientName}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ✅ Celdas de días con work orders - REDUCIDAS UN 20% */}
                  {weekDays.map((day, dayIdx) => {
                    const dayEntries = getEntriesForDayWithTracks(day, entity.id);
                    const isToday = isSameDay(day, new Date());
                    const isSundayDay = isSunday(day);
                    const isHoliday = isPublicHoliday(day);
                    // Check if this user is on leave (only for user view)
                    const userOnLeave = viewBy === 'user' && isUserOnLeave(entity.id, day);

                    return (
                      <ContextMenu key={dayIdx}>
                        <ContextMenuTrigger asChild>
                          <td
                            className={cn(
                              "p-1.5 border-r border-slate-200 min-h-[80px] transition-colors hover:bg-slate-50 relative align-top z-0",
                              isToday && "bg-blue-50/30 border-l-2 border-r-2 border-l-blue-500 border-r-blue-500",
                              isToday && entityIdx === visibleEntities.length - 1 && "border-b-2 border-b-blue-500",
                              isSundayDay && "bg-red-50/30",
                              isHoliday && "bg-purple-50/30",
                              userOnLeave && "bg-amber-50/50"
                            )}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day, entity.id)}
                          >
                            {/* Absence indicator for user view */}
                            {userOnLeave && dayEntries.length === 0 && (
                              <div className="text-[8px] text-amber-600 text-center py-1 bg-amber-100 rounded">
                                🏖️ On Leave
                              </div>
                            )}
                            {dayEntries.length === 0 && (
                              <div className="text-[8px] text-slate-300 text-center py-1.5">
                                No WOs
                              </div>
                            )}
                            {/* ✅ REDUCIDO: space-y-1 a space-y-0.5 para menor separación */}
                            <div className="space-y-0.5">
                              {dayEntries.map((entry, entryIndex) => {
                                const isSelected = selectedEntries instanceof Set && selectedEntries.has(entry.id);
                                const explicitUserIds = new Set([...(entry.employee_ids || [])]);
                                if (entry.employee_id && !explicitUserIds.has(entry.employee_id)) explicitUserIds.add(entry.employee_id);
                                const assignedUsers = safeUsers.filter(u => explicitUserIds.has(u.id) && !u.archived);
                                const woSequence = getWorkOrderSequence(entry, day, entity.id);
                                // ✅ Use local status if available, otherwise use entry status
                                const currentStatus = localStatusMap[entry.id] || entry.status;
                                
                                // ✅ Create entry with current status for toggle handler
                                const entryWithCurrentStatus = { ...entry, status: currentStatus };

                                return (
                                  <ContextMenu key={entry.id}>
                                    <ContextMenuTrigger asChild>
                                      <div className="relative">
                                        {(() => {
                                          const linkInfo = getCustomerLinkInfo(entry, dayIdx, entity.id);
                                          if (!linkInfo) return null;
                                          
                                          return (
                                            <div
                                              className="absolute top-1/2 -right-0.5 w-1 h-0.5 bg-blue-500 z-5"
                                              style={{
                                                transform: 'translateY(-50%)'
                                              }}
                                            />
                                          );
                                        })()}

                                        {/* ✅ REDUCIDO UN 20%: padding de p-1.5 a p-1, text más pequeño */}
                                        <div
                                          draggable={!isReadOnly && !isMultiSelectMode}
                                          onDragStart={(e) => handleDragStart(e, entry)}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isMultiSelectMode && onToggleSelection) {
                                              onToggleSelection(entry.id);
                                            } else if (onEntryClick) {
                                              onEntryClick(entry);
                                            }
                                          }}
                                          onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            if (onEntryClick) onEntryClick(entry);
                                          }}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              if (onEntryClick) onEntryClick(entry);
                                            }
                                          }}
                                          className={cn(
                                            "p-1 rounded text-[9px] cursor-pointer border relative",
                                            "hover:shadow-md hover:scale-[1.02] transition-all duration-150",
                                            getCategoryColor && getCategoryColor(entry.work_order_category_id),
                                            isSelected && "ring-2 ring-indigo-500",
                                            currentStatus === 'closed' && "opacity-60 border-2 border-green-600",
                                            currentStatus === 'open' && "border-2 border-blue-500"
                                          )}
                                        >
                                          {isMultiSelectMode && (
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={() => onToggleSelection(entry.id)}
                                              className="mr-1 mb-0.5"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                          )}

                                          {currentStatus === 'closed' ? (
                                            <button
                                              onClick={(e) => handleToggleStatus(e, entryWithCurrentStatus)}
                                              disabled={togglingStatusId === entry.id}
                                              className="absolute -top-0.5 -right-0.5 bg-green-600 hover:bg-green-700 rounded-full p-0.5 shadow-sm z-10 cursor-pointer transition-colors"
                                              title="Click to mark as Open"
                                            >
                                              {togglingStatusId === entry.id ? (
                                                <Loader2 className="w-2 h-2 text-white animate-spin" />
                                              ) : (
                                                <Check className="w-2 h-2 text-white stroke-[3]" />
                                              )}
                                            </button>
                                          ) : (
                                            <button
                                              onClick={(e) => handleToggleStatus(e, entryWithCurrentStatus)}
                                              disabled={togglingStatusId === entry.id}
                                              className="absolute -top-0.5 -right-0.5 bg-white hover:bg-slate-50 rounded-full shadow-sm z-10 cursor-pointer transition-colors border-2 border-blue-600"
                                              style={{ width: '14px', height: '14px' }}
                                              title="Click to mark as Closed"
                                            >
                                              {togglingStatusId === entry.id && (
                                                <Loader2 className="w-2 h-2 text-blue-600 animate-spin" />
                                              )}
                                            </button>
                                          )}

                                          
                                          {/* Header row: Sequence + Avatars */}
                                          <div className="flex items-center justify-between gap-0.5 mb-0">
                                            <div className="font-bold text-slate-900 text-[10px] flex-shrink-0">
                                              {woSequence && woSequence.position > 0 ? `${woSequence.position}/${woSequence.total}` : 'N/A'}
                                            </div>
                                            {(() => {
                                              // ✅ Filter out users who are on leave for this day
                                              const activeUsers = assignedUsers.filter(u => !isUserOnLeave(u.id, day));
                                              if (activeUsers.length === 0) return null;
                                              return (
                                                <div className="flex items-center -space-x-1 flex-shrink-0">
                                                  {activeUsers.slice(0, 4).map((user) => (
                                                    <Avatar key={user.id} user={user} size="xs" className="ring-1 ring-white rounded-lg" />
                                                  ))}
                                                  {activeUsers.length > 4 && (
                                                    <div className="w-4 h-4 rounded bg-slate-300 border border-white flex items-center justify-center text-[6px] font-bold text-slate-700">
                                                      +{activeUsers.length - 4}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                          {/* Customer + Project name */}
                                          {(() => {
                                            const project = safeProjects.find(p => p.id === entry.project_id);
                                            const customer = project ? safeCustomers.find(c => c.id === project.customer_id) : null;
                                            return (
                                              <div className="text-[7px] text-slate-500 truncate">
                                                {customer?.name}{customer && project ? ' - ' : ''}{project?.name}
                                              </div>
                                            );
                                          })()}
                                          
                                          {/* ✅ REDUCIDO: mb-1 a mb-0.5, text de 10px a 9px */}
                                          <div className={cn(
                                            "truncate text-slate-900 mb-0.5 text-[9px]",
                                            currentStatus === 'closed' && "line-through text-slate-600"
                                          )}>
                                            {entry.title || 'Untitled'}
                                          </div>

                                          {/* Time row + Equipment icons */}
                                          <div className="flex items-center justify-between text-[8px] text-slate-600">
                                            <div>
                                              {entry.planned_start_time && format(parseISO(entry.planned_start_time), 'HH:mm')}
                                              {entry.planned_end_time && ` - ${format(parseISO(entry.planned_end_time), 'HH:mm')}`}
                                            </div>
                                            {(() => {
                                              const equipmentIds = entry.equipment_ids || [];
                                              if (equipmentIds.length === 0) return null;
                                              const allEquipment = [...safeAssets, ...safeClientEquipments];
                                              const entryEquipment = allEquipment.filter(eq => equipmentIds.includes(eq.id));
                                              if (entryEquipment.length === 0) return null;
                                              return (
                                                <div className="flex items-center -space-x-0.5">
                                                  {entryEquipment.slice(0, 3).map(eq => (
                                                    <div 
                                                      key={eq.id} 
                                                      className="w-3 h-3 rounded-full bg-slate-800 border border-white flex items-center justify-center"
                                                      title={eq.name}
                                                    >
                                                      <span className="text-[6px] text-white font-bold">
                                                        {eq.name?.charAt(0) || 'E'}
                                                      </span>
                                                    </div>
                                                  ))}
                                                  {entryEquipment.length > 3 && (
                                                    <div className="w-3 h-3 rounded-full bg-slate-800 border border-white flex items-center justify-center">
                                                      <span className="text-[5px] text-white font-bold">+{entryEquipment.length - 3}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => onCopyWorkOrders && onCopyWorkOrders([entry], parseISO(entry.planned_start_time))}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Work Order
                                      </ContextMenuItem>
                                      {copiedWorkOrders && copiedWorkOrders.workOrders && copiedWorkOrders.workOrders.length > 0 && (
                                        <ContextMenuItem onClick={() => onPasteWorkOrders && onPasteWorkOrders(day, entity.id)}>
                                          <File className="w-4 h-4 mr-2" />
                                          Paste Here
                                        </ContextMenuItem>
                                      )}
                                    </ContextMenuContent>
                                  </ContextMenu>
                                );
                              })}
                            </div>
                          </td>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => {
                            if (onCreateWO) {
                              if (viewBy === 'project') {
                                onCreateWO(entity.id, day, 'open', null, null);
                              } else if (viewBy === 'team') {
                                onCreateWO(null, day, 'open', entity.id, null);
                              } else if (viewBy === 'user') {
                                onCreateWO(null, day, 'open', null, entity.id);
                              }
                            }
                          }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Working Report
                          </ContextMenuItem>
                          {copiedWorkOrders && copiedWorkOrders.workOrders && copiedWorkOrders.workOrders.length > 0 && (
                            <ContextMenuItem onClick={() => onPasteWorkOrders && onPasteWorkOrders(day, entity.id)}>
                              <File className="w-4 h-4 mr-2" />
                              Paste {copiedWorkOrders.workOrders.length} Work Order{copiedWorkOrders.workOrders.length !== 1 ? 's' : ''}
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showOverlapPanel && weekOverlaps.length > 0 && (
        <Sheet open={showOverlapPanel} onOpenChange={onToggleOverlapPanel}>
          <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Week Overlaps ({weekOverlaps.length})
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {selectedOverlaps.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">{selectedOverlaps.size} selected</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOverlaps(new Set())}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleHideSelectedOverlaps}
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Selected
                    </Button>
                  </div>
                </div>
              )}

              {weekOverlaps.map((overlap, idx) => {
                const { userId, conflict, user } = overlap;
                const overlapId = `${conflict.wo1?.id}-${conflict.wo2?.id}`;
                const isSelected = selectedOverlaps.has(overlapId);

                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 border rounded-lg space-y-3 cursor-pointer transition-colors",
                      isSelected ? "bg-indigo-50 border-indigo-300" : "bg-white hover:bg-slate-50"
                    )}
                    onClick={() => {
                      const newSelected = new Set(selectedOverlaps);
                      if (newSelected.has(overlapId)) {
                        newSelected.delete(overlapId);
                      } else {
                        newSelected.add(overlapId);
                      }
                      setSelectedOverlaps(newSelected);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {
                            const newSelected = new Set(selectedOverlaps);
                            if (newSelected.has(overlapId)) {
                              newSelected.delete(overlapId);
                            } else {
                              newSelected.add(overlapId);
                            }
                            setSelectedOverlaps(newSelected);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar user={user} size="sm" />
                        <div>
                          <div className="font-semibold text-sm">
                            {user?.nickname || user?.first_name || user?.email || 'Unknown'}
                          </div>
                          <div className="text-xs text-slate-500">Double Booked</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pl-10">
                      <div className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                        <div className="font-semibold text-red-900">
                          {conflict.wo1?.work_order_number || 'N/A'} - {conflict.wo1?.title}
                        </div>
                        <div className="text-red-700">
                          {conflict.wo1?.planned_start_time && format(parseISO(conflict.wo1.planned_start_time), 'MMM d, HH:mm')}
                          {conflict.wo1?.planned_end_time && ` - ${format(parseISO(conflict.wo1.planned_end_time), 'HH:mm')}`}
                        </div>
                      </div>

                      <div className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                        <div className="font-semibold text-red-900">
                          {conflict.wo2?.work_order_number || 'N/A'} - {conflict.wo2?.title}
                        </div>
                        <div className="text-red-700">
                          {conflict.wo2?.planned_start_time && format(parseISO(conflict.wo2.planned_start_time), 'MMM d, HH:mm')}
                          {conflict.wo2?.planned_end_time && ` - ${format(parseISO(conflict.wo2.planned_end_time), 'HH:mm')}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
      </div>
      );
      }