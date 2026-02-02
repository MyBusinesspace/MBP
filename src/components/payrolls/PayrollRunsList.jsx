import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  DollarSign,
  Users,
  Edit,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  FileDown,
  Loader2,
  Copy
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PayrollRunsList({ runs = [], users = [], onEditRun, onDeleteRun, onRefresh, onViewDetails, onDuplicateRun }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('period_start_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportingRunId, setExportingRunId] = useState(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicatingRunId, setDuplicatingRunId] = useState(null);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const filteredAndSortedRuns = useMemo(() => {
    let filtered = runs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = runs.filter(run => {
        const periodStart = run.period_start_date ? format(parseISO(run.period_start_date), 'MMM d, yyyy') : '';
        const periodEnd = run.period_end_date ? format(parseISO(run.period_end_date), 'MMM d, yyyy') : '';
        const status = run.status?.toLowerCase() || '';
        const payrunNumber = run.payrun_number?.toLowerCase() || '';
        
        return periodStart.toLowerCase().includes(query) ||
               periodEnd.toLowerCase().includes(query) ||
               status.includes(query) ||
               payrunNumber.includes(query);
      });
    }

    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'period_start_date':
          aVal = a.period_start_date ? new Date(a.period_start_date).getTime() : 0;
          bVal = b.period_start_date ? new Date(b.period_start_date).getTime() : 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'total_payroll_cost':
          aVal = a.total_payroll_cost || 0;
          bVal = b.total_payroll_cost || 0;
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
  }, [runs, searchQuery, sortBy, sortOrder]);

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
      case 'Draft':
        return 'bg-slate-100 text-slate-700';
      case 'Processing':
        return 'bg-blue-100 text-blue-700';
      case 'Needs Attention':
        return 'bg-orange-100 text-orange-700';
      case 'Paid':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const SortButton = ({ column, children }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-indigo-600 transition-colors font-semibold text-[11px]"
    >
      {children}
      {sortBy === column && (
        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  );

  const handleExportPDF = async (run) => {
    setIsExportingPDF(true);
    setExportingRunId(run.id);
    try {
      const response = await base44.functions.invoke('exportPayrollRunPDF', {
        payroll_run_id: run.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-run-${run.payrun_number || run.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Payroll run exported to PDF');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExportingPDF(false);
      setExportingRunId(null);
    }
  };

  const handleExportExcel = async (run) => {
    setIsExportingExcel(true);
    setExportingRunId(run.id);
    try {
      const response = await base44.functions.invoke('exportPayrollRunExcel', {
        payroll_run_id: run.id
      });

      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-run-${run.payrun_number || run.id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Payroll run exported to Excel');
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setIsExportingExcel(false);
      setExportingRunId(null);
    }
  };

  const handleDuplicate = async (run) => {
    setIsDuplicating(true);
    setDuplicatingRunId(run.id);
    try {
      if (onDuplicateRun) {
        await onDuplicateRun(run);
      }
      toast.success('Payroll run duplicated successfully');
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error('Failed to duplicate payroll run');
    } finally {
      setIsDuplicating(false);
      setDuplicatingRunId(null);
    }
  };

  const handleTitleEdit = (run, e) => {
    e.stopPropagation();
    setEditingTitleId(run.id);
    setEditingTitleValue(run.title || '');
  };

  const handleTitleSave = async (runId, e) => {
    e.stopPropagation();
    console.log('🔧 [PayrollRunsList] Saving title...', { runId, title: editingTitleValue });
    try {
      const { PayrollRun } = await import('@/entities/all');
      console.log('🔧 [PayrollRunsList] Calling PayrollRun.update...');
      await PayrollRun.update(runId, { title: editingTitleValue });
      console.log('🔧 [PayrollRunsList] Update successful');
      toast.success('Title updated');
      setEditingTitleId(null);
      setEditingTitleValue('');
      console.log('🔧 [PayrollRunsList] Calling onRefresh...');
      if (onRefresh) await onRefresh();
      console.log('🔧 [PayrollRunsList] onRefresh complete');
    } catch (error) {
      console.error('❌ [PayrollRunsList] Failed to update title:', error);
      toast.error('Failed to update title');
    }
  };

  const handleTitleCancel = (e) => {
    e.stopPropagation();
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search payroll runs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 text-[11px] font-normal text-slate-600">
                  <SortButton column="period_start_date">Pay Period</SortButton>
                </th>
                <th className="text-left px-3 py-2 text-[11px] font-normal text-slate-600">
                  Payrun N
                </th>
                <th className="text-left px-3 py-2 text-[11px] font-normal text-slate-600">Title</th>
                <th className="text-left px-3 py-2 text-[11px] font-normal text-slate-600">Pay Date</th>
                <th className="text-center px-3 py-2 text-[11px] font-normal text-slate-600">
                  <SortButton column="employee_count">Employees</SortButton>
                </th>
                <th className="text-right px-3 py-2 text-[11px] font-normal text-slate-600">Employee Payments</th>
                <th className="text-right px-3 py-2 text-[11px] font-normal text-slate-600">Other Payments</th>
                <th className="text-right px-3 py-2 text-[11px] font-normal text-slate-600">
                  <SortButton column="total_payroll_cost">Total Cost</SortButton>
                </th>
                <th className="text-right px-3 py-2 text-[11px] font-normal text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500 text-sm">
                    {searchQuery ? 'No payroll runs found matching your search' : 'No payroll runs yet'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onViewDetails && onViewDetails(run)}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <div className="text-[11px] font-normal text-slate-700">
                          {run.period_start_date && format(parseISO(run.period_start_date), 'MMM d')} - 
                          {run.period_end_date && format(parseISO(run.period_end_date), 'MMM d, yy')}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-[11px] font-normal text-indigo-600">
                        {run.payrun_number || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {editingTitleId === run.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingTitleValue}
                            onChange={(e) => {
                              console.log('🔧 [Input] onChange:', e.target.value);
                              setEditingTitleValue(e.target.value);
                            }}
                            className="h-6 text-[11px] w-32"
                            autoFocus
                            onKeyDown={(e) => {
                              console.log('🔧 [Input] onKeyDown:', e.key);
                              if (e.key === 'Enter') {
                                console.log('🔧 [Input] Enter pressed, calling handleTitleSave');
                                handleTitleSave(run.id, e);
                              }
                              if (e.key === 'Escape') {
                                console.log('🔧 [Input] Escape pressed, calling handleTitleCancel');
                                handleTitleCancel(e);
                              }
                            }}
                            onBlur={(e) => {
                              console.log('🔧 [Input] onBlur triggered');
                              handleTitleSave(run.id, e);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              console.log('🔧 [Button] Save button clicked');
                              handleTitleSave(run.id, e);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3 text-green-600" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="text-[11px] font-normal text-slate-700 cursor-pointer hover:text-indigo-600 flex items-center gap-1"
                          onClick={(e) => {
                            console.log('🔧 [Title] Edit clicked for run:', run.id);
                            handleTitleEdit(run, e);
                          }}
                        >
                          {run.title || <span className="text-slate-400">Add title...</span>}
                          <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] font-normal text-slate-600">
                      {run.pay_date ? format(parseISO(run.pay_date), 'MMM d, yy') : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] font-normal text-slate-700">{run.employee_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[11px] font-normal text-slate-700">
                        ${(run.employee_payments || run.total_payroll_cost || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[11px] font-normal text-slate-600">
                        ${(run.other_payments || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="text-[11px] font-normal text-green-600">
                          ${(run.total_payroll_cost || 0).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(run);
                          }}
                          disabled={isDuplicating && duplicatingRunId === run.id}
                          title="Duplicate Payroll Run"
                          className="h-7 w-7 p-0"
                        >
                          {isDuplicating && duplicatingRunId === run.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportPDF(run);
                          }}
                          disabled={isExportingPDF && exportingRunId === run.id}
                          title="Export to PDF"
                          className="h-7 w-7 p-0"
                        >
                          {isExportingPDF && exportingRunId === run.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRun(run);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRun(run.id);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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