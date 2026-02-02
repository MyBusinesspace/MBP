import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ChevronRight, Mail, Printer, CheckCircle, Send, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { PayItem, PayItemType, PayStub, PayrollRun } from '@/entities/all';
import { base44 } from '@/api/base44Client';

export default function PaySlipDetailsDialog({ 
  isOpen, 
  onClose, 
  paySlip, 
  user, 
  payrollRun,
  onRefresh,
  canEdit = true
}) {
  console.log('🐛 [PaySlipDetails] Render - useMemo available?', typeof useMemo);
  const [isSaving, setIsSaving] = useState(false);
  const [payItemTypes, setPayItemTypes] = useState([]);
  const [payItems, setPayItems] = useState([]);
  const [earningsRows, setEarningsRows] = useState([]);
  const [deductionsRows, setDeductionsRows] = useState([]);
  const [payslipNotes, setPayslipNotes] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Load pay items and types
  useEffect(() => {
    if (isOpen) {
      loadPayItemsData();
    }
  }, [isOpen]);

  // Initialize earnings and deductions from payslip
  useEffect(() => {
    if (paySlip && user && payItems.length > 0 && payItemTypes.length > 0) {
      setPayslipNotes(paySlip.notes || '');
      setIsSent(paySlip.status === 'Paid');

      const snapshot = paySlip.data_snapshot || {};
      
      // ✅ SIEMPRE recalcular Overtime Pay desde snapshot.hours_data
      const overtimeHours = snapshot.hours_data?.overtime_hours_paid || snapshot.overtime_hours || 0;
      const overtimeHourlyRate = snapshot.overtime_hourly_rate || 0;
      const overtimePay = overtimeHours > 0 ? overtimeHours * overtimeHourlyRate : 0;
      
      console.log('💰 [PaySlip] Loading payslip data:', {
        paySlipId: paySlip.id,
        fullSnapshot: snapshot,
        hours_data: snapshot.hours_data,
        overtimeHours,
        overtimeHourlyRate,
        overtimePay,
        snapshotKeys: Object.keys(snapshot)
      });
      
      const earningsData = snapshot.earnings_breakdown || [];

      console.log('🔍 [PaySlip] Debug Info:', {
        earningsData,
        payItems,
        payItemTypes,
        payItemsCount: payItems.length,
        payItemTypesCount: payItemTypes.length
      });

      if (earningsData.length > 0) {
        // Use saved earnings breakdown - show ALL items as saved
        const normalizedEarnings = earningsData.map(row => {
          const item = payItems.find(i => i.id === row.pay_item_id);
          const itemType = item ? payItemTypes.find(t => t.id === item.pay_item_type_id) : null;

          console.log('🔍 [Earnings Row]', {
            row,
            pay_item_id: row.pay_item_id,
            foundItem: item,
            itemName: item?.name,
            storedName: row.pay_item_name
          });

          return {
            ...row,
            pay_item_name: item?.name || row.pay_item_name || '',
            selected_category: row.selected_category || row.category || itemType?.category || 'Earnings',
            selected_subcategory: row.selected_subcategory || row.subcategory || itemType?.sub_category || '',
            account: row.account || itemType?.accounting_code || ''
          };
        });

        setEarningsRows(normalizedEarnings);
      } else {
        // Build earnings from salary_items in snapshot OR from basic values
        const earningsList = [];
        const basicSalary = snapshot.basic_salary || snapshot.regular_pay || 0;
        
        // Calculate overtime pay correctly
        const overtimeHours = snapshot.hours_data?.overtime_hours_paid || snapshot.overtime_hours || 0;
        const overtimeHourlyRate = snapshot.overtime_hourly_rate || 0;
        const overtimePay = overtimeHours > 0 ? overtimeHours * overtimeHourlyRate : 0;
        
        const salaryItems = snapshot.salary_items || [];
        
        // Add Basic Salary first
        if (basicSalary > 0) {
          earningsList.push({
            pay_item_id: null,
            pay_item_name: 'Basic Salary',
            qty: 1.00,
            rate: basicSalary,
            account: 'Wages and Salaries - Operations',
            amount: basicSalary
          });
        }
        
        // Add Overtime if present - now showing the calculation
        if (overtimePay > 0) {
          earningsList.push({
            pay_item_id: null,
            pay_item_name: 'Overtime Pay',
            qty: overtimeHours,
            rate: overtimeHourlyRate,
            account: 'Wages and Salaries - Overtime',
            amount: overtimePay
          });
        }
        
        // Add salary items from profile (Earnings and Reimbursements)
          console.log('📋 [PaySlip] Processing salary items:', salaryItems);
          salaryItems.forEach(item => {
            console.log('🔍 [PaySlip] Item:', item.pay_item_name, 'Category:', item.category, 'Is Active:', item.is_active);
            if (item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements')) {
              const itemAmount = item.amount || 0;
              const earningItem = {
                pay_item_id: item.pay_item_id || null,
                pay_item_name: item.pay_item_name || 'Allowance',
                qty: 1.00,
                rate: itemAmount,
                account: '',
                amount: itemAmount,
                category: item.category || 'Earnings',
                subcategory: '',
                selected_category: item.category || 'Earnings',
                selected_subcategory: ''
              };
              console.log('✅ [PaySlip] Adding earning item:', earningItem);
              earningsList.push(earningItem);
            }
          });
        
        // Add any additional_earnings from snapshot
        (snapshot.additional_earnings || []).forEach(earning => {
          earningsList.push({
            pay_item_id: earning.pay_item_id || null,
            pay_item_name: earning.name || earning.pay_item_name || 'Additional Earning',
            qty: 1.00,
            rate: earning.amount || 0,
            account: '',
            amount: earning.amount || 0
          });
        });
        
        // If no earnings found, create default from gross_pay
        if (earningsList.length === 0) {
          earningsList.push({
            pay_item_id: null,
            pay_item_name: 'Basic Salary',
            qty: 1.00,
            rate: paySlip.gross_pay || 0,
            account: 'Wages and Salaries - Operations',
            amount: paySlip.gross_pay || 0
          });
        }

        console.log('💰 [PaySlip] Final earningsList:', earningsList);
        setEarningsRows(earningsList);
      }

      // Initialize deductions - handle both array and object format
      let deductionsBreakdown = snapshot.deductions_breakdown;
      const deductionsList = [];
      const salaryItems = snapshot.salary_items || [];
      
      // If deductions_breakdown is an array (new format), use it directly with normalization
      if (Array.isArray(deductionsBreakdown) && deductionsBreakdown.length > 0) {
        const normalizedDeductions = deductionsBreakdown.map(row => {
          const item = payItems.find(i => i.id === row.pay_item_id);
          const itemType = item ? payItemTypes.find(t => t.id === item.pay_item_type_id) : null;

          console.log('🔍 [Deduction Row]', {
            row,
            pay_item_id: row.pay_item_id,
            foundItem: item,
            itemName: item?.name,
            storedName: row.pay_item_name
          });

          return {
            ...row,
            pay_item_name: item?.name || row.pay_item_name || '',
            selected_subcategory: row.selected_subcategory || row.subcategory || itemType?.sub_category || '',
            account: row.account || itemType?.accounting_code || ''
          };
        });
        setDeductionsRows(normalizedDeductions);
        return; // Skip the old format parsing
      }
      
      // Old format - object with specific keys
      deductionsBreakdown = deductionsBreakdown || {};
      
      // NO auto-add salary items from profile anymore - only if explicitly in breakdown
      
      // Add tax deductions from breakdown
      if (deductionsBreakdown.federal_tax) {
        deductionsList.push({
          pay_item_id: null,
          pay_item_name: 'Federal Tax',
          qty: 1.00,
          rate: deductionsBreakdown.federal_tax,
          account: 'Tax Payable - Federal',
          amount: deductionsBreakdown.federal_tax
        });
      }
      if (deductionsBreakdown.state_tax) {
        deductionsList.push({
          pay_item_id: null,
          pay_item_name: 'State Tax',
          qty: 1.00,
          rate: deductionsBreakdown.state_tax,
          account: 'Tax Payable - State',
          amount: deductionsBreakdown.state_tax
        });
      }
      if (deductionsBreakdown.social_security) {
        deductionsList.push({
          pay_item_id: null,
          pay_item_name: 'Social Security',
          qty: 1.00,
          rate: deductionsBreakdown.social_security,
          account: 'FICA Payable',
          amount: deductionsBreakdown.social_security
        });
      }
      if (deductionsBreakdown.medicare) {
        deductionsList.push({
          pay_item_id: null,
          pay_item_name: 'Medicare',
          qty: 1.00,
          rate: deductionsBreakdown.medicare,
          account: 'Medicare Payable',
          amount: deductionsBreakdown.medicare
        });
      }
      
      // Add any additional_deductions from snapshot
      (snapshot.additional_deductions || []).forEach(ded => {
        deductionsList.push({
          pay_item_id: ded.pay_item_id || null,
          pay_item_name: ded.name || ded.pay_item_name || 'Additional Deduction',
          qty: 1.00,
          rate: ded.amount || 0,
          account: '',
          amount: ded.amount || 0
        });
      });
      
      setDeductionsRows(deductionsList);
    }
  }, [paySlip, user, payItems, payItemTypes]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEarningsRows([]);
      setDeductionsRows([]);
      setPayslipNotes('');
      setIsSent(false);
    }
  }, [isOpen]);

  const loadPayItemsData = async () => {
    try {
      const [typesData, itemsData] = await Promise.all([
        PayItemType.list('sort_order', 1000),
        PayItem.list('sort_order', 1000)
      ]);

      setPayItemTypes(typesData.filter(t => t.is_active !== false));
      setPayItems(itemsData.filter(i => i.is_active !== false));
    } catch (error) {
      console.error('Failed to load pay items:', error);
    }
  };

  const displayName = user?.nickname || user?.full_name || user?.email || 'Unknown';
  const employeeNumber = user?.employee_number || '';
  
  // Check both PayrollRun status and canEdit prop
  const isPayrollRunPaid = payrollRun?.status === 'Paid';
  const isEditable = canEdit && !isPayrollRunPaid;

  // Calculate totals
  const totalEarnings = useMemo(() => {
    return earningsRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  }, [earningsRows]);

  const totalDeductions = useMemo(() => {
    return deductionsRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  }, [deductionsRows]);

  const takeHomePay = totalEarnings - totalDeductions;
  const amountPaid = isSent ? takeHomePay : 0;
  const amountDue = takeHomePay - amountPaid;

  // Handlers for earnings
  const handleAddEarning = () => {
    setEarningsRows([...earningsRows, {
      pay_item_id: null,
      pay_item_name: '',
      qty: 1.00,
      rate: 0,
      account: '',
      amount: 0
    }]);
  };

  const handleRemoveEarning = (index) => {
    setEarningsRows(earningsRows.filter((_, i) => i !== index));
  };

  const handleEarningChange = (index, field, value) => {
    const newRows = [...earningsRows];
    newRows[index][field] = value;

    // Recalculate amount
    if (field === 'qty' || field === 'rate') {
      const qty = parseFloat(newRows[index].qty) || 0;
      const rate = parseFloat(newRows[index].rate) || 0;
      newRows[index].amount = qty * rate;
    }

    // If pay_item_id changed, populate from pay item
    if (field === 'pay_item_id') {
      const selectedItem = payItems.find(item => item.id === value);
      if (selectedItem) {
        newRows[index].pay_item_id = value;
        newRows[index].pay_item_name = selectedItem.name;
        newRows[index].rate = selectedItem.default_amount || 0;
        newRows[index].amount = newRows[index].qty * newRows[index].rate;
        
        // Get account and category info from pay item type
        const itemType = payItemTypes.find(t => t.id === selectedItem.pay_item_type_id);
        newRows[index].account = itemType?.accounting_code || '';
        newRows[index].category = itemType?.category || '';
        newRows[index].subcategory = itemType?.sub_category || '';
        newRows[index].selected_category = itemType?.category || '';
        newRows[index].selected_subcategory = itemType?.sub_category || '';
      }
    }

    setEarningsRows(newRows);
  };

  // Handlers for deductions
  const handleAddDeduction = () => {
    setDeductionsRows([...deductionsRows, {
      pay_item_id: null,
      pay_item_name: '',
      qty: 1.00,
      rate: 0,
      account: '',
      amount: 0
    }]);
  };

  const handleRemoveDeduction = (index) => {
    setDeductionsRows(deductionsRows.filter((_, i) => i !== index));
  };

  const handleDeductionChange = (index, field, value) => {
    const newRows = [...deductionsRows];
    newRows[index][field] = value;

    // Recalculate amount
    if (field === 'qty' || field === 'rate') {
      const qty = parseFloat(newRows[index].qty) || 0;
      const rate = parseFloat(newRows[index].rate) || 0;
      newRows[index].amount = qty * rate;
    }

    // If pay_item_id changed, populate from pay item
    if (field === 'pay_item_id') {
      const selectedItem = payItems.find(item => item.id === value);
      if (selectedItem) {
        newRows[index].pay_item_id = value;
        newRows[index].pay_item_name = selectedItem.name;
        newRows[index].rate = selectedItem.default_amount || 0;
        newRows[index].amount = newRows[index].qty * newRows[index].rate;
        
        const itemType = payItemTypes.find(t => t.id === selectedItem.pay_item_type_id);
        newRows[index].account = itemType?.accounting_code || '';
        newRows[index].category = itemType?.category || 'Deductions';
        newRows[index].subcategory = itemType?.sub_category || '';
        newRows[index].selected_subcategory = itemType?.sub_category || '';
      }
    }

    setDeductionsRows(newRows);
  };

  const handleSave = async () => {
    if (!paySlip) {
      toast.error('No payslip to save');
      return;
    }

    setIsSaving(true);
    try {
      // Build earnings breakdown with all data
      const earningsBreakdown = earningsRows.map(row => ({
        pay_item_id: row.pay_item_id || null,
        pay_item_name: row.pay_item_name || '',
        qty: parseFloat(row.qty) || 1,
        rate: parseFloat(row.rate) || 0,
        amount: parseFloat(row.amount) || 0,
        account: row.account || '',
        category: row.category || row.selected_category || '',
        subcategory: row.subcategory || row.selected_subcategory || '',
        selected_category: row.selected_category || row.category || '',
        selected_subcategory: row.selected_subcategory || row.subcategory || ''
      }));

      // Build deductions breakdown with all data
      const deductionsBreakdown = deductionsRows.map(row => ({
        pay_item_id: row.pay_item_id || null,
        pay_item_name: row.pay_item_name || '',
        qty: parseFloat(row.qty) || 1,
        rate: parseFloat(row.rate) || 0,
        amount: parseFloat(row.amount) || 0,
        account: row.account || '',
        category: row.category || 'Deductions',
        subcategory: row.subcategory || row.selected_subcategory || '',
        selected_subcategory: row.selected_subcategory || row.subcategory || ''
      }));

      // Update PayStub with new data
      const updatedData = {
        gross_pay: totalEarnings,
        deductions: totalDeductions,
        net_pay: takeHomePay,
        notes: payslipNotes,
        data_snapshot: {
          ...(paySlip.data_snapshot || {}),
          notes: payslipNotes,
          earnings_breakdown: earningsBreakdown,
          deductions_breakdown: deductionsBreakdown
        }
      };

      console.log('Saving payslip:', paySlip.id, updatedData);
      await PayStub.update(paySlip.id, updatedData);
      console.log('Payslip saved successfully');

      // Recalculate PayrollRun totals
      if (payrollRun) {
        const allPayStubs = await PayStub.filter({ payroll_run_id: payrollRun.id });
        const totalGross = allPayStubs.reduce((sum, stub) => {
          return sum + (stub.id === paySlip.id ? totalEarnings : (stub.gross_pay || 0));
        }, 0);
        const totalDed = allPayStubs.reduce((sum, stub) => {
          return sum + (stub.id === paySlip.id ? totalDeductions : (stub.deductions || 0));
        }, 0);
        const totalNet = allPayStubs.reduce((sum, stub) => {
          return sum + (stub.id === paySlip.id ? takeHomePay : (stub.net_pay || 0));
        }, 0);

        await PayrollRun.update(payrollRun.id, {
          total_gross_pay: totalGross,
          total_deductions: totalDed,
          total_payroll_cost: totalNet,
          employee_payments: totalNet
        });
      }

      toast.success('Payslip updated successfully');
      if (onRefresh) await onRefresh();
      onClose(); // Close dialog after successful save
    } catch (error) {
      console.error('Failed to save payslip:', error);
      toast.error('Failed to save payslip: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPayslip = () => {
    // This function seems to be for local UI state/toast, not actual sending logic
    // The actual sending logic is now in handleSendEmail
    setIsSent(true);
    toast.success(`Payslip marked as sent for ${user.email}`);
  };

  const handleMarkAsUnsent = () => {
    setIsSent(false);
    toast.success('Payslip marked as unsent');
  };

  const handlePrintPDF = async () => {
    if (!paySlip) return;
    
    setIsExporting(true);
    try {
      const response = await base44.functions.invoke('exportPaySlipPDF', {
        pay_slip_id: paySlip.id
      });
      
      // Crear blob y descargar
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${user?.nickname || user?.full_name || 'employee'}-${payrollRun?.payrun_number || 'unknown'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!paySlip || !user || !user.email) {
      toast.error('Cannot send email: Payslip or User data incomplete.');
      return;
    }
    
    setIsSendingEmail(true);
    try {
      // First, generate the PDF
      const pdfResponse = await base44.functions.invoke('exportPaySlipPDF', {
        pay_slip_id: paySlip.id
      });
      
      // Upload the PDF to storage
      const pdfBlob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], `payslip-${paySlip.id}.pdf`, { type: 'application/pdf' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      
      // Send email with the attached PDF
      const periodStartDateFormatted = payrollRun?.period_start_date ? format(parseISO(payrollRun.period_start_date), 'd MMM yyyy') : '';
      const periodEndDateFormatted = payrollRun?.period_end_date ? format(parseISO(payrollRun.period_end_date), 'd MMM yyyy') : '';
      const payDateFormatted = payrollRun?.pay_date ? format(parseISO(payrollRun.pay_date), 'd MMM yyyy') : '';

      const emailBody = `
Dear ${user.nickname || user.full_name || 'Employee'},

Please find attached your payslip for the period ${periodStartDateFormatted} to ${periodEndDateFormatted}.

Pay Date: ${payDateFormatted}
Net Pay: ${takeHomePay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED

You can download your payslip from the attachment in this email.

Best regards,
HR Team
      `.trim();
      
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Payslip - ${periodStartDateFormatted} to ${periodEndDateFormatted}`,
        body: emailBody,
        attachments: [
          {
            file_url: file_url,
            file_name: `Payslip-${user?.nickname || user?.full_name || 'employee'}-${payrollRun?.payrun_number || 'unknown'}.pdf`
          }
        ]
      });
      
      // Save to employee documents (if EmployeeDocument entity exists)
      try {
        const docTypes = await base44.entities.DocumentType.filter({ name: 'Payslip' });
        let docTypeId = docTypes[0]?.id;
        
        if (!docTypeId) {
          // Create document type if it doesn't exist
          const newDocType = await base44.entities.DocumentType.create({
            name: 'Payslip',
            folder_name: 'Payslips',
            description: 'Employee payslips',
            sort_order: 100
          });
          docTypeId = newDocType.id;
        }
        
        // Create employee document
        await base44.entities.EmployeeDocument.create({
          employee_id: user.id,
          document_type_id: docTypeId,
          file_urls: [file_url],
          file_names: [`Payslip ${payrollRun?.payrun_number || paySlip.id}.pdf`],
          upload_date: new Date().toISOString(),
          notes: `Payslip for period ${periodStartDateFormatted} to ${periodEndDateFormatted}`
        });
      } catch (docError) {
        console.log('Could not save to employee documents:', docError);
        toast.warning('Payslip sent, but failed to save to employee documents.');
      }
      
      toast.success(`Payslip sent to ${user.email}`);
      setIsSent(true); // Mark as sent in UI
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Failed to send payslip');
    } finally {
      setIsSendingEmail(false);
    }
  };


  if (!paySlip || !user) return null;

  // Get earnings pay items (category != Deductions)
  const earningsPayItems = payItems.filter(item => {
    const itemType = payItemTypes.find(t => t.id === item.pay_item_type_id);
    // Include everything that is NOT a deduction (Earnings, Reimbursements, Benefits, etc.)
    return itemType?.category !== 'Deductions';
  });

  // Get deductions pay items (category = Deductions)
  const deductionsPayItems = payItems.filter(item => {
    const itemType = payItemTypes.find(t => t.id === item.pay_item_type_id);
    return itemType?.category === 'Deductions';
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        {/* Header with Breadcrumb */}
        <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-blue-600 mb-3">
            <span className="hover:underline cursor-pointer">Pay Run</span>
            <ChevronRight className="w-4 h-4" />
            <span className="hover:underline cursor-pointer">
              Pay Run ({payrollRun?.period_start_date && format(parseISO(payrollRun.period_start_date), 'd MMM yyyy')} - 
              {payrollRun?.period_end_date && format(parseISO(payrollRun.period_end_date), 'd MMM yyyy')})
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700">Payslip for {displayName}</span>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-800">
              Payslip for {displayName}
            </h2>

            <div className="flex items-center gap-3">
              {isPayrollRunPaid ? (
                <Badge className="bg-red-100 text-red-700 gap-1 text-sm px-3 py-1">
                  <CheckCircle className="w-3 h-3" />
                  Payroll Run Paid - Cannot Edit
                </Badge>
              ) : (
                <>
                  {isSent ? (
                    <>
                      <Badge className="bg-blue-100 text-blue-700 gap-1">
                        <Send className="w-3 h-3" />
                        Sent
                      </Badge>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-slate-600"
                        onClick={handleMarkAsUnsent}
                      >
                        Mark as unsent
                      </Button>
                    </>
                  ) : (
                    // This button only marks as sent in the UI, actual sending is via Email button
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSendPayslip} 
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Mark as Sent
                    </Button>
                  )}
                </>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Email
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handlePrintPDF}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Print PDF
              </Button>

              {isEditable && (
                <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-indigo-600">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* To Section */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold text-slate-900 mb-1">To</div>
              <div className="text-slate-700">{displayName}</div>
              {employeeNumber && (
                <div className="text-slate-500 text-xs">ID: {employeeNumber}</div>
              )}
              <div className="text-slate-500 text-xs mt-1">No address</div>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-1">Date</div>
              <div className="text-slate-700">
                {payrollRun?.pay_date && format(parseISO(payrollRun.pay_date), 'd MMM yyyy')}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-1">Due Date</div>
              <div className="text-slate-700">
                {payrollRun?.pay_date && format(parseISO(payrollRun.pay_date), 'd MMM yyyy')}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-1">Reference</div>
              <div className="text-slate-700">{payrollRun?.payrun_number || '-'}</div>
            </div>
          </div>

          {/* Earnings Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Earnings</h3>
              {isEditable && (
                <Button onClick={handleAddEarning} size="sm" variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Earning
                </Button>
              )}
            </div>
            <div className="border rounded-lg overflow-visible">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-2 py-2 font-medium text-slate-700" style={{width: '14%'}}>Category</th>
                    <th className="text-left px-2 py-2 font-medium text-slate-700" style={{width: '14%'}}>Subcategory</th>
                    <th className="text-left px-2 py-2 font-medium text-slate-700" style={{width: '18%'}}>Pay Item</th>
                    <th className="text-left px-2 py-2 font-medium text-slate-700" style={{width: '18%'}}>Account</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-700" style={{width: '8%'}}>Qty</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-700" style={{width: '12%'}}>Rate</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-700" style={{width: '12%'}}>Amount</th>
                    {isEditable && <th className="text-center px-1 py-2 font-medium text-slate-700" style={{width: '4%'}}></th>}
                  </tr>
                </thead>
                <tbody>
                  {earningsRows.map((row, index) => {
                    // Try to find pay item by ID or by name
                    let selectedItem = earningsPayItems.find(i => i.id === row.pay_item_id);
                    if (!selectedItem && row.pay_item_name) {
                      selectedItem = earningsPayItems.find(i => i.name === row.pay_item_name);
                    }
                    const selectedType = selectedItem ? payItemTypes.find(t => t.id === selectedItem.pay_item_type_id) : null;
                    
                    // Also try to find type by name if no item found
                    let typeByName = null;
                    if (!selectedType && row.pay_item_name) {
                      typeByName = payItemTypes.find(t => t.name === row.pay_item_name);
                    }
                    
                    // Get unique categories and subcategories for filtering
                    const earningsTypes = payItemTypes.filter(t => t.category !== 'Deductions');
                    const uniqueCategories = [...new Set(earningsTypes.map(t => t.category).filter(Boolean))];
                    
                    // Auto-detect category/subcategory - prioritize type info, then saved values
                    const selectedCategory = selectedType?.category || typeByName?.category || row.selected_category || row.category || 'Earnings';
                    const typesInCategory = earningsTypes.filter(t => t.category === selectedCategory);
                    const uniqueSubcategories = [...new Set(typesInCategory.map(t => t.sub_category).filter(Boolean))];
                    const selectedSubcategory = selectedType?.sub_category || typeByName?.sub_category || row.selected_subcategory || row.subcategory || 'Base Pay';
                    const itemsInSubcategory = earningsPayItems.filter(item => {
                      const itemType = payItemTypes.find(t => t.id === item.pay_item_type_id);
                      return itemType?.category === selectedCategory && itemType?.sub_category === selectedSubcategory;
                    });
                    const accountCode = selectedType?.accounting_code || typeByName?.accounting_code || row.account || '';
                    
                    return (
                      <tr key={index} className="border-b">
                        {/* Category */}
                        <td className="px-1 py-1">
                          {isEditable ? (
                            <Select
                              value={selectedCategory || ''}
                              onValueChange={(value) => {
                                const newRows = [...earningsRows];
                                newRows[index].selected_category = value;
                                newRows[index].category = value;
                                newRows[index].selected_subcategory = '';
                                newRows[index].subcategory = '';
                                newRows[index].pay_item_id = null;
                                newRows[index].pay_item_name = '';
                                newRows[index].account = '';
                                setEarningsRows(newRows);
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-full z-[9999]">
                                <SelectValue placeholder="Category">
                                  {selectedCategory || 'Category'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[9999]" position="popper" side="bottom" align="start">
                                {uniqueCategories.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-slate-600 text-xs">{selectedCategory || '-'}</span>
                          )}
                        </td>
                        {/* Subcategory */}
                        <td className="px-1 py-1">
                          {isEditable ? (
                            <Select
                              value={selectedSubcategory || ''}
                              onValueChange={(value) => {
                                const newRows = [...earningsRows];
                                newRows[index].selected_subcategory = value;
                                newRows[index].subcategory = value;
                                newRows[index].pay_item_id = null;
                                newRows[index].pay_item_name = '';
                                newRows[index].account = '';
                                setEarningsRows(newRows);
                              }}
                              disabled={!selectedCategory}
                            >
                              <SelectTrigger className="h-7 text-xs w-full">
                                <SelectValue placeholder="Subcategory">
                                  {selectedSubcategory || 'Subcategory'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[9999]" position="popper" side="bottom" align="start">
                                {uniqueSubcategories.map(sub => (
                                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-slate-600 text-xs">{selectedSubcategory || '-'}</span>
                          )}
                        </td>
                        {/* Pay Item */}
                        <td className="px-1 py-1">
                          {isEditable ? (
                            <Select
                              value={row.pay_item_id || ''}
                              onValueChange={(value) => handleEarningChange(index, 'pay_item_id', value)}
                              disabled={!selectedSubcategory}
                            >
                              <SelectTrigger className="h-7 text-xs w-full">
                               <SelectValue placeholder="Select item" asChild>
                                 <span>
                                   {(() => {
                                     const item = earningsPayItems.find(i => i.id === row.pay_item_id);
                                     const displayName = item?.name || row.pay_item_name || 'Select item';
                                     console.log('🎯 [SelectValue Render]', { 
                                       rowIndex: index,
                                       pay_item_id: row.pay_item_id, 
                                       foundItem: item, 
                                       itemName: item?.name,
                                       storedName: row.pay_item_name,
                                       displayName 
                                     });
                                     return displayName;
                                   })()}
                                 </span>
                               </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[9999]" position="popper" side="bottom" align="start">
                                {itemsInSubcategory.map(item => (
                                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-slate-900 text-xs">{row.pay_item_name}</span>
                          )}
                        </td>
                        {/* Account */}
                        <td className="px-1 py-1">
                          <span className="text-slate-500 text-xs">{accountCode || '-'}</span>
                        </td>
                        <td className="text-right px-1 py-1">
                          {isEditable ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={row.qty}
                              onChange={(e) => handleEarningChange(index, 'qty', e.target.value)}
                              className="h-7 text-right text-xs w-full"
                            />
                          ) : (
                            <span className="text-slate-700 text-xs">{row.qty}</span>
                          )}
                        </td>
                        <td className="text-right px-1 py-1">
                          {isEditable ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={row.rate}
                              onChange={(e) => handleEarningChange(index, 'rate', e.target.value)}
                              className="h-7 text-right text-xs w-full"
                            />
                          ) : (
                            <span className="text-slate-700 text-xs">{row.rate.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="text-right px-1 py-1 text-slate-900 font-medium text-xs">
                          {row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {isEditable && (
                          <td className="text-center px-1 py-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEarning(index)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Total Earnings Row */}
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-2 py-2 font-semibold text-slate-900 text-sm">
                      Total Earnings
                    </td>
                    <td className="text-right px-2 py-2 font-bold text-slate-900 text-sm">
                      {totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {isEditable && <td></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Deductions Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Deductions</h3>
              {isEditable && (
                <Button onClick={handleAddDeduction} size="sm" variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Deduction
                </Button>
              )}
            </div>

            {deductionsRows.length === 0 ? (
              <div className="text-sm text-slate-600 italic bg-slate-50 p-4 rounded-lg">
                There are no deductions for this payment period
              </div>
            ) : (
              <div className="border rounded-lg overflow-visible">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-2 py-2 font-medium text-slate-700" style={{width: '14%'}}>Category</th>
                      <th className="text-left px-2 py-2 font-medium text-slate-700" style={{width: '14%'}}>Subcategory</th>
                      <th className="text-left px-2 py-2 font-medium text-slate-700" style={{width: '18%'}}>Pay Item</th>
                      <th className="text-left px-2 py-2 font-medium text-slate-700" style={{width: '18%'}}>Account</th>
                      <th className="text-right px-2 py-2 font-medium text-slate-700" style={{width: '8%'}}>Qty</th>
                      <th className="text-right px-2 py-2 font-medium text-slate-700" style={{width: '12%'}}>Rate</th>
                      <th className="text-right px-2 py-2 font-medium text-slate-700" style={{width: '12%'}}>Amount</th>
                      {isEditable && <th className="text-center px-1 py-2 font-medium text-slate-700" style={{width: '4%'}}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {deductionsRows.map((row, index) => {
                      // Try to find pay item by ID or by name
                      let selectedItem = deductionsPayItems.find(i => i.id === row.pay_item_id);
                      if (!selectedItem && row.pay_item_name) {
                        selectedItem = deductionsPayItems.find(i => i.name === row.pay_item_name);
                      }
                      const selectedType = selectedItem ? payItemTypes.find(t => t.id === selectedItem.pay_item_type_id) : null;
                      
                      // Also try to find type by name if no item found
                      let typeByName = null;
                      if (!selectedType && row.pay_item_name) {
                        typeByName = payItemTypes.find(t => t.name === row.pay_item_name);
                      }
                      
                      // Get unique subcategories for Deductions
                      const deductionTypes = payItemTypes.filter(t => t.category === 'Deductions');
                      const uniqueSubcategories = [...new Set(deductionTypes.map(t => t.sub_category).filter(Boolean))];
                      const selectedSubcategory = selectedType?.sub_category || typeByName?.sub_category || row.selected_subcategory || row.subcategory || 'Taxes';
                      const itemsInSubcategory = deductionsPayItems.filter(item => {
                        const itemType = payItemTypes.find(t => t.id === item.pay_item_type_id);
                        return itemType?.sub_category === selectedSubcategory;
                      });
                      const accountCode = selectedType?.accounting_code || typeByName?.accounting_code || row.account || '';
                      
                      return (
                        <tr key={index} className="border-b">
                          {/* Category - Fixed as "Deductions" */}
                          <td className="px-1 py-1">
                            <span className="text-slate-600 text-xs">Deductions</span>
                          </td>
                          {/* Subcategory */}
                          <td className="px-1 py-1">
                            {isEditable ? (
                              <Select
                                value={selectedSubcategory || ''}
                                onValueChange={(value) => {
                                  const newRows = [...deductionsRows];
                                  newRows[index].selected_subcategory = value;
                                  newRows[index].subcategory = value;
                                  newRows[index].pay_item_id = null;
                                  newRows[index].pay_item_name = '';
                                  newRows[index].account = '';
                                  setDeductionsRows(newRows);
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue placeholder="Subcategory">
                                    {selectedSubcategory || 'Subcategory'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="z-[9999]" position="popper" side="bottom" align="start">
                                  {uniqueSubcategories.map(sub => (
                                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-slate-600 text-xs">{selectedSubcategory || '-'}</span>
                            )}
                          </td>
                          {/* Pay Item */}
                          <td className="px-1 py-1">
                            {isEditable ? (
                              <Select
                                value={row.pay_item_id || ''}
                                onValueChange={(value) => handleDeductionChange(index, 'pay_item_id', value)}
                                disabled={!selectedSubcategory}
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                 <SelectValue placeholder="Select item" asChild>
                                   <span>
                                     {(() => {
                                       const item = deductionsPayItems.find(i => i.id === row.pay_item_id);
                                       const displayName = item?.name || row.pay_item_name || 'Select item';
                                       console.log('🎯 [Deduction SelectValue Render]', { 
                                         rowIndex: index,
                                         pay_item_id: row.pay_item_id, 
                                         foundItem: item, 
                                         itemName: item?.name,
                                         storedName: row.pay_item_name,
                                         displayName 
                                       });
                                       return displayName;
                                     })()}
                                   </span>
                                 </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="z-[9999]" position="popper" side="bottom" align="start">
                                  {itemsInSubcategory.map(item => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-slate-900 text-xs">{row.pay_item_name}</span>
                            )}
                          </td>
                          {/* Account */}
                          <td className="px-1 py-1">
                            <span className="text-slate-500 text-xs">{accountCode || '-'}</span>
                          </td>
                          <td className="text-right px-1 py-1">
                            {isEditable ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={row.qty}
                                onChange={(e) => handleDeductionChange(index, 'qty', e.target.value)}
                                className="h-7 text-right text-xs w-full"
                              />
                            ) : (
                              <span className="text-slate-700 text-xs">{row.qty}</span>
                            )}
                          </td>
                          <td className="text-right px-1 py-1">
                            {isEditable ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={row.rate}
                                onChange={(e) => handleDeductionChange(index, 'rate', e.target.value)}
                                className="h-7 text-right text-xs w-full"
                              />
                            ) : (
                              <span className="text-slate-700 text-xs">{row.rate.toLocaleString()}</span>
                            )}
                          </td>
                          <td className="text-right px-1 py-1 text-red-600 font-medium text-xs">
                            {row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {isEditable && (
                            <td className="text-center px-1 py-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDeduction(index)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Total Deductions Row */}
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="px-2 py-2 font-semibold text-slate-900 text-sm">
                        Total Deductions
                      </td>
                      <td className="text-right px-2 py-2 font-bold text-red-600 text-sm">
                        {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {isEditable && <td></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TAKE HOME PAY */}
          <div className="border-t-2 border-slate-900 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">TAKE HOME PAY</span>
              <span className="text-2xl font-bold text-slate-900">
                {takeHomePay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Less Payment */}
          {isSent && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">
                Less Payment <span className="text-slate-500">{paySlip.created_date && format(parseISO(paySlip.created_date), 'd MMM yyyy')}</span>
              </span>
              <span className="font-medium text-slate-900">
                {amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* AMOUNT DUE */}
          <div className="border-t border-slate-300 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">AMOUNT DUE</span>
              <span className="text-xl font-bold text-slate-900">
                {amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payslip note */}
          <div className="border-t border-slate-200 pt-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Payslip note</h3>
              <Textarea
                value={payslipNotes}
                onChange={(e) => setPayslipNotes(e.target.value)}
                placeholder="Add notes for this payslip..."
                className="min-h-[100px] text-sm"
                disabled={!isEditable}
              />
            </div>

            {/* History & Notes */}
            <div className="mt-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                History & Notes
                <button className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                  ?
                </button>
              </h3>

              {isSent && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                  <div className="text-sm font-medium text-yellow-900">
                    Payslip sent by {paySlip.created_by} on {paySlip.created_date && format(parseISO(paySlip.created_date), 'd MMM yyyy \'at\' h:mma')}
                  </div>
                  <div className="text-sm text-yellow-800 mt-1">
                    This payslip has been sent.
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="link" size="sm" className="text-blue-600">
                  Show History (4 entries)
                </Button>
                <Button variant="outline" size="sm">
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}