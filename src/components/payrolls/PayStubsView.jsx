import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';

export default function PayStubsView({ 
  payStubs = [], 
  users = [], 
  payrollRuns = [],
  onRefresh 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');

  const enrichedStubs = useMemo(() => {
    return payStubs.map(stub => {
      const user = users.find(u => u.id === stub.employee_id);
      const run = payrollRuns.find(r => r.id === stub.payroll_run_id);
      return {
        ...stub,
        user,
        run,
        displayName: user?.nickname || user?.full_name || user?.email || 'Unknown'
      };
    });
  }, [payStubs, users, payrollRuns]);

  const filteredAndSortedStubs = useMemo(() => {
    let filtered = enrichedStubs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = enrichedStubs.filter(stub => {
        const name = stub.displayName.toLowerCase();
        const status = stub.status?.toLowerCase() || '';
        return name.includes(query) || status.includes(query);
      });
    }

    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'created_date':
          aVal = a.created_date ? new Date(a.created_date).getTime() : 0;
          bVal = b.created_date ? new Date(b.created_date).getTime() : 0;
          break;
        case 'employee_name':
          aVal = a.displayName.toLowerCase();
          bVal = b.displayName.toLowerCase();
          break;
        case 'net_pay':
          aVal = a.net_pay || 0;
          bVal = b.net_pay || 0;
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
  }, [enrichedStubs, searchQuery, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search pay stubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 text-sm text-slate-700">
                  <SortButton column="employee_name">Employee</SortButton>
                </th>
                <th className="text-left p-4 text-sm text-slate-700">Payroll Run</th>
                <th className="text-left p-4 text-sm text-slate-700">Gross Pay</th>
                <th className="text-left p-4 text-sm text-slate-700">Deductions</th>
                <th className="text-left p-4 text-sm text-slate-700">
                  <SortButton column="net_pay">Net Pay</SortButton>
                </th>
                <th className="text-left p-4 text-sm text-slate-700">
                  <SortButton column="status">Status</SortButton>
                </th>
                <th className="text-right p-4 text-sm text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedStubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    {searchQuery ? 'No pay stubs found matching your search' : 'No pay stubs yet'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedStubs.map((stub) => (
                  <tr
                    key={stub.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={stub.user} size="sm" />
                        <div>
                          <div className="font-medium text-sm">{stub.displayName}</div>
                          <div className="text-xs text-slate-500">{stub.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {stub.run?.period_start_date && stub.run?.period_end_date ? (
                        <>
                          {format(parseISO(stub.run.period_start_date), 'MMM d')} - 
                          {format(parseISO(stub.run.period_end_date), 'MMM d, yyyy')}
                        </>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-900">
                      ${(stub.gross_pay || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-red-600">
                      -${(stub.deductions || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-semibold text-green-600">
                      ${(stub.net_pay || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Badge className={cn('text-xs', getStatusColor(stub.status))}>
                        {stub.status || 'Pending'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}