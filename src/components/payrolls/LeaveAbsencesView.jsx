import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { LeaveRequest } from '@/entities/all';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import LeaveRequestDialog from './LeaveRequestDialog';
import LeaveRequestDetailsDialog from './LeaveRequestDetailsDialog';

export default function LeaveAbsencesView({ users, currentUser, onRefresh }) {
  console.log('🐛 [LeaveAbsences] Render - useMemo available?', typeof useMemo);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const loadLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const requests = await LeaveRequest.list('-created_date', 1000);
      setLeaveRequests(requests || []);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  // Enriquecer requests con datos de usuario
  const enrichedRequests = useMemo(() => {
    return leaveRequests.map(request => {
      const employee = users.find(u => u.id === request.employee_id);
      const approver = users.find(u => u.id === request.approver_id);
      
      // Calcular días automáticamente
      let totalDays = 0;
      if (request.start_date && request.end_date) {
        totalDays = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
      }
      
      return {
        ...request,
        employee,
        approver,
        employeeName: employee?.nickname || employee?.full_name || employee?.email || 'Unknown',
        approverName: approver?.nickname || approver?.full_name || 'N/A',
        total_days: totalDays
      };
    });
  }, [leaveRequests, users]);

  // Filtrar solicitudes
  const filteredRequests = useMemo(() => {
    let filtered = enrichedRequests;

    // Filtrar por usuario si no es admin
    if (!isAdmin) {
      filtered = filtered.filter(req => req.employee_id === currentUser?.id);
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.employeeName.toLowerCase().includes(query) ||
        req.reason?.toLowerCase().includes(query) ||
        req.request_type?.toLowerCase().includes(query)
      );
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(req => req.request_type === filterType);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'created_date':
          aVal = a.created_date ? new Date(a.created_date).getTime() : 0;
          bVal = b.created_date ? new Date(b.created_date).getTime() : 0;
          break;
        case 'start_date':
          aVal = a.start_date ? new Date(a.start_date).getTime() : 0;
          bVal = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        case 'employee_name':
          aVal = a.employeeName.toLowerCase();
          bVal = b.employeeName.toLowerCase();
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [enrichedRequests, searchQuery, filterStatus, filterType, sortBy, sortOrder, isAdmin, currentUser]);

  // Stats
  const stats = useMemo(() => {
    const userRequests = isAdmin ? filteredRequests : filteredRequests.filter(r => r.employee_id === currentUser?.id);
    
    return {
      total: userRequests.length,
      pending: userRequests.filter(r => r.status === 'pending').length,
      approved: userRequests.filter(r => r.status === 'approved').length,
      rejected: userRequests.filter(r => r.status === 'rejected').length,
      totalDays: userRequests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.total_days || 0), 0)
    };
  }, [filteredRequests, isAdmin, currentUser]);

  const handleCreateRequest = (employeeId = null) => {
    setSelectedEmployeeId(employeeId);
    setSelectedRequest(null);
    setShowRequestDialog(true);
  };

  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setSelectedEmployeeId(null);
    setShowRequestDialog(true);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleSelectRequest = (requestId, checked) => {
    setSelectedRequests(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(requestId);
      } else {
        newSet.delete(requestId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRequests(new Set(filteredRequests.map(r => r.id)));
    } else {
      setSelectedRequests(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRequests.size === 0) return;
    
    if (!confirm(`Delete ${selectedRequests.size} request(s)? This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedRequests).map(id => LeaveRequest.delete(id)));
      toast.success(`${selectedRequests.size} request(s) deleted`);
      setSelectedRequests(new Set());
      loadLeaveRequests();
      onRefresh();
    } catch (error) {
      console.error('Failed to delete requests:', error);
      toast.error('Failed to delete some requests');
    } finally {
      setIsDeleting(false);
    }
  };

  const allSelected = filteredRequests.length > 0 && selectedRequests.size === filteredRequests.length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      sick_leave: 'Sick Leave',
      unjustified_leave: 'Unjustified Leave',
      holiday: 'Vacation',
      day_off: 'Day Off',
      personal_leave: 'Personal Leave',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const SortButton = ({ column, children }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-indigo-600 transition-colors font-semibold"
    >
      {children}
      {sortBy === column && (
        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-600">Total Requests</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.pending}</div>
                <div className="text-xs text-slate-600">Pending</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.approved}</div>
                <div className="text-xs text-slate-600">Approved</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.rejected}</div>
                <div className="text-xs text-slate-600">Rejected</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.totalDays}</div>
                <div className="text-xs text-slate-600">Days Approved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="sick_leave">Sick Leave</option>
              <option value="holiday">Vacation</option>
              <option value="day_off">Day Off</option>
              <option value="personal_leave">Personal Leave</option>
              <option value="unjustified_leave">Unjustified</option>
              <option value="other">Other</option>
            </select>

            <Button onClick={() => handleCreateRequest(isAdmin ? null : currentUser?.id)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {isAdmin && (
                    <th className="p-4 w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        className="h-4 w-4"
                      />
                    </th>
                  )}
                  {isAdmin && (
                    <th className="text-left p-4 text-sm text-slate-700">
                      <SortButton column="employee_name">Employee</SortButton>
                    </th>
                  )}
                  <th className="text-left p-4 text-sm text-slate-700">Type</th>
                  <th className="text-left p-4 text-sm text-slate-700">
                    <SortButton column="start_date">Period</SortButton>
                  </th>
                  <th className="text-left p-4 text-sm text-slate-700">Days</th>
                  <th className="text-left p-4 text-sm text-slate-700">Reason</th>
                  <th className="text-left p-4 text-sm text-slate-700">
                    <SortButton column="status">Status</SortButton>
                  </th>
                  <th className="text-left p-4 text-sm text-slate-700">Approver</th>
                  <th className="text-right p-4 text-sm text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 7} className="text-center py-12 text-slate-500">
                      {searchQuery ? 'No requests found matching your search' : 'No leave requests yet'}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      onClick={() => handleViewDetails(request)}
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer",
                        selectedRequests.has(request.id) && "bg-indigo-50"
                      )}
                    >
                      {isAdmin && (
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRequests.has(request.id)}
                            onCheckedChange={(checked) => handleSelectRequest(request.id, checked)}
                            className="h-4 w-4"
                          />
                        </td>
                      )}
                      {isAdmin && (
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar user={request.employee} size="sm" />
                            <span className="text-sm font-medium">{request.employeeName}</span>
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <Badge className="text-xs">{getTypeLabel(request.request_type)}</Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-700">
                        {request.start_date && format(parseISO(request.start_date), 'MMM d, yyyy')} - 
                        {request.end_date && format(parseISO(request.end_date), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-900">
                        {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                      </td>
                      <td className="p-4 text-sm text-slate-600 max-w-xs truncate">
                        {request.reason || '-'}
                      </td>
                      <td className="p-4">
                        <Badge className={cn('text-xs', getStatusColor(request.status))}>
                          {request.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {request.approverName}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {request.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRequest(request);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(request);
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Multi-select Action Bar */}
          {isAdmin && selectedRequests.size > 0 && (
            <div className="sticky bottom-0 left-0 right-0 bg-slate-800 text-white px-4 py-3 flex items-center justify-between rounded-b-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{selectedRequests.size} request{selectedRequests.size > 1 ? 's' : ''} selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequests(new Set())}
                  className="text-white hover:bg-slate-700 h-8"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="bg-transparent border-red-500 text-red-400 hover:bg-red-500/20 h-8"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Request Dialog */}
      {showRequestDialog && (
        <LeaveRequestDialog
          isOpen={showRequestDialog}
          onClose={() => {
            setShowRequestDialog(false);
            setSelectedRequest(null);
            setSelectedEmployeeId(null);
          }}
          request={selectedRequest}
          employeeId={selectedEmployeeId}
          users={users}
          currentUser={currentUser}
          onSuccess={() => {
            loadLeaveRequests();
            onRefresh();
            setShowRequestDialog(false);
            setSelectedRequest(null);
            setSelectedEmployeeId(null);
          }}
        />
      )}

      {/* Details Dialog */}
      {showDetailsDialog && selectedRequest && (
        <LeaveRequestDetailsDialog
          isOpen={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          users={users}
          currentUser={currentUser}
          onSuccess={() => {
            loadLeaveRequests();
            onRefresh();
            setShowDetailsDialog(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </>
  );
}