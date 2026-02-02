import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Check, Play } from 'lucide-react';
import Avatar from '../Avatar';
import { toast } from 'sonner';

const DEBUG = false;

export default function DayCalendarView({
  currentDate,
  onDateChange,
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
  isMultiSelectMode,
  selectedEntries,
  onToggleSelection,
  onDrop,
  draggedWorkOrder,
  onDragStart,
  isReadOnly,
  onCopyWorkOrders,
  onPasteWorkOrders,
  copiedWorkOrders,
  viewBy = 'project',
  onViewByChange,
  onDataChanged,
  allEntries, // ✅ Receive all entries
  viewMode = 'day',
  onViewModeChange,
  timeRange = '24h',
  onTimeRangeChange,
}) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeAllEntries = Array.isArray(allEntries) ? allEntries : safeEntries;
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeClientEquipments = Array.isArray(clientEquipments) ? clientEquipments : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [localViewBy, setLocalViewBy] = useState(viewBy);
  const [dragPreview, setDragPreview] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizing, setResizing] = useState(null);
  const [justResized, setJustResized] = useState(false); // ✅ NUEVO: Flag para prevenir click después de resize

  const rowRefsMap = useRef({});
  const scrollContainerRef = useRef(null);
  const resizingRef = useRef(null); // ✅ Mantener referencia actualizada del state
  const dragPreviewRef = useRef(null);
  const dragRafRef = useRef(null);

  const START_HOUR = timeRange === '24h' ? 0 : 7;
  const END_HOUR = timeRange === '24h' ? 24 : 19;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const QUARTERS_PER_HOUR = 4;
  const TOTAL_QUARTERS = TOTAL_HOURS * QUARTERS_PER_HOUR;

  const sortedEntries = useMemo(() => {
    if (!Array.isArray(safeEntries)) return [];

    return [...safeEntries].sort((a, b) => {
      const timeA = a.planned_start_time ? parseISO(a.planned_start_time).getTime() : 0;
      const timeB = b.planned_start_time ? parseISO(b.planned_start_time).getTime() : 0;

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      const extractNumber = (str) => {
        if (!str) return 0;
        const match = String(str).match(/N(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };

      return extractNumber(a.work_order_number) - extractNumber(b.work_order_number);
    });
  }, [safeEntries]);

  const dayEntries = useMemo(() => {
    return sortedEntries.filter(entry => {
      if (!entry.planned_start_time) return false;
      try {
        const entryDate = parseISO(entry.planned_start_time);
        return isSameDay(entryDate, currentDate);
      } catch {
        return false;
      }
    });
  }, [sortedEntries, currentDate]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return dayEntries;

    const query = searchQuery.toLowerCase();
    return dayEntries.filter(entry => {
      const matchesNumber = entry.work_order_number?.toLowerCase().includes(query);
      const matchesTitle = entry.title?.toLowerCase().includes(query);
      const matchesNotes = entry.work_notes?.toLowerCase().includes(query);
      const project = safeProjects.find(p => p.id === entry.project_id);
      const matchesProject = project?.name?.toLowerCase().includes(query);
      const customer = project?.customer_id ? safeCustomers.find(c => c.id === project.customer_id) : null;
      const matchesCustomer = customer?.name?.toLowerCase().includes(query);
      const uIds = [...(entry.employee_ids || [])];
      if (entry.employee_id && !uIds.includes(entry.employee_id)) uIds.push(entry.employee_id);

      const assignedUsers = safeUsers.filter(u => uIds.includes(u.id));
      const matchesUser = assignedUsers.some(user => {
        const userName = (user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.email || '').toLowerCase();
        return userName.includes(query);
      });

      const tIds = [...(entry.team_ids || [])];
      if (entry.team_id && !tIds.includes(entry.team_id)) tIds.push(entry.team_id);

      const assignedTeams = safeTeams.filter(t => tIds.includes(t.id));
      const matchesTeam = assignedTeams.some(team => {
        return (team.name || '').toLowerCase().includes(query);
      });

      return matchesNumber || matchesTitle || matchesNotes || matchesProject || matchesCustomer || matchesUser || matchesTeam;
    });
  }, [dayEntries, searchQuery, safeProjects, safeCustomers, safeUsers, safeTeams]);

  const sortedEntities = useMemo(() => {
    if (localViewBy === 'project') {
      // ✅ Para projects: solo mostrar los que tienen entries
      const projectsWithEntries = {};
      dayEntries.forEach(entry => {
        if (entry.project_id && !projectsWithEntries[entry.project_id]) {
          const project = safeProjects.find(p => p.id === entry.project_id);
          if (project) projectsWithEntries[entry.project_id] = project;
        }
      });
      return Object.values(projectsWithEntries).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    if (localViewBy === 'user') {
      // ✅ CAMBIADO: Mostrar TODOS los usuarios no archivados
      return safeUsers
        .filter(u => !u.archived)
        .sort((a, b) => {
          const aName = a.nickname || a.first_name || a.email || '';
          const bName = b.nickname || b.first_name || b.email || '';
          return aName.localeCompare(bName);
        });
    }

    if (localViewBy === 'team') {
      // Only show teams with entries
      return safeTeams
        .filter(team => dayEntries.some(e => {
          const tIds = [...(e.team_ids || [])];
          if (e.team_id && !tIds.includes(e.team_id)) tIds.push(e.team_id);
          return tIds.includes(team.id);
        }))
        .sort((a, b) => {
          const sortOrderA = a.sort_order ?? 9999;
          const sortOrderB = b.sort_order ?? 9999;
          if (sortOrderA !== sortOrderB) return sortOrderA - sortOrderB;
          return (a.name || '').localeCompare(b.name || '');
        });
    }

    return [];
  }, [localViewBy, dayEntries, safeProjects, safeUsers, safeTeams]);

  const getBubblePosition = (entry) => {
    if (!entry.planned_start_time) return null;

    try {
      const start = new Date(entry.planned_start_time);
      const end = entry.planned_end_time ? new Date(entry.planned_end_time) : null;

      const startHour = start.getHours();
      const startMin = start.getMinutes();
      const endHour = end ? end.getHours() : startHour + 1;
      const endMin = end ? end.getMinutes() : 0;

      DEBUG && console.log(`🔵 getBubblePosition WO ${entry.work_order_number}:`, {
        realStart: `${startHour}:${startMin.toString().padStart(2, '0')}`,
        realEnd: `${endHour}:${endMin.toString().padStart(2, '0')}`,
        START_HOUR,
        END_HOUR
      });

      // Si termina antes del rango visible O empieza después, no mostrar
      if (endHour < START_HOUR || (endHour === START_HOUR && endMin === 0) || startHour >= END_HOUR) {
        DEBUG && console.log(`❌ WO ${entry.work_order_number} fuera de rango visible`);
        return null;
      }

      // Calcular minutos desde START_HOUR (clampear al rango visible)
      let startMinuteInRange = Math.max(0, (startHour - START_HOUR) * 60 + startMin);
      let endMinuteInRange = Math.min((END_HOUR - START_HOUR) * 60, (endHour - START_HOUR) * 60 + endMin);

      DEBUG && console.log(`   startMinuteInRange: ${startMinuteInRange}, endMinuteInRange: ${endMinuteInRange}`);

      // Convertir a quarters
      const startQuarter = Math.floor(startMinuteInRange / 15);
      const endQuarter = Math.round(endMinuteInRange / 15);

      const result = {
        start: startQuarter + 1,
        end: Math.max(endQuarter + 1, startQuarter + 2)
      };

      DEBUG && console.log(`   ✅ Grid position: start=${result.start}, end=${result.end} (span=${result.end - result.start} quarters)`);

      return result;
    } catch (error) {
      console.error('❌ Error en getBubblePosition:', error);
      return null;
    }
  };

  const getEntriesForEntity = (entityId) => {
    const entityEntries = filteredEntries.filter(e => {
      if (localViewBy === 'project') return e.project_id === entityId;
      if (localViewBy === 'user') {
        const uIds = [...(e.employee_ids || [])];
        if (e.employee_id && !uIds.includes(e.employee_id)) uIds.push(e.employee_id);
        return uIds.includes(entityId);
      }
      if (localViewBy === 'team') {
        const tIds = [...(e.team_ids || [])];
        if (e.team_id && !tIds.includes(e.team_id)) tIds.push(e.team_id);
        return tIds.includes(entityId);
      }
      return false;
    });

    return entityEntries.sort((a, b) => {
      const timeA = a.planned_start_time ? new Date(a.planned_start_time).getTime() : 0;
      const timeB = b.planned_start_time ? new Date(b.planned_start_time).getTime() : 0;

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      const extractNumber = (str) => {
        if (!str) return 0;
        const match = String(str).match(/N(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };

      return extractNumber(a.work_order_number) - extractNumber(b.work_order_number);
    });
  };

  const getEntityName = (entity) => {
    if (localViewBy === 'project') return entity.name;
    if (localViewBy === 'user') return entity.nickname || `${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.full_name || entity.email;
    if (localViewBy === 'team') return entity.name;
    return '';
  };

  const getEntitySubInfo = (entity) => {
    if (localViewBy === 'project') {
      const customer = safeCustomers.find(c => c.id === entity.customer_id);
      return customer?.name;
    }
    return '';
  };



  // ✅ Memo: secuencia por entidad para el día actual para evitar recomputar por tarjeta
  const sequencesByEntity = useMemo(() => {
    const map = new Map();
    const sameDayEntries = safeAllEntries.filter(e => {
      const d = e.planned_start_time ? parseISO(e.planned_start_time) : null;
      return d && isSameDay(d, currentDate);
    });

    const push = (key, e) => {
      if (!key) return;
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    };

    sameDayEntries.forEach(e => {
      if (localViewBy === 'project') {
        push(e.project_id, e);
      } else if (localViewBy === 'user') {
        const uIds = [...(e.employee_ids || [])];
        if (e.employee_id && !uIds.includes(e.employee_id)) uIds.push(e.employee_id);
        uIds.forEach(uid => push(uid, e));
      } else if (localViewBy === 'team') {
        const tIds = [...(e.team_ids || [])];
        if (e.team_id && !tIds.includes(e.team_id)) tIds.push(e.team_id);
        tIds.forEach(tid => push(tid, e));
      }
    });

    const extractNumber = (str) => {
      if (!str) return 0;
      const match = String(str).match(/N(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    map.forEach(arr => arr.sort((a, b) => {
      const ta = a.planned_start_time ? parseISO(a.planned_start_time).getTime() : 0;
      const tb = b.planned_start_time ? parseISO(b.planned_start_time).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return extractNumber(a.work_order_number) - extractNumber(b.work_order_number);
    }));

    return map;
  }, [safeAllEntries, currentDate, localViewBy]);

  const getWorkOrderSequence = (entry, _day, entityId) => {
    const arr = sequencesByEntity.get(entityId) || [];
    const position = arr.findIndex(e => e.id === entry.id) + 1;
    const total = arr.length;
    return { position, total };
  };

  const handleDragStart = (e, entry, entityId) => {
    if (isReadOnly || isMultiSelectMode || resizing) {
      e.preventDefault();
      return false;
    }
    
    const rowEl = rowRefsMap.current[entityId];
    
    if (rowEl && entry.planned_start_time) {
      try {
        const rect = rowEl.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const colWidth = rect.width / TOTAL_QUARTERS;
        const clickCol = Math.floor(clickX / colWidth);
        
        const start = new Date(entry.planned_start_time);
        const startHour = start.getHours();
        const startMin = start.getMinutes();
        const startCol = (startHour - START_HOUR) * QUARTERS_PER_HOUR + Math.floor(startMin / 15);
        
        const offset = clickCol - startCol;
        setDragOffset(offset);
      } catch (error) {
        setDragOffset(0);
      }
    }
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', entry.id);
    
    if (onDragStart) {
      onDragStart(entry);
    }
  };

  // ✅ MEJORADO: Aplicar offset en dragOver con throttle y actualización condicional
  const handleDragOver = (e, entityId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rowEl = rowRefsMap.current[entityId];
    if (!rowEl) {
      // DEBUG && console.log('🟡 [DRAG OVER] No rowEl for:', entityId);
      return;
    }
    
    if (!draggedWorkOrder) {
      // DEBUG && console.log('🟡 [DRAG OVER] No draggedWorkOrder');
      return;
    }

    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colWidth = rect.width / TOTAL_QUARTERS;
    const mouseCol = Math.floor(x / colWidth);
    
    // ✅ Restar el offset para obtener la columna real de inicio
    const col = Math.max(0, mouseCol - dragOffset);

    let bubbleWidth = QUARTERS_PER_HOUR;
    if (draggedWorkOrder.planned_start_time && draggedWorkOrder.planned_end_time) {
      try {
        const start = new Date(draggedWorkOrder.planned_start_time);
        const end = new Date(draggedWorkOrder.planned_end_time);
        const durationMs = end - start;
        const durationHours = durationMs / (1000 * 60 * 60);
        bubbleWidth = Math.max(1, Math.round(durationHours * QUARTERS_PER_HOUR));
      } catch (err) {
        bubbleWidth = QUARTERS_PER_HOUR;
      }
    }

    setDragPreview({ entityId, col, width: bubbleWidth });
  };

  const handleDrop = (e, entityId) => {
    e.preventDefault();
    e.stopPropagation();

    setDragPreview(null);
    dragPreviewRef.current = null;
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }

    if (!draggedWorkOrder || !onDrop) return;

    const rowEl = rowRefsMap.current[entityId];
    if (!rowEl) return;

    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colWidth = rect.width / TOTAL_QUARTERS;
    const mouseCol = Math.floor(x / colWidth);
    
    const col = Math.max(0, mouseCol - dragOffset);

    const quarterIndex = col;
    const hourOffset = Math.floor(quarterIndex / QUARTERS_PER_HOUR);
    const calculatedHour = START_HOUR + hourOffset;
    const calculatedMin = (quarterIndex % QUARTERS_PER_HOUR) * 15;

    const newStart = new Date(currentDate);
    newStart.setHours(calculatedHour, calculatedMin, 0, 0);

    onDrop(draggedWorkOrder, entityId, newStart);
    setDragOffset(0);
  };

  const handleResizeStart = (e, entry, edge, entityId) => {
    e.stopPropagation();
    e.preventDefault();

    if (isReadOnly || isMultiSelectMode) return;

    const rowEl = rowRefsMap.current[entityId];
    if (!rowEl || !entry.planned_start_time) return;

    const rect = rowEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const colWidth = rect.width / TOTAL_QUARTERS;
    const clickCol = Math.floor(clickX / colWidth);

    const start = new Date(entry.planned_start_time);
    const end = entry.planned_end_time ? new Date(entry.planned_end_time) : new Date(start.getTime() + 60*60*1000);

    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const endHour = end.getHours();
    const endMin = end.getMinutes();

    DEBUG && console.log(`🟡 RESIZE START WO ${entry.work_order_number}:`, {
      edge,
      realTime: `${startHour}:${startMin.toString().padStart(2, '0')} - ${endHour}:${endMin.toString().padStart(2, '0')}`,
      clickCol,
      clickX,
      rectWidth: rect.width,
      colWidth,
      TOTAL_QUARTERS,
      calculatedColWidth: rect.width / TOTAL_QUARTERS
    });

    // Calcular quarters desde START_HOUR (clampear al rango visible)
    const startMinuteInRange = Math.max(0, (startHour - START_HOUR) * 60 + startMin);
    const endMinuteInRange = Math.min((END_HOUR - START_HOUR) * 60, (endHour - START_HOUR) * 60 + endMin);

    const startQuarter = Math.floor(startMinuteInRange / 15);
    const widthQuarters = Math.max(1, Math.round((endMinuteInRange - startMinuteInRange) / 15));

    DEBUG && console.log(`   Initial quarters: start=${startQuarter}, width=${widthQuarters}`);
    DEBUG && console.log(`   Minutes: startMin=${startMinuteInRange}, endMin=${endMinuteInRange}, duration=${endMinuteInRange - startMinuteInRange}min`);

    const resizeState = {
      entryId: entry.id,
      entityId,
      edge,
      initialCol: clickCol,
      initialStartQuarter: startQuarter,
      initialWidthQuarters: widthQuarters,
      newStartQuarter: startQuarter,
      newWidthQuarters: widthQuarters,
      originalStartHour: startHour,
      originalStartMin: startMin,
      originalEndHour: endHour,
      originalEndMin: endMin
    };

    setResizing(resizeState);
    resizingRef.current = resizeState;
  };

  const handleResizeMove = (e) => {
    if (!resizing) return;

    e.preventDefault();
    const rowEl = rowRefsMap.current[resizing.entityId];
    if (!rowEl) return;

    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colWidth = rect.width / TOTAL_QUARTERS;
    const currentCol = Math.floor(x / colWidth);

    const colDiff = currentCol - resizing.initialCol;

    let newStartQuarter = resizing.initialStartQuarter;
    let newWidthQuarters = resizing.initialWidthQuarters;

    if (resizing.edge === 'left') {
      newStartQuarter = Math.max(0, resizing.initialStartQuarter + colDiff);
      newWidthQuarters = Math.max(1, (resizing.initialStartQuarter + resizing.initialWidthQuarters) - newStartQuarter);
      DEBUG && console.log(`🟠 RESIZE MOVE (left):`, {
        mouseX: x,
        currentCol,
        colDiff,
        initialCol: resizing.initialCol,
        initialStart: resizing.initialStartQuarter,
        newStart: newStartQuarter,
        newWidth: newWidthQuarters,
        colWidth,
        rectWidth: rect.width
      });
    } else {
      newWidthQuarters = Math.max(1, resizing.initialWidthQuarters + colDiff);
      const currentEndQuarter = resizing.initialStartQuarter + newWidthQuarters;
      if (currentEndQuarter > TOTAL_QUARTERS) {
        newWidthQuarters = TOTAL_QUARTERS - resizing.initialStartQuarter;
      }
      DEBUG && console.log(`🟠 RESIZE MOVE (right):`, {
        mouseX: x,
        currentCol,
        colDiff,
        initialCol: resizing.initialCol,
        initialWidth: resizing.initialWidthQuarters,
        newWidth: newWidthQuarters,
        wouldEndAt: resizing.initialStartQuarter + newWidthQuarters,
        maxQuarters: TOTAL_QUARTERS,
        colWidth,
        rectWidth: rect.width
      });
    }

    setResizing(prev => {
      if (prev && prev.newStartQuarter === newStartQuarter && prev.newWidthQuarters === newWidthQuarters) return prev;
      const updated = { ...prev, newStartQuarter, newWidthQuarters };
      resizingRef.current = updated;
      return updated;
    });
  };

  const handleResizeEnd = async () => {
    const currentResizing = resizingRef.current;

    if (!currentResizing) {
      DEBUG && console.log('🔴 RESIZE END: No resizing state found');
      return;
    }

    const entry = filteredEntries.find(e => e.id === currentResizing.entryId);
    if (!entry || !entry.planned_start_time) {
      DEBUG && console.log('🔴 RESIZE END: Entry not found or no planned_start_time');
      setResizing(null);
      resizingRef.current = null;
      return;
    }

    const startQuarter = currentResizing.newStartQuarter ?? currentResizing.initialStartQuarter;
    const widthQuarters = currentResizing.newWidthQuarters ?? currentResizing.initialWidthQuarters;

    DEBUG && console.log(`🟢 RESIZE END WO ${entry.work_order_number}:`, {
      edge: currentResizing.edge,
      startQuarter,
      widthQuarters,
      initialStartQuarter: currentResizing.initialStartQuarter,
      initialWidthQuarters: currentResizing.initialWidthQuarters,
      originalTime: `${currentResizing.originalStartHour}:${currentResizing.originalStartMin.toString().padStart(2, '0')} - ${currentResizing.originalEndHour}:${currentResizing.originalEndMin.toString().padStart(2, '0')}`
    });

    if (startQuarter === currentResizing.initialStartQuarter && widthQuarters === currentResizing.initialWidthQuarters) {
      DEBUG && console.log('⚪ No changes detected, canceling resize');
      setResizing(null);
      resizingRef.current = null;
      return;
    }

    // Calcular delta de cambios
    const startDelta = startQuarter - currentResizing.initialStartQuarter;
    const widthDelta = widthQuarters - currentResizing.initialWidthQuarters;

    DEBUG && console.log(`   📊 Deltas: startDelta=${startDelta} quarters (${startDelta * 15}min), widthDelta=${widthDelta} quarters (${widthDelta * 15}min)`);

    // Aplicar cambios a las horas originales
    let newStartMinutes = currentResizing.originalStartHour * 60 + currentResizing.originalStartMin;
    let newEndMinutes = currentResizing.originalEndHour * 60 + currentResizing.originalEndMin;

    DEBUG && console.log(`   🕐 Original minutes: start=${newStartMinutes}min (${Math.floor(newStartMinutes/60)}:${(newStartMinutes%60).toString().padStart(2,'0')}), end=${newEndMinutes}min (${Math.floor(newEndMinutes/60)}:${(newEndMinutes%60).toString().padStart(2,'0')})`);

    if (currentResizing.edge === 'left') {
      newStartMinutes += startDelta * 15;
      DEBUG && console.log(`   ⬅️  Modified START by ${startDelta * 15}min → ${newStartMinutes}min (${Math.floor(newStartMinutes/60)}:${(newStartMinutes%60).toString().padStart(2,'0')})`);
    } else {
      newEndMinutes += widthDelta * 15;
      DEBUG && console.log(`   ➡️  Modified END by ${widthDelta * 15}min → ${newEndMinutes}min (${Math.floor(newEndMinutes/60)}:${(newEndMinutes%60).toString().padStart(2,'0')})`);
    }

    const newStart = new Date(currentDate);
    newStart.setHours(Math.floor(newStartMinutes / 60), newStartMinutes % 60, 0, 0);

    const newEnd = new Date(currentDate);
    newEnd.setHours(Math.floor(newEndMinutes / 60), newEndMinutes % 60, 0, 0);

    DEBUG && console.log(`   ✅ FINAL New times: ${newStart.getHours()}:${newStart.getMinutes().toString().padStart(2, '0')} - ${newEnd.getHours()}:${newEnd.getMinutes().toString().padStart(2, '0')}`);
    DEBUG && console.log(`   📤 Sending to onDrop...`);

    setJustResized(true);

    setResizing(null);
    resizingRef.current = null;

    if (onDrop) {
      const updatedEntry = {
        ...entry,
        planned_start_time: newStart.toISOString(),
        planned_end_time: newEnd.toISOString()
      };
      onDrop(updatedEntry, currentResizing.entityId, newStart);
    }

    setTimeout(() => {
      setJustResized(false);
    }, 150);
  };

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing]);

  // Cleanup pending RAF on unmount
  useEffect(() => {
    return () => {
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };
  }, []);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  return (
    <div className="flex flex-col bg-white rounded-lg relative">
      <style>{`
        body { overflow-x: auto !important; }
      `}</style>

      <div ref={scrollContainerRef} className="flex-1 relative overflow-x-auto">
        <div
          className="flex border-b border-slate-300 bg-slate-100 sticky top-0 z-30"
          style={{ minWidth: '100%' }}
        >
          <div className="w-[200px] bg-slate-200 border-r border-slate-300 p-2 flex-shrink-0 sticky left-0 z-40">
            <div className="text-xs font-bold text-slate-700">
              {localViewBy === 'project' ? 'Projects' : localViewBy === 'user' ? 'Users' : 'Teams'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TOTAL_QUARTERS}, 1fr)`, flex: 1 }}>
            {hours.map((hour, i) => (
              <div
                key={hour}
                className="relative border-r-2 border-slate-400"
                style={{ gridColumn: `${i * QUARTERS_PER_HOUR + 1} / ${i * QUARTERS_PER_HOUR + QUARTERS_PER_HOUR + 1}` }}
              >
                <div className="absolute left-0 top-1 -translate-x-1/2 bg-slate-100 px-1 text-[10px] font-semibold text-slate-700">
                  {String(hour).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ minWidth: '100%' }}>
          {sortedEntities.map((entity) => {
            const entityName = getEntityName(entity);
            const entitySubInfo = getEntitySubInfo(entity);
            const entityEntries = getEntriesForEntity(entity.id);



            return (
              <div key={entity.id} className="flex border-b border-slate-200">
                <div className="w-[200px] bg-slate-100 border-r border-slate-300 p-2 flex-shrink-0 sticky left-0 z-20 shadow-sm">
                  <div className="text-xs font-semibold text-slate-900 truncate">{entityName}</div>
                  {entitySubInfo && <div className="text-[10px] text-slate-600 truncate">{entitySubInfo}</div>}
                </div>

                {(() => {
                  // ✅ NUEVO: Organizar entries en filas (lanes) para evitar overlaps visuales
                  const organizeEntriesInLanes = (entries) => {
                    const lanes = [];
                    
                    // Ordenar por tiempo de inicio
                    const sortedEntries = [...entries].sort((a, b) => {
                      const timeA = a.planned_start_time ? new Date(a.planned_start_time).getTime() : 0;
                      const timeB = b.planned_start_time ? new Date(b.planned_start_time).getTime() : 0;
                      return timeA - timeB;
                    });
                    
                    sortedEntries.forEach(entry => {
                      const pos = getBubblePosition(entry);
                      if (!pos) return;
                      
                      // Encontrar la primera lane donde quepa sin overlap
                      let assignedLane = -1;
                      for (let i = 0; i < lanes.length; i++) {
                        const lane = lanes[i];
                        const lastEntry = lane[lane.length - 1];
                        const lastPos = getBubblePosition(lastEntry);
                        
                        // Si no hay overlap, usar esta lane
                        if (lastPos && pos.start >= lastPos.end) {
                          assignedLane = i;
                          break;
                        }
                      }
                      
                      // Si no encontramos lane, crear una nueva
                      if (assignedLane === -1) {
                        lanes.push([entry]);
                      } else {
                        lanes[assignedLane].push(entry);
                      }
                    });
                    
                    return lanes;
                  };
                  
                  const lanes = organizeEntriesInLanes(entityEntries);
                  const rowHeight = 90;
                  const totalHeight = Math.max(100, lanes.length * rowHeight);

                  return (
                    <div
                      ref={(el) => {
                        if (el) {
                          rowRefsMap.current[entity.id] = el;
                        }
                      }}
                      className="flex-1 bg-white"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${TOTAL_QUARTERS}, 1fr)`,
                        gridTemplateRows: `repeat(${lanes.length}, ${rowHeight}px)`,
                        width: '100%',
                        minHeight: `${totalHeight}px`,
                        height: `${totalHeight}px`,
                        backgroundImage: `
                          repeating-linear-gradient(to right,
                            transparent 0,
                            transparent calc(100% / ${TOTAL_QUARTERS} - 1px),
                            #cbd5e1 calc(100% / ${TOTAL_QUARTERS} - 1px),
                            #cbd5e1 calc(100% / ${TOTAL_QUARTERS})
                          ),
                          repeating-linear-gradient(to right,
                            transparent 0,
                            transparent calc(100% / ${TOTAL_HOURS} - 2px),
                            #64748b calc(100% / ${TOTAL_HOURS} - 2px),
                            #64748b calc(100% / ${TOTAL_HOURS})
                          )
                        `,
                      }}
                      onDragOver={(e) => handleDragOver(e, entity.id)}
                      onDrop={(e) => handleDrop(e, entity.id)}
                      onDragLeave={() => setDragPreview(null)}
                    >
                      {dragPreview && dragPreview.entityId === entity.id && (
                        <div
                          className="absolute bg-blue-200/80 border-2 border-blue-600 rounded shadow-lg flex items-center justify-center"
                          style={{
                            gridColumnStart: Math.max(1, Math.min(dragPreview.col + 1, TOTAL_QUARTERS)),
                            gridColumnEnd: Math.max(2, Math.min(dragPreview.col + dragPreview.width + 1, TOTAL_QUARTERS + 1)),
                            height: '60px',
                            top: '10px',
                            zIndex: 5,
                            pointerEvents: 'none',
                            marginLeft: '2px',
                            marginRight: '2px',
                          }}
                        >
                          <div className="text-blue-700 font-bold text-xs">📍 DROP HERE</div>
                        </div>
                      )}

                      {entityEntries.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] text-slate-300 pointer-events-none">
                          No WOs
                        </div>
                      )}

                      {lanes.map((lane, laneIndex) => {
                        return lane.map((entry) => {
                          const pos = getBubblePosition(entry);
                          if (!pos) return null;

                          const isSelected = selectedEntries instanceof Set && selectedEntries.has(entry.id);
                          const uIds = [...(entry.employee_ids || [])];
                          if (entry.employee_id && !uIds.includes(entry.employee_id)) uIds.push(entry.employee_id);
                          const assignedUsers = safeUsers.filter(u => uIds.includes(u.id) && !u.archived);
                          const woSequence = getWorkOrderSequence(entry, currentDate, entity.id);

                          let displayPos = pos;
                          if (resizing && resizing.entryId === entry.id) {
                            const startQ = resizing.newStartQuarter ?? resizing.initialStartQuarter;
                            const widthQ = resizing.newWidthQuarters ?? resizing.initialWidthQuarters;
                            displayPos = {
                              start: startQ + 1,
                              end: Math.min(startQ + widthQ + 1, TOTAL_QUARTERS + 1)
                            };
                            DEBUG && console.log(`🔷 RESIZING DISPLAY UPDATE WO ${entry.work_order_number}:`, {
                              startQ,
                              widthQ,
                              displayPos,
                              originalPos: pos
                            });
                          }

                          (() => {
                            const renderStart = new Date(entry.planned_start_time);
                            const renderEnd = entry.planned_end_time ? new Date(entry.planned_end_time) : null;

                            // Calcular qué hora del día representa cada posición del grid
                            const startGridHour = START_HOUR + ((displayPos.start - 1) / QUARTERS_PER_HOUR);
                            const endGridHour = START_HOUR + ((displayPos.end - 1) / QUARTERS_PER_HOUR);

                            // Verificar si el display coincide con el tiempo real
                            const expectedStart = (renderStart.getHours() - START_HOUR) * QUARTERS_PER_HOUR + Math.floor(renderStart.getMinutes() / 15) + 1;
                            const expectedEnd = renderEnd ? (renderEnd.getHours() - START_HOUR) * QUARTERS_PER_HOUR + Math.round(renderEnd.getMinutes() / 15) + 1 : expectedStart + 4;

                            const mismatch = displayPos.start !== expectedStart || displayPos.end !== expectedEnd;

                            DEBUG && console.log(`🎨 RENDERING WO ${entry.work_order_number}:`, {
                              realTime: `${renderStart.getHours()}:${renderStart.getMinutes().toString().padStart(2, '0')} - ${renderEnd?.getHours()}:${renderEnd?.getMinutes().toString().padStart(2, '0')}`,
                              displayPos: `start=${displayPos.start}, end=${displayPos.end}, span=${displayPos.end - displayPos.start}`,
                              gridRepresents: `${startGridHour.toFixed(2)}h - ${endGridHour.toFixed(2)}h`,
                              expectedPos: `start=${expectedStart}, end=${expectedEnd}`,
                              MISMATCH: mismatch ? '❌ POSITIONS DO NOT MATCH!' : '✅ OK',
                              isResizing: resizing && resizing.entryId === entry.id,
                              laneIndex
                            });
                          })();

                          return (
                            <div
                              key={entry.id}
                              draggable={!isReadOnly && !isMultiSelectMode && !resizing}
                              onDragStart={(e) => handleDragStart(e, entry, entity.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (resizing || justResized) return;
                                if (!isMultiSelectMode && onEntryClick) {
                                  onEntryClick(entry);
                                } else if (onToggleSelection) {
                                  onToggleSelection(entry.id);
                                }
                              }}
                              className={cn(
                                "relative rounded text-[10px] flex flex-col px-2 py-1 border-2 transition-all select-none m-0.5",
                                !isReadOnly && !isMultiSelectMode && !resizing && "cursor-grab active:cursor-grabbing hover:shadow-lg",
                                (isReadOnly || isMultiSelectMode || resizing) ? "cursor-pointer" : "",
                                getCategoryColor(entry.work_order_category_id),
                                isSelected && "ring-2 ring-indigo-500",
                                entry.status === 'closed' && "opacity-60 line-through border-green-600",
                                entry.status === 'open' && "border-blue-500"
                              )}
                              style={{
                                gridColumnStart: displayPos.start,
                                gridColumnEnd: displayPos.end,
                                gridRow: laneIndex + 1,
                                minHeight: '80px',
                                zIndex: resizing && resizing.entryId === entry.id ? 20 : 10,
                              }}
                            >
                        {!isReadOnly && !isMultiSelectMode && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-indigo-400/40 z-30 group"
                            onMouseDown={(e) => handleResizeStart(e, entry, 'left', entity.id)}
                            title="Drag to resize start time"
                          >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500/0 group-hover:bg-indigo-500/80 rounded-r transition-all" />
                          </div>
                        )}
                        
                        {!isReadOnly && !isMultiSelectMode && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-indigo-400/40 z-30 group"
                            onMouseDown={(e) => handleResizeStart(e, entry, 'right', entity.id)}
                            title="Drag to resize end time"
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500/0 group-hover:bg-indigo-500/80 rounded-l transition-all" />
                          </div>
                          )}

                          {isMultiSelectMode && (
                          <Checkbox 
                            checked={isSelected} 
                            onCheckedChange={() => onToggleSelection(entry.id)} 
                            className="mr-2 mb-1" 
                            onClick={(e) => e.stopPropagation()} 
                          />
                        )}

                        {entry.status === 'closed' && (
                          <div className="absolute -top-1 -right-1 bg-green-600 rounded-full p-0.5 shadow-sm pointer-events-none">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                          </div>
                        )}
                        {entry.status === 'ongoing' && (
                          <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-0.5 shadow-sm pointer-events-none">
                            <Play className="w-2.5 h-2.5 text-white fill-white" />
                          </div>
                        )}

                          <div className="flex items-center justify-between gap-1 mb-0.5 pointer-events-none">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-[10px]">
                              {woSequence && woSequence.position > 0 ? `${woSequence.position}/${woSequence.total}` : 'N/A'}
                            </span>
                            {entry.created_date && (
                              <span className="text-[7px] text-slate-500 font-mono">
                                {`created on ${format(new Date(entry.created_date), 'dd/MM/yy')}`}
                              </span>
                            )}
                          </div>
                          {assignedUsers.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {assignedUsers.slice(0, 4).map((user) => (
                                <Avatar key={user.id} user={user} size="xs" className="ring-1 ring-white rounded-lg" />
                              ))}
                              {assignedUsers.length > 4 && (
                                <div className="w-4 h-4 rounded-md bg-slate-300 border border-white flex items-center justify-center text-[7px] font-bold text-slate-700">
                                  +{assignedUsers.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {(() => {
                          const project = safeProjects.find(p => p.id === entry.project_id);
                          const customer = project ? safeCustomers.find(c => c.id === project.customer_id) : null;
                          return (
                            <div className="text-[7px] text-slate-500 truncate pointer-events-none mb-0.5">
                              {customer?.name}{customer && project ? ' - ' : ''}{project?.name}
                            </div>
                          );
                        })()}

                        {entry.title && (
                          <div className="text-[9px] text-slate-900 font-medium truncate pointer-events-none mb-0.5">
                            {entry.title}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-1 pointer-events-none">
                          <div className="text-[8px] text-slate-600 font-semibold flex flex-col leading-tight">
                            {entry.planned_start_time && <span>{format(parseISO(entry.planned_start_time), 'HH:mm')}</span>}
                            {entry.planned_end_time && <span>{format(parseISO(entry.planned_end_time), 'HH:mm')}</span>}
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
                          );
                        });
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {sortedEntities.length === 0 && (
            <div className="flex items-center justify-center py-12 text-slate-500">
              No work orders found
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft -= 200;
              }
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div
            className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden cursor-grab active:cursor-grabbing relative"
            onMouseDown={(e) => {
              const scrollbar = e.currentTarget;
              const container = scrollContainerRef.current;
              if (!container) return;

              const startX = e.clientX;
              const scrollLeft = container.scrollLeft;
              const scrollWidth = container.scrollWidth;
              const maxScrollLeft = container.scrollWidth - container.clientWidth;
              const scrollbarTrackWidth = scrollbar.clientWidth;

              const handleMouseMove = (e) => {
                const dx = e.clientX - startX;
                const scrollProportion = dx / scrollbarTrackWidth;
                container.scrollLeft = Math.max(0, Math.min(scrollLeft + (scrollProportion * scrollWidth), maxScrollLeft));
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{
                width: scrollContainerRef.current
                  ? `${Math.max(10, (scrollContainerRef.current.clientWidth / scrollContainerRef.current.scrollWidth) * 100)}%`
                  : '100%',
                transform: scrollContainerRef.current
                  ? `translateX(${
                      (scrollContainerRef.current.scrollLeft / (scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth)) *
                      (100 - (Math.max(10, (scrollContainerRef.current.clientWidth / scrollContainerRef.current.scrollWidth) * 100)))
                    }%)`
                  : 'translateX(0%)'
              }}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft += 200;
              }
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}