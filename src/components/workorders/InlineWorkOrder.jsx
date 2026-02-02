import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export default function InlineWorkOrder({
  entry,
  position,
  currentDate,
  projects,
  teams,
  users,
  workOrderCategories,
  getCategoryColor,
  onEntryClick,
  isMultiSelectMode,
  isSelected,
  onToggleSelection,
  onDragStart,
  draggedWorkOrder,
  isReadOnly,
  onUpdateEntry,
  calculateWOPosition,
  pixelsPerMinute = 1
}) {
  const [isDragging, setIsDragging] = useState(false);
  const workOrderRef = useRef(null);

  // Guard against undefined entry - AFTER hooks
  if (!entry || !position) {
    return null;
  }

  // Validate position times
  if (!position.startTime || !position.endTime) {
    console.warn('Invalid position times for entry:', entry.id);
    return null;
  }

  const project = projects?.find(p => p.id === entry.project_id);
  const category = workOrderCategories?.find(c => c.id === entry.work_order_category_id);
  
  const employeeIds = entry.employee_ids || (entry.employee_id ? [entry.employee_id] : []);
  const assignedUsers = users?.filter(u => employeeIds.includes(u.id)) || [];
  
  const teamIds = entry.team_ids || (entry.team_id ? [entry.team_id] : []);
  const assignedTeams = teams?.filter(t => teamIds.includes(t.id)) || [];

  const handleDragStart = (e) => {
    if (isReadOnly || entry.status === 'closed') {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    if (onDragStart) {
      onDragStart(entry);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = (e) => {
    if (isMultiSelectMode) {
      e.stopPropagation();
      if (onToggleSelection) {
        onToggleSelection(entry.id);
      }
    } else {
      if (onEntryClick) {
        onEntryClick(entry);
      }
    }
  };

  const categoryColorClass = category ? getCategoryColor(category.id) : 'bg-white';

  return (
    <div
      ref={workOrderRef}
      draggable={!isReadOnly && entry.status !== 'closed'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={cn(
        "absolute top-0.5 h-[calc(100%-4px)] rounded-md border shadow-sm cursor-pointer transition-all overflow-hidden group",
        categoryColorClass,
        entry.status === 'closed' && 'opacity-60',
        entry.status === 'on_queue' && 'border-amber-400 border-2',
        entry.status === 'ongoing' && 'border-blue-400',
        isDragging && 'opacity-50',
        isMultiSelectMode && isSelected && 'ring-2 ring-violet-500',
        !isReadOnly && entry.status !== 'closed' && 'hover:shadow-md hover:scale-[1.02]'
      )}
      style={{
        left: position.left,
        width: position.width,
        minWidth: '80px',
        zIndex: isDragging ? 1000 : 10
      }}
    >
      {/* Content - DOS LÍNEAS */}
      <div className="h-full flex flex-col justify-between p-1.5 relative">
        {/* Multi-select checkbox */}
        {isMultiSelectMode && (
          <div className="absolute top-0.5 right-0.5 z-20">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                if (onToggleSelection) {
                  onToggleSelection(entry.id);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-3 w-3 bg-white border-2"
            />
          </div>
        )}

        {/* Línea 1: Título a la izquierda + Avatares a la derecha */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          {/* Título */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-slate-900 truncate">
              {entry.title || 'Untitled'}
            </div>
          </div>

          {/* Avatares de empleados - filteredUsers prop will exclude on-leave users */}
          {assignedUsers.length > 0 && (
            <div className="flex -space-x-1 flex-shrink-0">
              {assignedUsers.slice(0, 3).map((user) => {
                const avatarUrl = user.avatar_url;
                const firstName = user.first_name || '';
                const lastName = user.last_name || '';
                const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
                
                return (
                  <div
                    key={user.id}
                    className="relative inline-block"
                    title={user.nickname || `${firstName} ${lastName}`.trim() || user.email}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={initials}
                        className="w-5 h-5 rounded-full border-2 border-white object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-bold border-2 border-white">
                        {initials}
                      </div>
                    )}
                  </div>
                );
              })}
              {assignedUsers.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[7px] font-bold border-2 border-white">
                  +{assignedUsers.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Línea 2: Hora */}
        <div className="text-[8px] text-slate-600 font-medium">
          {position.startTime} - {position.endTime}
        </div>
      </div>
    </div>
  );
}