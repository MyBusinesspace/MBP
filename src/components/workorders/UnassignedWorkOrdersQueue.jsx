import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function UnassignedWorkOrdersQueue({
  isOpen,
  onClose,
  entries = [],
  projects = [],
  customers = [],
  categories = [],
  shiftTypes = [],
  teams = [],
  users = [],
  onEntryClick,
  getCategoryColor
}) {
  // ✅ Validación defensiva: Asegurar que todos los arrays existen
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeUsers = Array.isArray(users) ? users : [];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Unassigned Work Orders
            <Badge variant="secondary" className="ml-2">
              {safeEntries.length}
            </Badge>
          </SheetTitle>
          <p className="text-sm text-slate-600">
            Work orders without teams or users assigned
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {safeEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                All Clear!
              </h3>
              <p className="text-sm text-slate-600 max-w-sm">
                All work orders have teams or users assigned
              </p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {safeEntries.map(entry => {
                const project = safeProjects.find(p => p.id === entry.project_id);
                const customer = project?.customer_id ? safeCustomers.find(c => c.id === project.customer_id) : null;
                const category = safeCategories.find(c => c.id === entry.work_order_category_id);
                const shiftType = safeShiftTypes.find(s => s.id === entry.shift_type_id);

                return (
                  <div
                    key={entry.id}
                    onClick={() => onEntryClick && onEntryClick(entry)}
                    className={cn(
                      "p-4 rounded-lg cursor-pointer border-2 transition-all hover:shadow-md",
                      getCategoryColor && getCategoryColor(entry.work_order_category_id),
                      "hover:border-indigo-400"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 mb-1">
                          {entry.work_order_number || 'Untitled'}
                        </div>
                        {entry.title && (
                          <div className="text-sm text-slate-700 mb-1">
                            {entry.title}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          entry.status === 'ongoing' && "bg-green-100 text-green-700",
                          entry.status === 'on_queue' && "bg-yellow-100 text-yellow-700",
                          entry.status === 'closed' && "bg-slate-100 text-slate-700"
                        )}
                      >
                        {entry.status === 'on_queue' ? 'Queue' : entry.status}
                      </Badge>
                    </div>

                    {/* Project & Customer */}
                    <div className="space-y-1 mb-3">
                      {project && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-700 truncate">{project.name}</span>
                        </div>
                      )}
                      {customer && (
                        <div className="text-xs text-slate-500 ml-5 truncate">
                          {customer.name}
                        </div>
                      )}
                    </div>

                    {/* Time & Category Info */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {entry.planned_start_time && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3 h-3" />
                          <span>
                            {format(parseISO(entry.planned_start_time), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      )}

                      {category && (
                        <Badge variant="outline" className="text-xs">
                          {category.name}
                        </Badge>
                      )}

                      {shiftType && (
                        <Badge variant="outline" className="text-xs">
                          {shiftType.name}
                        </Badge>
                      )}
                    </div>

                    {/* Work Notes */}
                    {entry.work_notes && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {entry.work_notes}
                        </p>
                      </div>
                    )}

                    {/* Warning Banner */}
                    <div className="mt-3 flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>No teams or users assigned</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}