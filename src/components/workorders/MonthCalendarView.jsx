import React, { useState, useMemo } from 'react';
import { format, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Helper to format work order number as "X/MM/YY"
const formatWorkOrderNumber = (workOrderNumber, createdDate) => {
  if (!workOrderNumber) return 'N/A';
  
  // Extract number from "N123" format
  const match = String(workOrderNumber).match(/N(\d+)/);
  if (!match) return workOrderNumber;
  
  const number = match[1];
  
  // Get month and year from created_date or current date
  const date = createdDate ? new Date(createdDate) : new Date();
  const month = date.getMonth() + 1; // 1-12
  const year = String(date.getFullYear()).slice(-2); // Last 2 digits
  
  return `${number}/${month}/${year}`;
};
import {
  Plus,
  Copy,
  Check,
  Play,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';



export default function MonthCalendarView({
  currentMonth,
  onMonthChange,
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
  onShowFilters,
  onShowTeams,
  viewMode = 'month',
  onViewModeChange,
}) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : [];
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeClientEquipments = Array.isArray(clientEquipments) ? clientEquipments : [];

  const [searchQuery, setSearchQuery] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return safeEntries;
    
    const query = searchQuery.toLowerCase();
    return safeEntries.filter(entry => {
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
  }, [safeEntries, searchQuery, safeProjects, safeCustomers, safeUsers, safeTeams]);

  const getEntriesForDay = (day) => {
    const dayEntries = filteredEntries.filter(entry => {
      if (!entry.planned_start_time) return false;
      
      try {
        const entryDate = parseISO(entry.planned_start_time);
        if (isNaN(entryDate.getTime())) return false;
        
        const matches = isSameDay(entryDate, day);
        return matches;
      } catch (error) {
        console.warn('Error parsing date in MonthCalendarView:', error);
        return false;
      }
    });

    return dayEntries.sort((a, b) => {
      // Extract number from work order number (e.g., "N123" -> 123)
      const extractNumber = (str) => {
        if (!str) return 0;
        const match = String(str).match(/N(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      
      // Sort by work order number only
      return extractNumber(a.work_order_number) - extractNumber(b.work_order_number);
    });
  };

  const handleDragStart = (e, entry) => {
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) {
      onDragStart(entry);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    
    if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
      console.error('❌ Invalid day in MonthCalendarView handleDrop:', day);
      return;
    }

    if (draggedWorkOrder && onDrop && typeof onDrop === 'function') {
      onDrop(draggedWorkOrder, null, day);
    }
  };

  // ✅ Dividir días en semanas para layout correcto
  const weekRows = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weekRows.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col bg-white rounded-lg relative">
      <style>{`
        body { overflow-x: auto !important; }
      `}</style>

      <div className="flex-1 relative">
        {/* ✅ STICKY: Header de días de la semana */}
        <div className="grid grid-cols-7 bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-20">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-bold text-slate-700 border-r border-slate-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* ✅ Grid de semanas (hace scroll) */}
        <div className="flex flex-col">
          {weekRows.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-b border-slate-200 last:border-b-0">
              {week.map((day, dayIdx) => {
                const dayEntries = getEntriesForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                
                const dayOfWeek = format(day, 'EEE');
                const dayNumber = format(day, 'd');

                const visibleEntries = dayEntries.slice(0, 4);
                const remainingCount = dayEntries.length > 4 ? dayEntries.length - 4 : 0;

                return (
                  <ContextMenu key={dayIdx}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={cn(
                          "min-h-[120px] p-2 border-r border-slate-200 last:border-r-0 transition-colors hover:bg-slate-50",
                          !isCurrentMonth && "bg-slate-50/50",
                          isToday && "bg-blue-50 border-blue-300"
                        )}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                      >
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              !isCurrentMonth && "text-slate-400",
                              isToday && "text-blue-600"
                            )}
                          >
                            {dayNumber}
                          </span>
                          {dayEntries.length > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="text-[9px] px-1 py-0"
                              title={`Total: ${dayEntries.length} work orders`}
                            >
                              {dayEntries.length}
                            </Badge>
                          )}
                        </div>

                        {dayEntries.length === 0 && (
                          <div className="text-[8px] text-slate-300 text-center py-2">
                            No WOs
                          </div>
                        )}

                        {/* Work Orders */}
                        <div className="space-y-1">
                          {/* ✅ Mostrar más entries (hasta 6) para que coincida más con la realidad */}
                          {dayEntries.slice(0, 6).map((entry, entryIdx) => {
                            const isSelected = selectedEntries instanceof Set && selectedEntries.has(entry.id);

                            return (
                              <div
                                key={entry.id}
                                draggable={!isReadOnly && !isMultiSelectMode}
                                onDragStart={(e) => handleDragStart(e, entry)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onEntryClick) {
                                    onEntryClick(entry);
                                  }
                                }}
                                className={cn(
                                  "p-1 rounded text-[10px] cursor-pointer truncate border border-transparent relative",
                                  "hover:shadow-md hover:border-slate-400 hover:scale-[1.02] transition-all duration-150",
                                  "active:scale-95",
                                  getCategoryColor && getCategoryColor(entry.work_order_category_id),
                                  isSelected && "ring-2 ring-indigo-500",
                                  entry.status === 'closed' && "border-2 border-green-600",
                                  entry.status === 'ongoing' && "border-2 border-blue-500"
                                )}
                                style={{ cursor: !isReadOnly && !isMultiSelectMode ? 'move' : 'pointer' }}
                              >
                                {entry.status === 'closed' && (
                                  <div className="absolute -top-1 -right-1 bg-green-600 rounded-full p-0.5 shadow-sm z-10">
                                    <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                                  </div>
                                )}
                                {entry.status === 'ongoing' && (
                                  <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-0.5 shadow-sm z-10">
                                    <Play className="w-2.5 h-2.5 text-white fill-white" />
                                  </div>
                                )}


                                <div className="flex flex-col pointer-events-none">
                                  <div className="font-medium truncate text-[10px]">
                                    {entry.created_date ? `created on ${format(new Date(entry.created_date), 'dd/MM/yy')}` : ''}
                                  </div>
                                  <div className="truncate text-slate-700">
                                    {entry.title || 'Untitled'}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pointer-events-none">
                                  {(() => {
                                    const uIds = [...(entry.employee_ids || [])];
                                    if (entry.employee_id && !uIds.includes(entry.employee_id)) uIds.push(entry.employee_id);
                                    const assignedUsers = safeUsers.filter(u => uIds.includes(u.id) && !u.archived);
                                    return assignedUsers.length > 0 ? (
                                      <div className="flex items-center -space-x-1 flex-shrink-0 mr-1">
                                        {assignedUsers.slice(0, 3).map((user) => (
                                          <span key={user.id} className="inline-flex">
                                            <img src={user.avatar_url || ''} alt={user.nickname || user.first_name || user.email} className="w-4 h-4 rounded-md border border-white object-cover" />
                                          </span>
                                        ))}
                                        {assignedUsers.length > 3 && (
                                          <div className="w-4 h-4 rounded bg-slate-300 border border-white flex items-center justify-center text-[6px] font-bold text-slate-700">
                                            +{assignedUsers.length - 3}
                                          </div>
                                        )}
                                      </div>
                                    ) : null;
                                  })()}
                                  {entry.planned_start_time && (
                                    <div className="text-[9px] text-slate-600">
                                      {format(parseISO(entry.planned_start_time), 'HH:mm')}
                                    </div>
                                  )}
                                  {(() => {
                                    const equipmentIds = entry.equipment_ids || [];
                                    if (equipmentIds.length === 0) return null;
                                    const allEquipment = [...safeAssets, ...safeClientEquipments];
                                    const entryEquipment = allEquipment.filter(eq => equipmentIds.includes(eq.id));
                                    if (entryEquipment.length === 0) return null;
                                    return (
                                      <div className="flex items-center -space-x-0.5">
                                        {entryEquipment.slice(0, 2).map(eq => (
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
                                        {entryEquipment.length > 2 && (
                                          <div className="w-3 h-3 rounded-full bg-slate-800 border border-white flex items-center justify-center">
                                            <span className="text-[5px] text-white font-bold">+{entryEquipment.length - 2}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                          {dayEntries.length > 6 && (
                            <div 
                              className="text-[9px] text-slate-500 text-center py-0.5 font-medium"
                              title={`${dayEntries.length - 6} more work orders (Total: ${dayEntries.length})`}
                            >
                              +{dayEntries.length - 6} more
                            </div>
                          )}
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      {!isReadOnly && (
                        <>
                          <ContextMenuItem
                            onClick={() => onCreateWO && onCreateWO(null, day)}
                          >
                            <Plus className="w-3 h-3 mr-2" />
                            Create Working Report
                          </ContextMenuItem>
                          {dayEntries.length > 0 && (
                            <ContextMenuItem
                              onClick={() => onCopyWorkOrders && onCopyWorkOrders(dayEntries, day)}
                            >
                              <Copy className="w-3 h-3 mr-2" />
                              Copy {dayEntries.length} WO(s)
                            </ContextMenuItem>
                          )}
                          {copiedWorkOrders && copiedWorkOrders.length > 0 && (
                            <ContextMenuItem
                              onClick={() => onPasteWorkOrders && onPasteWorkOrders(day)}
                            >
                              <Copy className="w-3 h-3 mr-2" />
                              Paste {copiedWorkOrders.length} WO(s)
                            </ContextMenuItem>
                          )}
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}