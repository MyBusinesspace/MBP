import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import Avatar from '../Avatar';
import PaySlipDetailsDialog from './PaySlipDetailsDialog';
import { useData } from '@/components/DataProvider';

export default function PaySlipsView({ 
  payStubs = [], 
  users = [], 
  payrollRuns = [],
  onRefresh 
}) {
  const { currentUser } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('employee_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [downloadingSlipId, setDownloadingSlipId] = useState(null);
  const [expandedEmployees, setExpandedEmployees] = useState({});

  const isAdmin = currentUser?.role === 'admin';

  const enrichedSlips = useMemo(() => {
    return payStubs.map(slip => {
      const user = users.find(u => u.id === slip.employee_id);
      const run = payrollRuns.find(r => r.id === slip.payroll_run_id);
      return {
        ...slip,
        user,
        run,
        displayName: user?.nickname || user?.full_name || user?.email || 'Unknown'
      };
    });
  }, [payStubs, users, payrollRuns]);

  // Group slips by employee
  const groupedByEmployee = useMemo(() => {
    let filtered = enrichedSlips;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = enrichedSlips.filter(slip => {
        const name = slip.displayName.toLowerCase();
        const status = slip.status?.toLowerCase() || '';
        return name.includes(query) || status.includes(query);
      });
    }

    // Group by employee_id
    const grouped = {};
    filtered.forEach(slip => {
      const empId = slip.employee_id;
      if (!grouped[empId]) {
        grouped[empId] = {
          employee_id: empId,
          user: slip.user,
          displayName: slip.displayName,
          slips: []
        };
      }
      grouped[empId].slips.push(slip);
    });

    // Sort slips within each employee by date (newest first)
    Object.values(grouped).forEach(group => {
      group.slips.sort((a, b) => {
        const dateA = a.run?.period_end_date ? new Date(a.run.period_end_date).getTime() : 0;
        const dateB = b.run?.period_end_date ? new Date(b.run.period_end_date).getTime() : 0;
        return dateB - dateA;
      });
      // Calculate totals
      group.totalGross = group.slips.reduce((sum, s) => sum + (s.gross_pay || 0), 0);
      group.totalNet = group.slips.reduce((sum, s) => sum + (s.net_pay || 0), 0);
      group.totalDeductions = group.slips.reduce((sum, s) => sum + (s.deductions || 0), 0);
      group.slipCount = group.slips.length;
      group.latestSlip = group.slips[0];
    });

    // Convert to array and sort by employee name
    let groupArray = Object.values(grouped);
    groupArray.sort((a, b) => {
      if (sortBy === 'employee_name') {
        return sortOrder === 'asc' 
          ? a.displayName.localeCompare(b.displayName)
          : b.displayName.localeCompare(a.displayName);
      }
      if (sortBy === 'net_pay') {
        return sortOrder === 'asc' 
          ? a.totalNet - b.totalNet
          : b.totalNet - a.totalNet;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return groupArray;
  }, [enrichedSlips, searchQuery, sortBy, sortOrder]);

  const toggleEmployee = (employeeId) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleRowClick = (slip) => {
    setSelectedSlip(slip);
    setIsDialogOpen(true);
  };

  const handleDownloadPDF = async (e, slip) => {
    e.stopPropagation();
    setDownloadingSlipId(slip.id);
    try {
      const response = await base44.functions.invoke('exportPaySlipPDF', {
        pay_slip_id: slip.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pay-slip-${slip.displayName.replace(/\s+/g, '-')}-${slip.created_date}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Pay slip downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download pay slip');
    } finally {
      setDownloadingSlipId(null);
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
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search pay slips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table grouped by employee */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 text-sm text-slate-700 w-8"></th>
                  <th className="text-left p-4 text-sm text-slate-700">
                    <SortButton column="employee_name">Employee</SortButton>
                  </th>
                  <th className="text-left p-4 text-sm text-slate-700">Pay Slips</th>
                  <th className="text-left p-4 text-sm text-slate-700">Total Gross</th>
                  <th className="text-left p-4 text-sm text-slate-700">Total Deductions</th>
                  <th className="text-left p-4 text-sm text-slate-700">
                    <SortButton column="net_pay">Total Net</SortButton>
                  </th>
                  <th className="text-left p-4 text-sm text-slate-700">Latest Period</th>
                </tr>
              </thead>
              <tbody>
                {groupedByEmployee.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      {searchQuery ? 'No pay slips found matching your search' : 'No pay slips yet'}
                    </td>
                  </tr>
                ) : (
                  groupedByEmployee.map((group) => (
                    <React.Fragment key={group.employee_id}>
                      {/* Employee Row */}
                      <tr
                        onClick={() => toggleEmployee(group.employee_id)}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <button className="p-1 hover:bg-slate-200 rounded">
                            {expandedEmployees[group.employee_id] ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar user={group.user} size="sm" />
                            <div>
                              <div className="font-medium text-sm">{group.displayName}</div>
                              <div className="text-xs text-slate-500">{group.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-xs">
                            {group.slipCount} {group.slipCount === 1 ? 'slip' : 'slips'}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-900">
                          ${group.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-sm text-red-600">
                          -${group.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-sm font-semibold text-green-600">
                          ${group.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {group.latestSlip?.run?.period_start_date && group.latestSlip?.run?.period_end_date ? (
                            <>
                              {format(parseISO(group.latestSlip.run.period_start_date), 'MMM d')} - 
                              {format(parseISO(group.latestSlip.run.period_end_date), 'MMM d, yyyy')}
                            </>
                          ) : '-'}
                        </td>
                      </tr>

                      {/* Expanded Pay Slips */}
                      {expandedEmployees[group.employee_id] && group.slips.map((slip) => (
                        <tr
                          key={slip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(slip);
                          }}
                          className="bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <td className="p-3"></td>
                          <td className="p-3 pl-12">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span>
                                {slip.run?.period_start_date && slip.run?.period_end_date ? (
                                  <>
                                    {format(parseISO(slip.run.period_start_date), 'MMM d')} - 
                                    {format(parseISO(slip.run.period_end_date), 'MMM d, yyyy')}
                                  </>
                                ) : 'Unknown period'}
                              </span>
                              {slip.run?.payrun_number && (
                                <Badge variant="outline" className="text-[10px] ml-1">
                                  {slip.run.payrun_number}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={cn('text-xs', getStatusColor(slip.status))}>
                              {slip.status || 'Pending'}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-slate-700">
                            ${(slip.gross_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-sm text-red-600">
                            -${(slip.deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-sm font-medium text-green-600">
                            ${(slip.net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => handleDownloadPDF(e, slip)}
                              disabled={downloadingSlipId === slip.id}
                              title="Download pay slip"
                            >
                              {downloadingSlipId === slip.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Dialog */}
      {selectedSlip && (
        <PaySlipDetailsDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedSlip(null);
          }}
          paySlip={selectedSlip}
          user={selectedSlip.user}
          payrollRun={selectedSlip.run}
          onRefresh={onRefresh}
          canEdit={isAdmin}
        />
      )}
    </>
  );
}