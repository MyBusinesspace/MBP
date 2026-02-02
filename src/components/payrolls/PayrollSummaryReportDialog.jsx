import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { X, Download, Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import Avatar from '../Avatar';

export default function PayrollSummaryReportDialog({ isOpen, onClose, payrollRun, payStubs, users }) {
  console.log('🐛 [PayrollSummaryReport] Render - React.useMemo available?', typeof React.useMemo);
  const [isExporting, setIsExporting] = React.useState(false);

  const summaryData = React.useMemo(() => {
    console.log('🐛 [PayrollSummaryReport] useMemo executing');
    if (!payrollRun || !payStubs) return null;

    const totalGross = payStubs.reduce((sum, stub) => sum + (stub.gross_pay || 0), 0);
    const totalDeductions = payStubs.reduce((sum, stub) => sum + (stub.deductions || 0), 0);
    const totalNet = payStubs.reduce((sum, stub) => sum + (stub.net_pay || 0), 0);

    // Breakdown by status
    const paidCount = payStubs.filter(s => s.status === 'Paid').length;
    const pendingCount = payStubs.filter(s => s.status === 'Pending').length;

    // Top earners
    const topEarners = [...payStubs]
      .sort((a, b) => (b.net_pay || 0) - (a.net_pay || 0))
      .slice(0, 5)
      .map(stub => {
        const user = users.find(u => u.id === stub.employee_id);
        return {
          ...stub,
          user,
          displayName: user?.nickname || user?.full_name || user?.email || 'Unknown'
        };
      });

    return {
      totalGross,
      totalDeductions,
      totalNet,
      paidCount,
      pendingCount,
      topEarners
    };
  }, [payrollRun, payStubs, users]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!payrollRun) return;
    
    setIsExporting(true);
    try {
      const response = await base44.functions.invoke('exportPayrollRunPDF', {
        payroll_run_id: payrollRun.id
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-summary-${payrollRun.payrun_number || payrollRun.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (!summaryData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Payroll Summary Report
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isExporting}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pay Run Info */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-indigo-600 font-medium mb-1">Payrun Number</div>
                <div className="text-slate-900 font-semibold">{payrollRun.payrun_number || '-'}</div>
              </div>
              <div>
                <div className="text-indigo-600 font-medium mb-1">Pay Period</div>
                <div className="text-slate-900">
                  {payrollRun.period_start_date && format(parseISO(payrollRun.period_start_date), 'd MMM yyyy')} -
                  {payrollRun.period_end_date && format(parseISO(payrollRun.period_end_date), 'd MMM yyyy')}
                </div>
              </div>
              <div>
                <div className="text-indigo-600 font-medium mb-1">Pay Date</div>
                <div className="text-slate-900">
                  {payrollRun.pay_date && format(parseISO(payrollRun.pay_date), 'd MMM yyyy')}
                </div>
              </div>
              <div>
                <div className="text-indigo-600 font-medium mb-1">Status</div>
                <Badge className={payrollRun.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                  {payrollRun.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Total Employees</div>
              <div className="text-2xl font-bold text-slate-900">{payStubs.length}</div>
              <div className="text-xs text-slate-500 mt-1">
                {summaryData.paidCount} paid, {summaryData.pendingCount} pending
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Total Gross Pay</div>
              <div className="text-2xl font-bold text-green-600">
                {summaryData.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">Before deductions</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Total Deductions</div>
              <div className="text-2xl font-bold text-red-600">
                {summaryData.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">Taxes & benefits</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600 mb-1">Total Net Pay</div>
              <div className="text-2xl font-bold text-indigo-600">
                {summaryData.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">After deductions</div>
            </div>
          </div>

          {/* Top Earners */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Top 5 Earners</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-700">Employee</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-700">Gross Pay</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-700">Deductions</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-700">Net Pay</th>
                    <th className="text-center px-4 py-2 font-medium text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.topEarners.map((earner, index) => (
                    <tr key={earner.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">#{index + 1}</span>
                          <Avatar user={earner.user} size="xs" />
                          <span className="font-medium text-slate-900">{earner.displayName}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-2 text-slate-900">
                        {(earner.gross_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right px-4 py-2 text-red-600">
                        {(earner.deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right px-4 py-2 font-semibold text-green-600">
                        {(earner.net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-center px-4 py-2">
                        <Badge className={earner.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                          {earner.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Employees */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">All Employees</h3>
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-700">Employee</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-700">Gross Pay</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-700">Deductions</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-700">Net Pay</th>
                    <th className="text-center px-4 py-2 font-medium text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payStubs.map((stub) => {
                    const user = users.find(u => u.id === stub.employee_id);
                    const displayName = user?.nickname || user?.full_name || user?.email || 'Unknown';
                    
                    return (
                      <tr key={stub.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar user={user} size="xs" />
                            <span className="text-slate-900">{displayName}</span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-2 text-slate-900">
                          {(stub.gross_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right px-4 py-2 text-red-600">
                          {(stub.deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right px-4 py-2 font-medium text-green-600">
                          {(stub.net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-center px-4 py-2">
                          <Badge className={stub.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                            {stub.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-slate-500 pt-4 border-t">
            Generated on {format(new Date(), 'd MMMM yyyy \'at\' h:mm a')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}