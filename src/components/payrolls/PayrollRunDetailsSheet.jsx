import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Download,
  Send,
  MoreVertical,
  FileText,
  X,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import PaySlipDetailsDialog from './PaySlipDetailsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import PayrollSummaryReportDialog from './PayrollSummaryReportDialog';

export default function PayrollRunDetailsSheet({
  isOpen,
  onClose,
  payrollRun,
  payStubs = [],
  users = [],
  onRefresh
}) {
  console.log('🐛 [PayrollRunDetails] Render - useMemo available?', typeof useMemo);
  const [payslipNotes, setPayslipNotes] = useState('');
  const [showTaxNumber, setShowTaxNumber] = useState(false);
  const [selectedPaySlip, setSelectedPaySlip] = useState(null);
  const [isPaySlipDialogOpen, setIsPaySlipDialogOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState(false);
  const [sortColumn, setSortColumn] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Calcular totales de employee payments
  const employeePaymentsSummary = useMemo(() => {
    if (!payrollRun) {
      return {
        totalGrossWages: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        totalTaxes: 0,
        totalNonTaxableAllowances: 0,
        totalPostTaxDeductions: 0,
        totalNetPay: 0
      };
    }

    let totalGrossWages = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;
    let totalTaxes = 0;
    let totalNonTaxableAllowances = 0;
    let totalPostTaxDeductions = 0;
    let totalNetPay = 0;

    payStubs.forEach(stub => {
      totalGrossWages += stub.gross_pay || 0;
      totalDeductions += stub.deductions || 0;
      totalNetPay += stub.net_pay || 0;

      if (stub.data_snapshot?.deductions_breakdown) {
        const breakdown = stub.data_snapshot.deductions_breakdown;
        totalTaxes += (breakdown.federal_tax || 0) + (breakdown.state_tax || 0) +
                     (breakdown.social_security || 0) + (breakdown.medicare || 0);
      }
    });

    return {
      totalGrossWages,
      totalAllowances,
      totalDeductions,
      totalTaxes,
      totalNonTaxableAllowances,
      totalPostTaxDeductions,
      totalNetPay
    };
  }, [payrollRun, payStubs]);

  const enrichedPayStubs = useMemo(() => {
    if (!payrollRun) return [];

    // Use PayStubs if available, otherwise fallback to employee_payments_snapshot
    const dataSource = payStubs.length > 0 
      ? payStubs 
      : (payrollRun.employee_payments_snapshot || []).map((snap, idx) => ({
          id: `snapshot-${idx}`,
          employee_id: snap.employee_id,
          gross_pay: snap.gross_pay,
          deductions: snap.deductions?.total || 0,
          net_pay: snap.net_pay,
          status: payrollRun.status === 'Paid' ? 'Paid' : 'Pending',
          data_snapshot: {
            basic_salary: snap.regular_pay || snap.profile?.monthly_basic_salary || 0,
            overtime_pay: snap.overtime_pay || 0,
            hours_data: snap.hours_data,
            additional_earnings: [],
            additional_deductions: []
          }
        }));

    return dataSource.map(stub => {
      const user = users.find(u => u.id === stub.employee_id);
      return {
        ...stub,
        user,
        displayName: user?.nickname || user?.full_name || user?.email || 'Unknown'
      };
    });
  }, [payrollRun, payStubs, users]);

  const sortedPayStubs = useMemo(() => {
    if (!enrichedPayStubs.length) return [];
    
    const stubs = [...enrichedPayStubs];
    
    return stubs.sort((a, b) => {
      let aVal, bVal;
      const aSnapshot = a.data_snapshot || {};
      const bSnapshot = b.data_snapshot || {};
      
      switch (sortColumn) {
        case 'name':
          aVal = (a.displayName || '').toLowerCase();
          bVal = (b.displayName || '').toLowerCase();
          break;
        case 'basic':
          aVal = aSnapshot.basic_salary || aSnapshot.regular_pay || 0;
          bVal = bSnapshot.basic_salary || bSnapshot.regular_pay || 0;
          break;
        case 'ot':
          aVal = aSnapshot.overtime_pay || 0;
          bVal = bSnapshot.overtime_pay || 0;
          break;
        case 'extras':
          // Calculate extras the same way as in the render
          const aAdditionalEarnings = (aSnapshot.additional_earnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);
          const bAdditionalEarnings = (bSnapshot.additional_earnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);
          const aBasicSalary = aSnapshot.basic_salary || aSnapshot.regular_pay || 0;
          const bBasicSalary = bSnapshot.basic_salary || bSnapshot.regular_pay || 0;
          const aOvertimePay = aSnapshot.overtime_pay || 0;
          const bOvertimePay = bSnapshot.overtime_pay || 0;
          
          aVal = aSnapshot.extras_pay !== undefined 
            ? aSnapshot.extras_pay 
            : (aAdditionalEarnings > 0 ? aAdditionalEarnings : (a.gross_pay || 0) - aBasicSalary - aOvertimePay);
          bVal = bSnapshot.extras_pay !== undefined 
            ? bSnapshot.extras_pay 
            : (bAdditionalEarnings > 0 ? bAdditionalEarnings : (b.gross_pay || 0) - bBasicSalary - bOvertimePay);
          break;
        case 'gross':
          aVal = a.gross_pay || 0;
          bVal = b.gross_pay || 0;
          break;
        case 'deductions':
          aVal = a.deductions || 0;
          bVal = b.deductions || 0;
          break;
        case 'net':
          aVal = a.net_pay || 0;
          bVal = b.net_pay || 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [enrichedPayStubs, sortColumn, sortOrder]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const SortButton = ({ column, children, align = 'left' }) => (
    <button
      onClick={() => handleSort(column)}
      className={cn(
        "flex items-center gap-1 hover:text-slate-900 transition-colors",
        align === 'right' && 'justify-end w-full'
      )}
    >
      {children}
      {sortColumn === column && (
        <span className="text-blue-600 text-xs">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  const handleDownloadPDF = async () => {
    if (!payrollRun) return;
    
    setIsExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportPayrollRunPDF', {
        payroll_run_id: payrollRun.id
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-run-${payrollRun.payrun_number || payrollRun.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!payrollRun) return;
    
    setIsExportingExcel(true);
    try {
      const response = await base44.functions.invoke('exportPayrollRunExcel', {
        payroll_run_id: payrollRun.id
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-run-${payrollRun.payrun_number || payrollRun.id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Failed to download Excel:', error);
      toast.error('Failed to download Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // NOW we can safely check after all hooks are called
  if (!payrollRun) {
    return null;
  }

  const isPaid = payrollRun.status === 'Paid';

  const onViewPaySlipDetails = (stub) => {
    setSelectedPaySlip(stub);
    setIsPaySlipDialogOpen(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-blue-600 font-medium">Pay Run »</div>
                  <h2 className="text-xl text-slate-700">
                    Pay Run ({payrollRun.period_start_date && format(parseISO(payrollRun.period_start_date), 'd MMM yyyy')} -
                    {payrollRun.period_end_date && format(parseISO(payrollRun.period_end_date), 'd MMM yyyy')})
                  </h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Badge className={cn(
                  'text-sm px-3 py-1',
                  isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                )}>
                  {isPaid ? 'Paid' : 'Not Paid'}
                </Badge>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Send className="w-4 h-4" />
                    Send Payslips
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Pay Run Options
                        <MoreVertical className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDownloadPDF} disabled={isExportingPDF}>
                        {isExportingPDF ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadExcel} disabled={isExportingExcel}>
                        {isExportingExcel ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Download Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowSummaryReport(true)}>
                        <FileText className="w-4 h-4 mr-2" />
                        View Summary Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Summary Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium text-slate-900">Summary</h3>
                <Button variant="link" size="sm" className="text-blue-600" onClick={() => setShowSummaryReport(true)}>
                  View Pay Run Summary Report
                </Button>
              </div>

              <div className="flex items-center gap-8 text-sm">
                <div>
                  <span className="text-slate-500">Period: </span>
                  <span className="font-medium">
                    {payrollRun.period_start_date && format(parseISO(payrollRun.period_start_date), 'd MMM')} - 
                    {payrollRun.period_end_date && format(parseISO(payrollRun.period_end_date), 'd MMM yyyy')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Pay Date: </span>
                  <span className="font-medium">
                    {payrollRun.pay_date && format(parseISO(payrollRun.pay_date), 'd MMM yyyy')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Employees: </span>
                  <span className="font-medium">{enrichedPayStubs.length}</span>
                </div>
                <div>
                  <span className="text-slate-500">Total: </span>
                  <span className="font-semibold text-green-700">
                    ${employeePaymentsSummary.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Employee Payments Table */}
            <div>
              <h3 className="text-base font-medium text-slate-900 mb-4">Employee payments</h3>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-slate-700">
                          <SortButton column="name">Name</SortButton>
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-slate-700">
                          <SortButton column="basic" align="right">Basic</SortButton>
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-slate-700">
                          <SortButton column="ot" align="right">OT Pay</SortButton>
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-slate-700">
                          <SortButton column="extras" align="right">Extras</SortButton>
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-slate-700">
                          <SortButton column="gross" align="right">Gross</SortButton>
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-slate-700">
                          <SortButton column="deductions" align="right">Deductions</SortButton>
                        </th>
                        <th className="text-center px-3 py-2 font-medium text-slate-700">Status</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-700">
                          <SortButton column="net" align="right">Net Pay</SortButton>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPayStubs.map((stub) => {
                        const snapshot = stub.data_snapshot || {};
                        const earningsBreakdown = snapshot.earnings_breakdown || [];

                        // Get Basic Salary from earnings_breakdown (first item with "Basic Salary" or subcategory "Base Pay")
                        const basicItem = earningsBreakdown.find(item => 
                          item.pay_item_name === 'Basic Salary' || 
                          item.selected_subcategory === 'Base Pay' ||
                          item.subcategory === 'Base Pay'
                        );
                        const basicSalary = basicItem?.amount || snapshot.basic_salary || snapshot.regular_pay || 0;

                        // Get Overtime from earnings_breakdown (items with "Overtime" in name or subcategory)
                        const overtimeItems = earningsBreakdown.filter(item => 
                          item.pay_item_name?.toLowerCase().includes('overtime') ||
                          item.selected_subcategory === 'Overtime' ||
                          item.subcategory === 'Overtime'
                        );
                        const overtimePay = overtimeItems.reduce((sum, item) => sum + (item.amount || 0), 0);

                        // Calculate extras: everything else in earnings_breakdown
                        const extrasItems = earningsBreakdown.filter(item => {
                          const isBasic = item.pay_item_name === 'Basic Salary' || 
                                         item.selected_subcategory === 'Base Pay' ||
                                         item.subcategory === 'Base Pay';
                          const isOT = item.pay_item_name?.toLowerCase().includes('overtime') ||
                                      item.selected_subcategory === 'Overtime' ||
                                      item.subcategory === 'Overtime';
                          return !isBasic && !isOT;
                        });
                        const extrasPay = extrasItems.reduce((sum, item) => sum + (item.amount || 0), 0);

                        console.log('📊 Displaying stub for', stub.displayName, {
                          snapshot,
                          overtimePay,
                          hours_data: snapshot.hours_data
                        });

                        return (
                          <tr key={stub.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => onViewPaySlipDetails(stub)}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Avatar user={stub.user} size="xs" />
                                <span className="text-slate-900">{stub.displayName}</span>
                              </div>
                            </td>
                            <td className="text-right px-3 py-2 text-slate-900">
                              ${basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-right px-3 py-2 text-orange-600">
                              {overtimePay > 0 ? `$${overtimePay.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="text-right px-3 py-2 text-purple-600">
                              {extrasPay > 0 ? `$${extrasPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="text-right px-3 py-2 font-medium text-slate-900">
                              ${(stub.gross_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-right px-3 py-2 text-red-600">
                              -${(stub.deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-center px-3 py-2">
                              <Badge className={cn(
                                'text-xs',
                                stub.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                              )}>
                                {stub.status}
                              </Badge>
                            </td>
                            <td className="text-right px-3 py-2 font-semibold text-blue-600">
                              ${(stub.net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}

                      {/* TOTAL Row */}
                      <tr className="bg-slate-50 font-medium">
                        <td className="px-3 py-2 text-slate-900">TOTAL ({sortedPayStubs.length})</td>
                        <td className="text-right px-3 py-2 text-slate-900">-</td>
                        <td className="text-right px-3 py-2 text-slate-900">-</td>
                        <td className="text-right px-3 py-2 text-slate-900">-</td>
                        <td className="text-right px-3 py-2 text-slate-900">
                          ${employeePaymentsSummary.totalGrossWages.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right px-3 py-2 text-red-600">
                          -${employeePaymentsSummary.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-center px-3 py-2"></td>
                        <td className="text-right px-3 py-2 font-semibold text-slate-900">
                          ${employeePaymentsSummary.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>



            {/* Grand Total */}
            <div className="border-t-2 border-slate-900 pt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Employee Payments:</span>
                <span className="font-medium text-slate-900">
                  ${employeePaymentsSummary.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {payrollRun.other_payments > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Other Payments:</span>
                  <span className="font-medium text-purple-700">
                    ${(payrollRun.other_payments || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-base font-medium text-slate-900">TOTAL PAYROLL COST</span>
                <span className="text-xl font-semibold text-slate-900">
                  ${(payrollRun.total_payroll_cost || employeePaymentsSummary.totalNetPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <Separator />

            {/* Other Payments Section */}
            {payrollRun.other_payments_details && payrollRun.other_payments_details.length > 0 && (
              <div>
                <h3 className="text-base font-medium text-slate-900 mb-4">Other Payments</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-slate-700">Recipient</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-700">Reason/Concept</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRun.other_payments_details.map((payment, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-900">{payment.recipient}</td>
                          <td className="px-3 py-2 text-slate-600">{payment.reason}</td>
                          <td className="text-right px-3 py-2 font-medium text-purple-700">
                            ${payment.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-medium">
                        <td colSpan="2" className="px-3 py-2 text-slate-900">TOTAL</td>
                        <td className="text-right px-3 py-2 text-slate-900">
                          ${(payrollRun.other_payments || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Separator />

            {/* Payslip Notes */}
            <div>
              <h3 className="text-base font-medium text-slate-900 mb-3">Payslip notes</h3>
              <Textarea
                value={payslipNotes}
                onChange={(e) => setPayslipNotes(e.target.value)}
                placeholder="Add notes that will appear on all payslips..."
                className="min-h-[100px] text-sm"
              />

              <div className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  id="showTaxNumber"
                  checked={showTaxNumber}
                  onChange={(e) => setShowTaxNumber(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <label htmlFor="showTaxNumber" className="text-sm text-slate-700 cursor-pointer">
                  Show employee's tax number on payslips
                </label>
              </div>
            </div>

            {/* History & Notes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-medium text-slate-900">History & Notes</h3>
                <button className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                  ?
                </button>
              </div>

              {payrollRun.status === 'Paid' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-yellow-700 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-yellow-900">
                        Approved by {payrollRun.created_by} on {format(parseISO(payrollRun.created_date), 'd MMM yyyy \'at\' h:mma')}
                      </div>
                      <div className="text-sm text-yellow-800 mt-1">
                        Pay Run ({payrollRun.period_start_date && format(parseISO(payrollRun.period_start_date), 'd MMM yyyy')} -
                        {payrollRun.period_end_date && format(parseISO(payrollRun.period_end_date), 'd MMM yyyy')}) approved.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="link" size="sm" className="text-blue-600">
                  Show History (7 entries)
                </Button>
                <Button variant="outline" size="sm">
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pay Slip Details Dialog */}
      {selectedPaySlip && (
        <PaySlipDetailsDialog
          isOpen={isPaySlipDialogOpen}
          onClose={() => {
            setIsPaySlipDialogOpen(false);
            setSelectedPaySlip(null);
          }}
          paySlip={selectedPaySlip}
          user={selectedPaySlip.user}
          payrollRun={payrollRun}
          onRefresh={onRefresh}
          canEdit={!isPaid}
        />
      )}

      {/* Summary Report Dialog */}
      {showSummaryReport && payrollRun && (
        <PayrollSummaryReportDialog
          isOpen={showSummaryReport}
          onClose={() => setShowSummaryReport(false)}
          payrollRun={payrollRun}
          payStubs={payStubs}
          users={users}
        />
      )}
    </>
  );
}