
import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronDown, ChevronUp, Building2, Users, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function QueueWorkOrdersPanel({
  entries = [],
  projects = [],
  customers = [],
  users = [],
  teams = [],
  categories = [],
  onEntryClick,
  getCategoryColor
}) {
  const [isExpanded, setIsExpanded] = useState(false); // Cambiado a false por defecto

  const queuedWorkOrders = useMemo(() => {
    // SOLO mostrar work orders con status "on_queue"
    return entries
      .filter(e => e.status === 'on_queue')
      .sort((a, b) => {
        // Ordenar por fecha planeada
        if (a.planned_start_time && b.planned_start_time) {
          return new Date(a.planned_start_time) - new Date(b.planned_start_time);
        }
        // Si no tiene fecha, va al final
        if (!a.planned_start_time) return 1;
        if (!b.planned_start_time) return -1;
        return 0;
      });
  }, [entries]);

  const groupedByProject = useMemo(() => {
    const groups = {};
    queuedWorkOrders.forEach(wo => {
      const projectId = wo.project_id || 'unassigned';
      if (!groups[projectId]) {
        groups[projectId] = [];
      }
      groups[projectId].push(wo);
    });
    return groups;
  }, [queuedWorkOrders]);

  if (queuedWorkOrders.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-200 bg-amber-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-200 rounded-lg">
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-900">Queue Work Orders</span>
            <Badge variant="secondary" className="bg-amber-200 text-amber-900">
              {queuedWorkOrders.length}
            </Badge>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-amber-700" />
        ) : (
          <ChevronDown className="w-5 h-5 text-amber-700" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 max-h-96 overflow-y-auto" style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <style>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {Object.entries(groupedByProject).map(([projectId, workOrders]) => {
            const project = projects.find(p => p.id === projectId);
            const customer = project ? customers.find(c => c.id === project.customer_id) : null;

            return (
              <div key={projectId} className="mb-3">
                {/* Project Header */}
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-700">
                    {project?.name || 'Unassigned'}
                  </span>
                  {customer && (
                    <span className="text-slate-500 text-xs">({customer.name})</span>
                  )}
                </div>

                {/* Work Orders */}
                <div className="space-y-2 ml-6">
                  {workOrders.map(wo => {
                    const teamIds = wo.team_ids || [];
                    const assignedTeams = teams.filter(t => teamIds.includes(t.id));
                    const employeeIds = wo.employee_ids || [];
                    const assignedUsers = users.filter(u => employeeIds.includes(u.id));
                    const category = categories.find(c => c.id === wo.work_order_category_id);

                    return (
                      <div
                        key={wo.id}
                        onClick={() => onEntryClick(wo)}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                          getCategoryColor ? getCategoryColor(wo.work_order_category_id) : "bg-white"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900 truncate">
                              {wo.work_order_number && (
                                <span className="text-amber-600 mr-2">{wo.work_order_number}</span>
                              )}
                              {wo.title || 'Untitled'}
                            </div>
                            
                            {wo.planned_start_time && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(wo.planned_start_time), 'dd/MM/yyyy HH:mm')}
                              </div>
                            )}

                            {(assignedTeams.length > 0 || assignedUsers.length > 0) && (
                              <div className="flex items-center gap-2 mt-2">
                                {assignedTeams.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs text-slate-600">
                                      {assignedTeams.map(t => t.name).join(', ')}
                                    </span>
                                  </div>
                                )}
                                {assignedUsers.length > 0 && (
                                  <div className="flex -space-x-1">
                                    {assignedUsers.slice(0, 3).map(user => (
                                      <div
                                        key={user.id}
                                        className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-semibold overflow-hidden"
                                        title={user.nickname || user.first_name || user.full_name}
                                      >
                                        {user.avatar_url ? (
                                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <span>
                                            {user.first_name?.[0]?.toUpperCase() || user.full_name?.[0]?.toUpperCase() || '?'}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                    {assignedUsers.length > 3 && (
                                      <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[9px] font-semibold">
                                        +{assignedUsers.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {category && (
                            <div className="flex-shrink-0">
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{ 
                                  borderColor: category.color ? `${category.color}-300` : 'slate-300'
                                }}
                              >
                                {category.name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
