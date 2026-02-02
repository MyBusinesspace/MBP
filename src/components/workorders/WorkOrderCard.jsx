import React from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Copy, Trash2, Edit, Eye, Camera, PlayCircle, CheckCircle2 } from 'lucide-react';

const categoryColorConfig = {
  gray: 'bg-gray-100 text-gray-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  purple: 'bg-purple-100 text-purple-800',
  pink: 'bg-pink-100 text-pink-800',
  orange: 'bg-orange-100 text-orange-800',
  teal: 'bg-teal-100 text-teal-800'
};

export default function WorkOrderCard({ 
  workOrder, 
  project, 
  asset, 
  shiftType,
  photoCount = 0,
  sequence = null, // ✅ NUEVO: recibir sequence calculada desde el parent
  onView, 
  onEdit, 
  onCopy, 
  onDelete 
}) {
  const shiftColor = shiftType?.color || 'gray';

  const isOpen = workOrder.status === 'open' || workOrder.status === 'ongoing';
  const isClosed = workOrder.status === 'closed';

  return (
    <div className="group relative bg-white border border-slate-200 rounded-lg p-2 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Work Order Number with Status Icon */}
          <div className="flex items-center gap-1 mb-1">
            {isOpen && <PlayCircle className="w-3 h-3 text-green-600" />}
            {isClosed && <CheckCircle2 className="w-3 h-3 text-slate-600" />}
            <div className="text-[10px] font-mono text-slate-500">
              {sequence ? `N${sequence.position} of ${sequence.total}` : (workOrder.work_order_number || 'N/A')}
            </div>
          </div>

          {/* Project Name */}
          <div className="font-medium text-xs text-slate-900 truncate">
            {project?.name || 'No project'}
          </div>

          {/* Asset */}
          {asset && (
            <div className="text-[10px] text-slate-600 truncate mt-0.5">
              {asset.name}
            </div>
          )}

          {/* Shift Type Badge */}
          {shiftType && (
            <Badge 
              className={`${categoryColorConfig[shiftColor]} text-[9px] px-1.5 py-0 mt-1`}
            >
              {shiftType.name}
            </Badge>
          )}

          {/* Photo Count */}
          {photoCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
              <Camera className="w-3 h-3" />
              {photoCount}
            </div>
          )}
        </div>

        {/* Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(workOrder)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(workOrder)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopy(workOrder)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(workOrder)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task Note Preview */}
      {workOrder.task && (
        <div className="text-[10px] text-slate-500 line-clamp-2 mt-1">
          {workOrder.task}
        </div>
      )}
    </div>
  );
}