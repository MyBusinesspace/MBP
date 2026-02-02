import React, { useMemo } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Avatar from '../Avatar';
import TeamAvatar from '../shared/TeamAvatar';

export default function WorkOrderWeekCell({
  date,
  entries = [],
  projects = [],
  categories = [],
  users = [],
  teams = [],
  customers = [],
  shiftTypes = [],
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
  onContextMenu,
  projectId
}) {
  const validEntries = useMemo(() => {
    // Filtrar solo entradas válidas que tengan datos
    return (entries || []).filter(entry => entry && typeof entry === 'object' && entry.id);
  }, [entries]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedWorkOrder && onDrop && !isReadOnly) {
      onDrop(draggedWorkOrder, date, projectId);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (!isReadOnly && onCreateWO) {
      onCreateWO(projectId, date);
    }
  };

  const handleContextMenuClick = (e) => {
    if (onContextMenu) {
      onContextMenu(e, date);
    }
  };

  return (
    <div
      className={cn(
        "bg-white p-2 min-h-[100px] border-r border-slate-200 relative group transition-colors",
        isSameDay(date, new Date()) && "bg-indigo-50/30"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenuClick}
    >
      {/* Work Orders */}
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {validEntries.map((entry) => {
          if (!entry || !entry.id) return null;

          const project = projects?.find(p => p.id === entry.project_id);
          const category = categories?.find(c => c.id === entry.work_order_category_id);
          const customer = project?.customer_id ? customers?.find(c => c.id === project.customer_id) : null;
          const shiftType = shiftTypes?.find(s => s.id === entry.shift_type_id);

          const employeeIds = entry.employee_ids || [];
          const assignedUsers = users?.filter(u => employeeIds.includes(u.id)) || [];
          
          const teamIds = entry.team_ids || [];
          const assignedTeams = teams?.filter(t => teamIds.includes(t.id)) || [];

          const isSelected = selectedEntries instanceof Set ? selectedEntries.has(entry.id) : false;

          return (
            <div
              key={entry.id}
              draggable={!isReadOnly && !isMultiSelectMode}
              onDragStart={(e) => {
                if (!isMultiSelectMode && onDragStart && !isReadOnly) {
                  e.stopPropagation();
                  onDragStart(entry);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isMultiSelectMode && onToggleSelection) {
                  onToggleSelection(entry.id);
                } else if (onEntryClick) {
                  onEntryClick(entry);
                }
              }}
              className={cn(
                "text-xs px-2 py-1.5 rounded border cursor-pointer transition-all hover:shadow-sm",
                getCategoryColor ? getCategoryColor(entry.work_order_category_id) : "bg-white border-slate-200",
                entry.status === 'closed' && "opacity-50",
                // entry.status === 'on_queue' was removed
                isMultiSelectMode && "hover:ring-2 hover:ring-violet-400",
                isMultiSelectMode && isSelected && "ring-2 ring-violet-600",
                !isReadOnly && "hover:scale-[1.02]"
              )}
            >
              {/* Ticker */}
              <div className="font-semibold text-slate-900 mb-0.5 text-[11px]">
                {entry.work_order_number || 'N/A'}
              </div>

              {/* Title */}
              {entry.title && (
                <div className="text-slate-700 truncate text-[10px] mb-1">
                  {entry.title}
                </div>
              )}

              {/* Project name (si no estamos en vista por proyecto) */}
              {!projectId && project && (
                <div className="text-slate-600 truncate text-[10px] mb-1">
                  📍 {project.name}
                </div>
              )}

              {/* Time + Category */}
              <div className="flex items-center justify-between mt-1 text-[9px] text-slate-500">
                {/* Time */}
                {entry.planned_start_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {format(parseISO(entry.planned_start_time), 'HH:mm')}
                  </span>
                )}

                {/* Shift badge */}
                {shiftType && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0">
                    {shiftType.name}
                  </Badge>
                )}
              </div>

              {/* Teams & Users */}
              {(assignedTeams.length > 0 || assignedUsers.length > 0) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {/* Teams */}
                  {assignedTeams.length > 0 && (
                    <div className="flex -space-x-1">
                      {assignedTeams.slice(0, 2).map(team => (
                        <TeamAvatar
                          key={team.id}
                          team={team}
                          size="xs"
                          className="border-2 border-white"
                        />
                      ))}
                      {assignedTeams.length > 2 && (
                        <div className="w-5 h-5 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[8px] font-semibold">
                          +{assignedTeams.length - 2}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Users */}
                  {assignedUsers.length > 0 && (
                    <div className="flex -space-x-1">
                      {assignedUsers.slice(0, 3).map(user => (
                        <Avatar
                          key={user.id}
                          user={user}
                          size="xs"
                          className="border-2 border-white"
                        />
                      ))}
                      {assignedUsers.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[8px] font-semibold">
                          +{assignedUsers.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Category badge */}
              {category && (
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className="text-[8px] px-1 py-0"
                    style={{
                      borderColor: category.color_hex || '#cbd5e1',
                      backgroundColor: `${category.color_hex}20` || '#f1f5f9'
                    }}
                  >
                    {category.name}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state / Add button */}
      {!isReadOnly && validEntries.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onCreateWO) {
                onCreateWO(projectId, date);
              }
            }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            + Add WO
          </button>
        </div>
      )}
    </div>
  );
}