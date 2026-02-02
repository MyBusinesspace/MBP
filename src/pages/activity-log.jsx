import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/components/DataProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  History,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import Avatar from '@/components/Avatar';
import { TableSkeleton } from '@/components/skeletons/PageSkeleton';

const actionColors = {
  'Created': 'text-green-700 bg-green-100',
  'Edited': 'text-blue-700 bg-blue-100',
  'Deleted': 'text-red-700 bg-red-100',
  'Archived': 'text-orange-700 bg-orange-100',
  'Pasted': 'text-purple-700 bg-purple-100',
  'Copied': 'text-indigo-700 bg-indigo-100',
  'Dropped': 'text-cyan-700 bg-cyan-100',
};

const entityTypeLabels = {
  'TimeEntry': 'Work Order',
  'Project': 'Project',
  'Customer': 'Client',
  'Contact': 'Contact',
  'User': 'User',
  'Team': 'Team',
  'Asset': 'Asset',
};

export default function ActivityLogPage() {
  const { currentUser, loadUsers } = useData();
  
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedActions, setSelectedActions] = useState([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const loadActivityData = async () => {
    console.log('📥 Loading activity log data...');
    setLoading(true);
    try {
      const [usersData, workOrders, projects, customers, contacts] = await Promise.all([
        loadUsers(true),
        (async () => {
          try {
            const { TimeEntry } = await import('@/entities/all');
            return await TimeEntry.list('-updated_date', 1000);
          } catch { return []; }
        })(),
        (async () => {
          try {
            const { Project } = await import('@/entities/all');
            return await Project.list('-updated_date', 1000);
          } catch { return []; }
        })(),
        (async () => {
          try {
            const { Customer } = await import('@/entities/all');
            return await Customer.list('-updated_date', 1000);
          } catch { return []; }
        })(),
        (async () => {
          try {
            const { Contact } = await import('@/entities/all');
            return await Contact.list('-updated_date', 1000);
          } catch { return []; }
        })(),
      ]);

      setUsers(usersData || []);

      const allActivities = [];

      // Collect from Work Orders
      (workOrders || []).forEach(wo => {
        if (wo.activity_log && Array.isArray(wo.activity_log)) {
          wo.activity_log.forEach(log => {
            allActivities.push({
              ...log,
              entity_type: 'TimeEntry',
              entity_id: wo.id,
              entity_name: wo.work_order_number || wo.title || 'Untitled',
            });
          });
        }
      });

      // Collect from Projects
      (projects || []).forEach(project => {
        if (project.activity_log && Array.isArray(project.activity_log)) {
          project.activity_log.forEach(log => {
            allActivities.push({
              ...log,
              entity_type: 'Project',
              entity_id: project.id,
              entity_name: project.name || 'Untitled',
            });
          });
        }
      });

      // Collect from Customers
      (customers || []).forEach(customer => {
        if (customer.activity_log && Array.isArray(customer.activity_log)) {
          customer.activity_log.forEach(log => {
            allActivities.push({
              ...log,
              entity_type: 'Customer',
              entity_id: customer.id,
              entity_name: customer.name || 'Untitled',
            });
          });
        }
      });

      // Collect from Contacts
      (contacts || []).forEach(contact => {
        if (contact.activity_log && Array.isArray(contact.activity_log)) {
          contact.activity_log.forEach(log => {
            allActivities.push({
              ...log,
              entity_type: 'Contact',
              entity_id: contact.id,
              entity_name: contact.name || 'Untitled',
            });
          });
        }
      });

      console.log('✅ Total activities collected:', allActivities.length);
      setActivities(allActivities);
    } catch (error) {
      console.error('❌ Failed to load activity log:', error);
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadActivityData();
    setIsRefreshing(false);
    toast.success('Activity log refreshed');
  };

  useEffect(() => {
    if (currentUser) {
      loadActivityData();
    }
  }, [currentUser]);

  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => {
        const searchText = [
          activity.entity_name,
          activity.user_name,
          activity.user_email,
          activity.action,
          activity.details,
          entityTypeLabels[activity.entity_type]
        ].filter(Boolean).join(' ').toLowerCase();
        return searchText.includes(query);
      });
    }

    // User filter
    if (selectedUsers.length > 0) {
      filtered = filtered.filter(activity => 
        selectedUsers.includes(activity.user_email)
      );
    }

    // Action filter
    if (selectedActions.length > 0) {
      filtered = filtered.filter(activity => 
        selectedActions.includes(activity.action)
      );
    }

    // Entity type filter
    if (selectedEntityTypes.length > 0) {
      filtered = filtered.filter(activity => 
        selectedEntityTypes.includes(activity.entity_type)
      );
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(activity => {
        if (!activity.timestamp) return false;
        const activityDate = activity.timestamp.split('T')[0];
        return activityDate >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter(activity => {
        if (!activity.timestamp) return false;
        const activityDate = activity.timestamp.split('T')[0];
        return activityDate <= endDate;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;

      if (sortBy === 'date') {
        aValue = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        bValue = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      } else if (sortBy === 'user') {
        aValue = a.user_name || a.user_email || '';
        bValue = b.user_name || b.user_email || '';
      } else if (sortBy === 'action') {
        aValue = a.action || '';
        bValue = b.action || '';
      } else if (sortBy === 'entity') {
        aValue = entityTypeLabels[a.entity_type] || '';
        bValue = entityTypeLabels[b.entity_type] || '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [activities, searchQuery, selectedUsers, selectedActions, selectedEntityTypes, startDate, endDate, sortBy, sortOrder]);

  const uniqueActions = useMemo(() => {
    const actions = new Set();
    activities.forEach(a => {
      if (a.action) actions.add(a.action);
    });
    return Array.from(actions).sort();
  }, [activities]);

  const uniqueEntityTypes = useMemo(() => {
    const types = new Set();
    activities.forEach(a => {
      if (a.entity_type) types.add(a.entity_type);
    });
    return Array.from(types).sort();
  }, [activities]);

  const uniqueUsers = useMemo(() => {
    const userEmails = new Set();
    activities.forEach(a => {
      if (a.user_email) userEmails.add(a.user_email);
    });
    return Array.from(userEmails).map(email => {
      const user = users.find(u => u.email === email);
      return {
        email,
        name: user?.nickname || user?.first_name || user?.full_name || email
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [activities, users]);

  const handleUserToggle = (userEmail) => {
    setSelectedUsers(prev => 
      prev.includes(userEmail) 
        ? prev.filter(e => e !== userEmail)
        : [...prev, userEmail]
    );
  };

  const handleActionToggle = (action) => {
    setSelectedActions(prev => 
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const handleEntityTypeToggle = (entityType) => {
    setSelectedEntityTypes(prev => 
      prev.includes(entityType)
        ? prev.filter(t => t !== entityType)
        : [...prev, entityType]
    );
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <TableSkeleton rows={10} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <History className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
              <p className="text-sm text-slate-500">Track all changes across the system</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
        <div className="flex gap-3 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterExpanded(!filterExpanded)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(selectedUsers.length > 0 || selectedActions.length > 0 || selectedEntityTypes.length > 0 || startDate || endDate) && (
              <Badge variant="secondary" className="ml-1">
                {selectedUsers.length + selectedActions.length + selectedEntityTypes.length + (startDate ? 1 : 0) + (endDate ? 1 : 0)}
              </Badge>
            )}
            {filterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Badge variant="secondary" className="text-sm">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
          </Badge>
        </div>

        {filterExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            {/* Date Range */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">From</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">To</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Actions</p>
              <div className="flex flex-wrap gap-2">
                {uniqueActions.map(action => {
                  const isSelected = selectedActions.includes(action);
                  return (
                    <div
                      key={action}
                      onClick={() => handleActionToggle(action)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border",
                        isSelected 
                          ? "bg-slate-100 border-slate-400" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      <span className="text-sm">{action}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Entity Types */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Entity Types</p>
              <div className="flex flex-wrap gap-2">
                {uniqueEntityTypes.map(entityType => {
                  const isSelected = selectedEntityTypes.includes(entityType);
                  return (
                    <div
                      key={entityType}
                      onClick={() => handleEntityTypeToggle(entityType)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border",
                        isSelected 
                          ? "bg-slate-100 border-slate-400" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      <span className="text-sm">{entityTypeLabels[entityType] || entityType}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Users */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Users
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {uniqueUsers.map(({ email, name }) => {
                  const isSelected = selectedUsers.includes(email);
                  const user = users.find(u => u.email === email);
                  return (
                    <div
                      key={email}
                      onClick={() => handleUserToggle(email)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer transition-all",
                        isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      <Avatar user={user} size="xs" />
                      <span className="text-sm">{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedUsers.length > 0 || selectedActions.length > 0 || selectedEntityTypes.length > 0 || startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedUsers([]);
                  setSelectedActions([]);
                  setSelectedEntityTypes([]);
                  setStartDate('');
                  setEndDate('');
                }}
                className="mt-2"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortBy === 'date' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('user')}
                >
                  <div className="flex items-center gap-1">
                    User
                    {sortBy === 'user' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('action')}
                >
                  <div className="flex items-center gap-1">
                    Action
                    {sortBy === 'action' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('entity')}
                >
                  <div className="flex items-center gap-1">
                    Entity
                    {sortBy === 'entity' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No activities found
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity, index) => {
                  const user = users.find(u => u.email === activity.user_email);
                  const actionColor = actionColors[activity.action] || 'text-slate-700 bg-slate-100';

                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {activity.timestamp ? (
                          <div>
                            <div className="font-medium">
                              {format(parseISO(activity.timestamp), 'dd MMM yyyy')}
                            </div>
                            <div className="text-xs text-slate-500">
                              {format(parseISO(activity.timestamp), 'HH:mm')}
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar user={user} size="xs" />
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">
                              {activity.user_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {activity.user_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("text-xs font-medium", actionColor)}>
                          {activity.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {entityTypeLabels[activity.entity_type] || activity.entity_type}
                          </div>
                          <div className="text-xs text-slate-500">
                            {activity.entity_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {activity.details || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}