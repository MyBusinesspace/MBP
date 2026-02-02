import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { TimesheetEntry, PayStub, AppSettings } from '@/entities/all';
import { Loader2, DollarSign, Edit, Plus, X, UserMinus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Avatar from '../Avatar';
import { cn } from '@/lib/utils';

export default function PayrollRunDialog({ isOpen, onClose, onSave, run, users, employeeProfiles }) {
  const [runData, setRunData] = useState({
    period_start_date: '',
    period_end_date: '',
    pay_date: '',
    status: 'Draft',
    payrun_number: '' // Added payrun_number
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedData, setCalculatedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [manualAdjustments, setManualAdjustments] = useState({});
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [periodType, setPeriodType] = useState('month'); // 'month', 'week', 'custom'
  const [payDateOffset, setPayDateOffset] = useState(5); // Default: Pay date is end date + 5 days
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState('all'); // 'all', 'field', 'office'
  const [excludedEmployees, setExcludedEmployees] = useState(new Set());
  const [otherPayments, setOtherPayments] = useState([]);
  const [sortColumn, setSortColumn] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (run) {
      console.log('🔍 Loading run for editing:', run);
      console.log('🔍 other_payments_details:', run.other_payments_details);
      setRunData(run);
      // Load existing other payments - handle undefined/null/missing field
      const otherPaymentsData = run.other_payments_details || run.data?.other_payments_details || [];
      console.log('🔍 Setting otherPayments to:', otherPaymentsData);
      setOtherPayments(otherPaymentsData);
    } else {
      // Set default month/year to current FIRST
      const now = new Date();
      setSelectedMonth(String(now.getMonth()));
      setSelectedYear(String(now.getFullYear()));
      
      // Auto-generate payrun number for new runs
      loadNextPayrunNumber();
      setRunData({
        period_start_date: '',
        period_end_date: '',
        pay_date: '',
        status: 'Draft',
        payrun_number: ''
      });
      // Reset other payments for new runs
      setOtherPayments([]);
    }
    setCalculatedData(null);
    setManualAdjustments({});
    setExcludedEmployees(new Set());
  }, [run, isOpen]);

  // Update dates when month/year or week changes based on period type
  useEffect(() => {
    if (run) return; // Don't update for existing runs
    if (periodType === 'custom') return; // Don't auto-update for custom
    
    if (periodType === 'month') {
      if (selectedMonth === '' || selectedYear === '') return;
      
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      const startDate = startOfMonth(new Date(year, month));
      const endDate = endOfMonth(new Date(year, month));
      const payDate = addDays(endDate, payDateOffset);
      
      setRunData(prev => ({
        ...prev,
        period_start_date: format(startDate, 'yyyy-MM-dd'),
        period_end_date: format(endDate, 'yyyy-MM-dd'),
        pay_date: format(payDate, 'yyyy-MM-dd')
      }));
    } else if (periodType === 'week') {
      if (selectedWeek === '' || selectedYear === '') return;
      
      const year = parseInt(selectedYear);
      const weekNum = parseInt(selectedWeek);
      // Calculate start of week (Monday) for given week number
      const jan1 = new Date(year, 0, 1);
      const daysToFirstMonday = (8 - jan1.getDay()) % 7;
      const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
      const weekStart = new Date(firstMonday);
      weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const payDate = addDays(weekEnd, payDateOffset);
      
      setRunData(prev => ({
        ...prev,
        period_start_date: format(weekStart, 'yyyy-MM-dd'),
        period_end_date: format(weekEnd, 'yyyy-MM-dd'),
        pay_date: format(payDate, 'yyyy-MM-dd')
      }));
    }
  }, [selectedMonth, selectedYear, selectedWeek, periodType, payDateOffset, run]);

  const loadNextPayrunNumber = async () => {
    try {
      const settings = await AppSettings.list('setting_key', 1000);
      
      let prefix = 'PR';
      let nextNumber = 1;
      let digits = 2;
      
      settings.forEach(setting => {
        if (setting.setting_key === 'payroll_payrun_prefix') {
          prefix = setting.setting_value;
        } else if (setting.setting_key === 'payroll_payrun_next_number') {
          nextNumber = parseInt(setting.setting_value) || 1;
        } else if (setting.setting_key === 'payroll_payrun_digits') {
          digits = parseInt(setting.setting_value) || 2;
        }
      });
      
      const paddedNumber = String(nextNumber).padStart(digits, '0');
      const currentYear = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of year
      const payrunNumber = `${prefix}-${paddedNumber}/${currentYear}`;
      
      setRunData(prev => ({ ...prev, payrun_number: payrunNumber }));
    } catch (error) {
      console.error('Failed to load payrun number:', error);
      toast.error('Failed to load payrun number settings');
    }
  };

  const handleChange = (field, value) => {
    // When manually changing dates, switch to custom period type
    if (field === 'period_start_date' || field === 'period_end_date') {
      setPeriodType('custom');
    }
    setRunData(prev => ({ ...prev, [field]: value }));
    setCalculatedData(null);
  };

  const calculateDeductions = (grossPay, profile) => {
    // ✅ NO calcular deducciones automáticas - solo usar las del perfil
    // Solo incluir deducciones que estén explícitamente definidas en salary_items
    const salaryItems = profile?.salary_items || [];
    const totalDeductions = salaryItems
      .filter(item => item.is_active && item.category === 'Deductions')
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    return {
      total: Math.round(totalDeductions * 100) / 100
    };
  };

  const calculatePayroll = async () => {
    if (!runData.period_start_date || !runData.period_end_date) {
      toast.error("Please select period dates first");
      return;
    }

    setIsCalculating(true);
    try {
      // Changed to use '-updated_date' for timesheet listing
      const timesheets = await TimesheetEntry.list('-updated_date', 10000);
      
      const periodStart = new Date(runData.period_start_date);
      const periodEnd = new Date(runData.period_end_date);
      periodEnd.setHours(23, 59, 59, 999);

      const periodTimesheets = timesheets.filter(ts => {
        if (!ts.clock_in_time) return false;
        if (ts.status === 'rejected') return false;
        
        const clockIn = new Date(ts.clock_in_time);
        return clockIn >= periodStart && clockIn <= periodEnd;
      });

      console.log(`📊 Found ${periodTimesheets.length} timesheets in period`);

      const employeeHours = new Map();

      periodTimesheets.forEach(ts => {
        const employeeId = ts.employee_id;
        if (!employeeId) return;

        if (!employeeHours.has(employeeId)) {
          employeeHours.set(employeeId, {
            employee_id: employeeId,
            regular_hours: 0,
            overtime_hours_paid: 0, // NEW field
            overtime_hours_non_paid: 0, // NEW field
            total_hours: 0,
            timesheets_count: 0
            // weekly_breakdown removed as calculated fields are used directly
          });
        }

        const data = employeeHours.get(employeeId);
        
        // Use new calculated fields from timesheets
        data.regular_hours += ts.regular_hours_calculated || 0;
        data.overtime_hours_paid += ts.overtime_hours_paid_calculated || 0;
        data.overtime_hours_non_paid += ts.overtime_hours_non_paid_calculated || 0;
        data.total_hours += (ts.total_duration_minutes || 0) / 60;
        data.timesheets_count += 1;
      });

      // Round hours
      employeeHours.forEach((data) => {
        data.regular_hours = Math.round(data.regular_hours * 100) / 100;
        data.overtime_hours_paid = Math.round(data.overtime_hours_paid * 100) / 100;
        data.overtime_hours_non_paid = Math.round(data.overtime_hours_non_paid * 100) / 100;
        data.total_hours = Math.round(data.total_hours * 100) / 100;
      });

      const employeePayments = [];
      let totalPayrollCost = 0;
      let totalDeductions = 0;

      // Load overtime multiplier from settings once
      const settings = await AppSettings.filter({ setting_key: 'timesheet_hours_overtime_multiplier' });
      const overtimeMultiplier = settings.length > 0 ? parseFloat(settings[0].setting_value) || 1.5 : 1.5;

      for (const [employeeId, hoursData] of employeeHours) {
        const user = users.find(u => u.id === employeeId);
        const profile = employeeProfiles.find(p => p.employee_id === employeeId);

        if (!user || user.archived) continue;

        let grossPay = 0;
        let regularPay = 0;
        let overtimePay = 0;
        let extrasPay = 0;

        if (profile) {
          // Use monthly_basic_salary from profile
          const monthlyBasicSalary = profile.monthly_basic_salary || 0;
          const ordinaryHourlyRate = profile.ordinary_hourly_rate || 0;
          const overtimeHourlyRate = profile.overtime_hourly_rate || (ordinaryHourlyRate * overtimeMultiplier);

          // Calculate base monthly salary
          regularPay = monthlyBasicSalary;
          
          // Calculate overtime pay correctly
          if (hoursData.overtime_hours_paid > 0 && overtimeHourlyRate > 0) {
            overtimePay = hoursData.overtime_hours_paid * overtimeHourlyRate;
          }
          
          // Calculate extras (additional earnings excluding basic salary)
          const salaryItems = profile.salary_items || [];
          extrasPay = salaryItems
            .filter(item => item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements'))
            .reduce((sum, item) => sum + (item.amount || 0), 0);
          
          // Don't subtract deductions from gross pay - they're applied separately
          grossPay = regularPay + overtimePay + extrasPay;
        }

        // Calcular deducciones
        const deductions = calculateDeductions(grossPay, profile);
        const netPay = grossPay - deductions.total;

        totalPayrollCost += netPay;
        totalDeductions += deductions.total;

        employeePayments.push({
          employee_id: employeeId,
          user,
          profile,
          hours_data: hoursData,
          regular_pay: Math.round(regularPay * 100) / 100,
          overtime_pay: Math.round(overtimePay * 100) / 100,
          extras_pay: Math.round(extrasPay * 100) / 100,
          gross_pay: Math.round(grossPay * 100) / 100,
          deductions: deductions,
          net_pay: Math.round(netPay * 100) / 100,
          has_profile: !!profile,
          is_manually_adjusted: false
        });
      }

      // Include ALL non-archived employees (field and office) who don't already have payments
      // Filter by employee type (field/office) based on user's worker_type
      users.forEach(user => {
        if (user.archived) return;
        if (employeePayments.some(ep => ep.employee_id === user.id)) return;

        // Check employee type filter using user's worker_type field
        if (employeeTypeFilter !== 'all') {
          const userWorkerType = user.worker_type || 'field'; // Default to field if not set
          if (userWorkerType !== employeeTypeFilter) return;
        }

        // Check if employee is excluded
        if (excludedEmployees.has(user.id)) return;
        
        const profile = employeeProfiles.find(p => p.employee_id === user.id);
        
        let grossPay = 0;
        let regularPay = 0;
        let extrasPay = 0;
        
        if (profile) {
          // Use monthly_basic_salary from profile
          const monthlyBasicSalary = profile.monthly_basic_salary || 0;
          regularPay = monthlyBasicSalary;
          
          // Calculate extras
          const salaryItems = profile.salary_items || [];
          extrasPay = salaryItems
            .filter(item => item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements'))
            .reduce((sum, item) => sum + (item.amount || 0), 0);
          
          // Don't subtract deductions from gross pay - they're applied separately
          grossPay = regularPay + extrasPay;
        }
        
        const deductions = calculateDeductions(grossPay, profile);
        const netPay = grossPay - deductions.total;
        
        totalPayrollCost += netPay;
        totalDeductions += deductions.total;

        employeePayments.push({
          employee_id: user.id,
          user,
          profile,
          hours_data: {
            employee_id: user.id,
            regular_hours: 0,
            overtime_hours_paid: 0,
            overtime_hours_non_paid: 0,
            total_hours: 0,
            timesheets_count: 0
          },
          regular_pay: Math.round(regularPay * 100) / 100,
          overtime_pay: 0,
          extras_pay: Math.round(extrasPay * 100) / 100,
          gross_pay: Math.round(grossPay * 100) / 100,
          deductions: deductions,
          net_pay: Math.round(netPay * 100) / 100,
          has_profile: !!profile,
          is_manually_adjusted: false
        });
      });

      employeePayments.sort((a, b) => {
        const nameA = a.user?.nickname || a.user?.full_name || '';
        const nameB = b.user?.nickname || b.user?.full_name || '';
        return nameA.localeCompare(nameB);
      });

      setCalculatedData({
        employee_payments: employeePayments,
        total_payroll_cost: Math.round(totalPayrollCost * 100) / 100,
        total_gross_pay: Math.round((totalPayrollCost + totalDeductions) * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        employee_count: employeePayments.length,
        period_timesheets: periodTimesheets.length
      });

      toast.success(`Calculated payroll for ${employeePayments.length} employees`);

    } catch (error) {
      console.error('Failed to calculate payroll:', error);
      toast.error('Failed to calculate payroll');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleManualAdjustment = (employeeId, field, value) => {
    setManualAdjustments(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));

    // Recalcular pagos con ajuste manual
    setCalculatedData(prev => {
      if (!prev) return null; // Defensive check
      const updatedPayments = prev.employee_payments.map(payment => {
        if (payment.employee_id === employeeId) {
          const currentAdjustments = manualAdjustments[employeeId] || {};
          const adjustments = { ...currentAdjustments, [field]: value }; // Apply new adjustment

          let newGrossPay = payment.gross_pay; // Default value before recalculation
          let newRegularPay = payment.regular_pay;
          let newOvertimePay = payment.overtime_pay;
          
          if (field === 'regular_hours' || field === 'overtime_hours_paid') {
            const regularHours = adjustments.regular_hours !== undefined 
              ? parseFloat(adjustments.regular_hours) 
              : payment.hours_data.regular_hours;
            const overtimeHoursPaid = adjustments.overtime_hours_paid !== undefined
              ? parseFloat(adjustments.overtime_hours_paid) 
              : payment.hours_data.overtime_hours_paid;
            
            // Recalculate for both Hourly and Salary types
            const ordinaryHourlyRate = payment.profile?.ordinary_hourly_rate || 0;
            const overtimeHourlyRate = payment.profile?.overtime_hourly_rate || (ordinaryHourlyRate * 1.5);
            
            if (payment.profile?.pay_type === 'Hourly') {
              newRegularPay = regularHours * ordinaryHourlyRate;
              newOvertimePay = overtimeHoursPaid * overtimeHourlyRate;
            } else {
              // For Salary type: keep base salary, only add overtime pay
              newRegularPay = payment.profile?.monthly_basic_salary || 0;
              newOvertimePay = overtimeHoursPaid * overtimeHourlyRate;
            }
            
            // Calculate extras (additional earnings)
            const salaryItems = payment.profile?.salary_items || [];
            const extrasPay = salaryItems
              .filter(item => item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements'))
              .reduce((sum, item) => sum + (item.amount || 0), 0);
            
            // Don't subtract deductions from gross pay - they're applied separately
            newGrossPay = newRegularPay + newOvertimePay + extrasPay;
          } else if (field === 'gross_pay') {
            newGrossPay = parseFloat(value);
          }

          // Recalcular deducciones con nuevo gross pay
          const newDeductions = calculateDeductions(newGrossPay, payment.profile);
          const newNetPay = newGrossPay - newDeductions.total;

          // Also update the hours_data to reflect manual changes for display
          const updatedHoursData = { ...payment.hours_data };
          if (field === 'regular_hours') updatedHoursData.regular_hours = parseFloat(value);
          if (field === 'overtime_hours_paid') updatedHoursData.overtime_hours_paid = parseFloat(value);
          
          // Recalculate extras_pay based on the new gross pay
          const newExtrasPay = newGrossPay - newRegularPay - newOvertimePay;
          
          return {
            ...payment,
            hours_data: updatedHoursData,
            regular_pay: Math.round(newRegularPay * 100) / 100,
            overtime_pay: Math.round(newOvertimePay * 100) / 100,
            extras_pay: Math.round(newExtrasPay * 100) / 100,
            gross_pay: Math.round(newGrossPay * 100) / 100,
            deductions: newDeductions,
            net_pay: Math.round(newNetPay * 100) / 100,
            is_manually_adjusted: true
          };
        }
        return payment;
      });

      // Recalcular totales
      const newTotalGross = updatedPayments.reduce((sum, p) => sum + p.gross_pay, 0);
      const newTotalDeductions = updatedPayments.reduce((sum, p) => sum + p.deductions.total, 0);
      const newTotalNet = updatedPayments.reduce((sum, p) => sum + p.net_pay, 0);

      return {
        ...prev,
        employee_payments: updatedPayments,
        total_gross_pay: Math.round(newTotalGross * 100) / 100,
        total_deductions: Math.round(newTotalDeductions * 100) / 100,
        total_payroll_cost: Math.round(newTotalNet * 100) / 100
      };
    });
  };

  const handleSubmit = async () => {
    if (!runData.period_start_date || !runData.period_end_date || !runData.pay_date) {
      toast.error("Please fill all date fields.");
      return;
    }

    if (!calculatedData) {
      toast.error("Please calculate payroll first");
      return;
    }

    setIsSaving(true);
    try {
      // Filter out excluded employees from the final data
      const includedPayments = calculatedData.employee_payments.filter(
        p => !excludedEmployees.has(p.employee_id)
      );
      
      // Recalculate totals with only included employees
      const finalTotalGross = includedPayments.reduce((sum, p) => sum + p.gross_pay, 0);
      const finalTotalDeductions = includedPayments.reduce((sum, p) => sum + p.deductions.total, 0);
      const finalTotalNet = includedPayments.reduce((sum, p) => sum + p.net_pay, 0);
      const totalOtherPayments = otherPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const payrollRunData = {
        ...runData,
        total_payroll_cost: Math.round((finalTotalNet + totalOtherPayments) * 100) / 100,
        total_gross_pay: Math.round(finalTotalGross * 100) / 100,
        total_deductions: Math.round(finalTotalDeductions * 100) / 100,
        employee_payments_total: Math.round(finalTotalNet * 100) / 100,
        other_payments: Math.round(totalOtherPayments * 100) / 100,
        other_payments_details: otherPayments,
        employee_count: includedPayments.length,
        status: 'Processing',
        employee_payments_snapshot: includedPayments
      };

      // Guardar el payroll run
      const savedRun = await onSave(payrollRunData);

      // Generar PayStubs automáticamente (only for included employees)
      if (savedRun && savedRun.id) {
        const payStubPromises = includedPayments.map(payment => {
          console.log('💾 Creating PayStub with hours_data:', {
            employee: payment.user?.nickname || payment.user?.full_name,
            hours_data: payment.hours_data,
            overtime_hours_paid: payment.hours_data?.overtime_hours_paid,
            overtime_hourly_rate: payment.profile?.overtime_hourly_rate,
            overtime_pay: payment.overtime_pay
          });
          
          // Build detailed earnings breakdown
          const earningsBreakdown = [];
          
          // Add Basic Salary
          if (payment.regular_pay > 0) {
            earningsBreakdown.push({
              pay_item_id: null,
              pay_item_name: 'Basic Salary',
              qty: 1.00,
              rate: payment.regular_pay,
              amount: payment.regular_pay,
              account: 'Wages and Salaries - Operations',
              category: 'Earnings',
              subcategory: 'Base Pay'
            });
          }
          
          // Add Overtime Pay if present
          if (payment.overtime_pay > 0) {
            earningsBreakdown.push({
              pay_item_id: null,
              pay_item_name: 'Overtime Pay',
              qty: payment.hours_data.overtime_hours_paid,
              rate: payment.profile?.overtime_hourly_rate || 0,
              amount: payment.overtime_pay,
              account: 'Wages and Salaries - Overtime',
              category: 'Earnings',
              subcategory: 'Overtime'
            });
          }
          
          // Add all active recurring pay items from profile (Earnings and Reimbursements)
          const salaryItems = payment.profile?.salary_items || [];
          salaryItems.forEach(item => {
            if (item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements')) {
              earningsBreakdown.push({
                pay_item_id: item.pay_item_id || null,
                pay_item_name: item.pay_item_name || 'Allowance',
                qty: 1.00,
                rate: item.amount || 0,
                amount: item.amount || 0,
                account: '',
                category: item.category || 'Earnings',
                subcategory: ''
              });
            }
          });
          
          // Build detailed deductions breakdown
          const deductionsBreakdown = [];
          salaryItems.forEach(item => {
            if (item.is_active && item.category === 'Deductions') {
              deductionsBreakdown.push({
                pay_item_id: item.pay_item_id || null,
                pay_item_name: item.pay_item_name || 'Deduction',
                qty: 1.00,
                rate: item.amount || 0,
                amount: item.amount || 0,
                account: '',
                category: 'Deductions',
                subcategory: ''
              });
            }
          });
          
          return PayStub.create({
            payroll_run_id: savedRun.id,
            employee_id: payment.employee_id,
            gross_pay: payment.gross_pay,
            deductions: payment.deductions.total,
            net_pay: payment.net_pay,
            status: 'Pending',
            data_snapshot: {
              hours_data: payment.hours_data,
              regular_pay: payment.regular_pay,
              overtime_pay: payment.overtime_pay,
              extras_pay: payment.extras_pay,
              overtime_hours: payment.hours_data.overtime_hours_paid,
              overtime_hourly_rate: payment.profile?.overtime_hourly_rate || 0,
              basic_salary: payment.profile?.monthly_basic_salary || 0,
              salary_items: payment.profile?.salary_items || [],
              earnings_breakdown: earningsBreakdown,
              deductions_breakdown: deductionsBreakdown,
              is_manually_adjusted: payment.is_manually_adjusted
            }
          });
        });

        await Promise.all(payStubPromises);
        console.log(`✅ Generated ${payStubPromises.length} pay stubs`);
        
        // Incrementar el contador de payrun number (only for new runs, not existing ones)
        if (!run) {
          const settings = await AppSettings.filter({ setting_key: 'payroll_payrun_next_number' });
          if (settings.length > 0) {
            const currentNumber = parseInt(settings[0].setting_value) || 1;
            await AppSettings.update(settings[0].id, {
              setting_value: (currentNumber + 1).toString()
            });
          } else {
            // Create the setting if it doesn't exist (start at 2 since we just used 1)
            await AppSettings.create({
              setting_key: 'payroll_payrun_next_number',
              setting_value: '2'
            });
          }
        }
      }

      toast.success('Payroll run created successfully with pay stubs');
      onClose();

    } catch (error) {
      console.error('Failed to save payroll run:', error);
      toast.error('Failed to save payroll run');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!calculatedData) {
        calculatePayroll();
      } else {
        handleSubmit();
      }
    }
  };

  const handleUpdateDraftRun = async () => {
    if (!runData.period_start_date || !runData.period_end_date || !runData.pay_date) {
      toast.error("Please fill all date fields.");
      return;
    }

    setIsSaving(true);
    try {
      const totalOtherPayments = otherPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const currentEmployeePayments = run.employee_payments_total || run.total_payroll_cost - (run.other_payments || 0);
      
      await onSave({
        period_start_date: runData.period_start_date,
        period_end_date: runData.period_end_date,
        pay_date: runData.pay_date,
        other_payments: Math.round(totalOtherPayments * 100) / 100,
        other_payments_details: otherPayments,
        total_payroll_cost: Math.round((currentEmployeePayments + totalOtherPayments) * 100) / 100
      });
      toast.success('Payroll run updated');
      onClose();
    } catch (error) {
      console.error('Failed to update payroll run:', error);
      toast.error('Failed to update payroll run');
    } finally {
      setIsSaving(false);
    }
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return { year: d.getUTCFullYear(), week: weekNo };
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const sortedPayments = useMemo(() => {
    if (!calculatedData?.employee_payments) return [];
    
    const payments = [...calculatedData.employee_payments];
    
    return payments.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortColumn) {
        case 'name':
          aVal = (a.user?.nickname || a.user?.full_name || '').toLowerCase();
          bVal = (b.user?.nickname || b.user?.full_name || '').toLowerCase();
          break;
        case 'basic':
          aVal = a.regular_pay || 0;
          bVal = b.regular_pay || 0;
          break;
        case 'ot':
          aVal = a.overtime_pay || 0;
          bVal = b.overtime_pay || 0;
          break;
        case 'extras':
          aVal = a.extras_pay || 0;
          bVal = b.extras_pay || 0;
          break;
        case 'gross':
          aVal = a.gross_pay || 0;
          bVal = b.gross_pay || 0;
          break;
        case 'deductions':
          aVal = a.deductions?.total || 0;
          bVal = b.deductions?.total || 0;
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
  }, [calculatedData?.employee_payments, sortColumn, sortOrder]);

  const SortButton = ({ column, children }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-slate-900"
    >
      {children}
      {sortColumn === column && (
        <span className="text-blue-600">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {run ? 'Edit Payroll Run' : 'New Payroll Run'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Quick Period Selection */}
          {!run && (
            <div className="bg-slate-50 rounded-lg p-4 border">
              <Label className="text-sm font-medium mb-3 block">Quick Period Selection</Label>
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Period Type</Label>
                  <Select value={periodType} onValueChange={setPeriodType}>
                    <SelectTrigger>
                      <SelectValue>
                        {periodType === 'month' && 'Monthly'}
                        {periodType === 'week' && 'Weekly'}
                        {periodType === 'custom' && 'Custom'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="custom">Custom Dates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {periodType === 'month' && (
                  <div>
                    <Label className="text-xs text-slate-500">Month</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue>
                          {selectedMonth !== '' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(selectedMonth)] : 'Select'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">January</SelectItem>
                        <SelectItem value="1">February</SelectItem>
                        <SelectItem value="2">March</SelectItem>
                        <SelectItem value="3">April</SelectItem>
                        <SelectItem value="4">May</SelectItem>
                        <SelectItem value="5">June</SelectItem>
                        <SelectItem value="6">July</SelectItem>
                        <SelectItem value="7">August</SelectItem>
                        <SelectItem value="8">September</SelectItem>
                        <SelectItem value="9">October</SelectItem>
                        <SelectItem value="10">November</SelectItem>
                        <SelectItem value="11">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {periodType === 'week' && (
                  <div>
                    <Label className="text-xs text-slate-500">Week #</Label>
                    <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                      <SelectTrigger>
                        <SelectValue>
                          {selectedWeek ? `Week ${selectedWeek}` : 'Select'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 52 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>Week {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {periodType !== 'custom' && (
                  <div>
                    <Label className="text-xs text-slate-500">Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue>{selectedYear || 'Select'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs text-slate-500">Pay Offset (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={payDateOffset}
                    onChange={(e) => setPayDateOffset(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Payrun #</Label>
                  <Input 
                    type="text" 
                    value={runData.payrun_number} 
                    readOnly
                    className="font-medium text-gray-700 bg-white cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Date Fields */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period_start_date">Period Start</Label>
              <Input 
                id="period_start_date" 
                type="date" 
                value={runData.period_start_date} 
                onChange={(e) => handleChange('period_start_date', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={run && run.status === 'Paid'}
              />
            </div>
            <div>
              <Label htmlFor="period_end_date">Period End</Label>
              <Input 
                id="period_end_date" 
                type="date" 
                value={runData.period_end_date} 
                onChange={(e) => handleChange('period_end_date', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={run && run.status === 'Paid'}
              />
            </div>
            <div>
              <Label htmlFor="pay_date">Pay Date</Label>
              <Input 
                id="pay_date" 
                type="date" 
                value={runData.pay_date} 
                onChange={(e) => handleChange('pay_date', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={run && run.status === 'Paid'}
              />
            </div>
            {run && (
              <div>
                <Label htmlFor="payrun_number">Payrun Number</Label>
                <Input 
                  id="payrun_number" 
                  type="text" 
                  value={runData.payrun_number} 
                  readOnly
                  disabled
                  className="font-medium text-gray-700 bg-gray-50 cursor-not-allowed"
                />
              </div>
            )}
          </div>

          {/* Employee Type Filter */}
          {!run && (
            <div className="bg-slate-50 rounded-lg p-4 border">
              <Label className="text-sm font-medium mb-3 block">Employee Selection</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 relative">
                  <Label className="text-xs text-slate-500">Include:</Label>
                  <Select value={employeeTypeFilter} onValueChange={setEmployeeTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue>
                        {employeeTypeFilter === 'all' && 'All Employees'}
                        {employeeTypeFilter === 'field' && 'Field Workers Only'}
                        {employeeTypeFilter === 'office' && 'Office Staff Only'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="field">Field Workers Only</SelectItem>
                      <SelectItem value="office">Office Staff Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {excludedEmployees.size > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    <UserMinus className="w-3 h-3 mr-1" />
                    {excludedEmployees.size} excluded
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Calculate Button */}
          {!run && runData.period_start_date && runData.period_end_date && !calculatedData && (
            <Button 
              onClick={calculatePayroll} 
              disabled={isCalculating}
              className="w-full"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Calculate Payroll
                </>
              )}
            </Button>
          )}

          {/* Other Payments Section - Always visible */}
          {(calculatedData || run) && (
            <div className="border rounded-lg p-4 bg-slate-50">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium">Other Payments</Label>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setOtherPayments([...otherPayments, { recipient: '', reason: '', amount: 0 }])}
                  disabled={run && run.status === 'Paid'}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Payment
                </Button>
              </div>
              {otherPayments.length > 0 ? (
                <div className="space-y-2">
                  {otherPayments.map((payment, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border">
                      <Input
                        placeholder="Recipient"
                        value={payment.recipient}
                        onChange={(e) => {
                          const updated = [...otherPayments];
                          updated[idx].recipient = e.target.value;
                          setOtherPayments(updated);
                        }}
                        className="col-span-4 h-8 text-xs"
                        disabled={run && run.status === 'Paid'}
                      />
                      <Input
                        placeholder="Reason/Concept"
                        value={payment.reason}
                        onChange={(e) => {
                          const updated = [...otherPayments];
                          updated[idx].reason = e.target.value;
                          setOtherPayments(updated);
                        }}
                        className="col-span-5 h-8 text-xs"
                        disabled={run && run.status === 'Paid'}
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={payment.amount}
                        onChange={(e) => {
                          const updated = [...otherPayments];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setOtherPayments(updated);
                        }}
                        className="col-span-2 h-8 text-xs"
                        disabled={run && run.status === 'Paid'}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOtherPayments(otherPayments.filter((_, i) => i !== idx))}
                        className="col-span-1 h-8 w-8 p-0"
                        disabled={run && run.status === 'Paid'}
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">No other payments added</p>
              )}
            </div>
          )}

          {/* Summary - Compact */}
          {calculatedData && (
            <>
              <div className="flex items-center gap-6 text-sm border-b pb-3">
                <div><span className="text-slate-500">Employees:</span> <span className="font-semibold">{calculatedData.employee_count}</span></div>
                <div><span className="text-slate-500">Gross:</span> <span className="font-semibold text-green-700">${calculatedData.total_gross_pay.toLocaleString()}</span></div>
                <div><span className="text-slate-500">Deductions:</span> <span className="font-semibold text-red-600">-${calculatedData.total_deductions.toLocaleString()}</span></div>
                <div><span className="text-slate-500">Net:</span> <span className="font-semibold text-blue-700">${calculatedData.total_payroll_cost.toLocaleString()}</span></div>
                <div><span className="text-slate-500">Other:</span> <span className="font-semibold text-purple-700">${otherPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}</span></div>
                <div><span className="text-slate-500">Timesheets:</span> <span className="font-semibold">{calculatedData.period_timesheets}</span></div>
              </div>

              {/* Employee Details - Compact */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-center p-1.5 font-medium text-slate-600 w-8">
                          <Checkbox
                            checked={excludedEmployees.size === 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setExcludedEmployees(new Set());
                              } else {
                                setExcludedEmployees(new Set(sortedPayments.map(p => p.employee_id)));
                              }
                            }}
                          />
                        </th>
                        <th className="text-left p-1.5 font-medium text-slate-600">
                          <SortButton column="name">Employee</SortButton>
                        </th>
                        <th className="text-right p-1.5 font-medium text-slate-600">Reg.H</th>
                        <th className="text-right p-1.5 font-medium text-slate-600">
                          <SortButton column="ot">OT.H</SortButton>
                        </th>
                        <th className="text-right p-1.5 font-medium text-slate-600">
                          <SortButton column="extras">Extras</SortButton>
                        </th>
                        <th className="text-right p-1.5 font-medium text-slate-600">
                          <SortButton column="gross">Gross</SortButton>
                        </th>
                        <th className="text-right p-1.5 font-medium text-slate-600">
                          <SortButton column="deductions">Deduct.</SortButton>
                        </th>
                        <th className="text-right p-1.5 font-medium text-slate-600">
                          <SortButton column="net">Net</SortButton>
                        </th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPayments.map((payment) => {
                        const isEditing = editingEmployeeId === payment.employee_id;
                        const isExcluded = excludedEmployees.has(payment.employee_id);
                        
                        return (
                          <React.Fragment key={payment.employee_id}>
                            <tr 
                              onClick={() => setEditingEmployeeId(isEditing ? null : payment.employee_id)}
                              className={cn(
                                "border-b border-slate-100 hover:bg-slate-50 cursor-pointer",
                                isExcluded && "opacity-40 bg-slate-100",
                                isEditing && "bg-blue-50"
                              )}
                            >
                              <td className="text-center p-1.5" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={!isExcluded}
                                  onCheckedChange={(checked) => {
                                    setExcludedEmployees(prev => {
                                      const newSet = new Set(prev);
                                      if (checked) newSet.delete(payment.employee_id);
                                      else newSet.add(payment.employee_id);
                                      return newSet;
                                    });
                                  }}
                                />
                              </td>
                              <td className="p-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Avatar user={payment.user} size="xs" />
                                  <span className="font-medium truncate max-w-[120px]">
                                    {payment.user?.nickname || payment.user?.full_name}
                                  </span>
                                  {!payment.has_profile && <span className="text-red-500 text-[9px]">!</span>}
                                </div>
                              </td>
                              <td className="text-right p-1.5 text-slate-600">
                                {payment.hours_data.regular_hours.toFixed(1)}h
                              </td>
                              <td className="text-right p-1.5 text-orange-600">
                                {payment.hours_data.overtime_hours_paid > 0 ? `${payment.hours_data.overtime_hours_paid.toFixed(1)}h` : '-'}
                              </td>
                              <td className="text-right p-1.5 text-purple-600">
                                {payment.extras_pay > 0 ? `$${payment.extras_pay.toLocaleString()}` : '-'}
                              </td>
                              <td className="text-right p-1.5 font-medium">
                                ${payment.gross_pay.toLocaleString()}
                              </td>
                              <td className="text-right p-1.5 text-red-600">
                                -${payment.deductions.total.toLocaleString()}
                              </td>
                              <td className="text-right p-1.5 font-semibold text-green-700">
                                ${payment.net_pay.toLocaleString()}
                              </td>
                              <td className="p-1.5">
                                <Edit className={cn("w-3 h-3", isEditing ? "text-blue-600" : "text-slate-400")} />
                              </td>
                            </tr>
                            {isEditing && (
                              <tr className="bg-blue-50 border-b border-blue-200">
                                <td colSpan={9} className="p-3">
                                  <div className="grid grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <Label className="text-[10px] text-slate-500">Regular Hours</Label>
                                      <Input
                                        type="number"
                                        step="0.5"
                                        value={payment.hours_data.regular_hours}
                                        onChange={(e) => handleManualAdjustment(payment.employee_id, 'regular_hours', e.target.value)}
                                        className="h-7 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500">Overtime Hours</Label>
                                      <Input
                                        type="number"
                                        step="0.5"
                                        value={payment.hours_data.overtime_hours_paid}
                                        onChange={(e) => handleManualAdjustment(payment.employee_id, 'overtime_hours_paid', e.target.value)}
                                        className="h-7 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500">Gross Pay Override</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={payment.gross_pay}
                                        onChange={(e) => handleManualAdjustment(payment.employee_id, 'gross_pay', e.target.value)}
                                        className="h-7 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-7 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingEmployeeId(null);
                                        }}
                                      >
                                        Done
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-[9px] text-slate-500 mt-2">
                                    💡 Adjust hours to recalculate, or use "Gross Pay Override" to set pay directly
                                  </p>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          {run && (
            <Button onClick={handleUpdateDraftRun} disabled={isSaving || run.status === 'Paid'}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Payroll Run'
              )}
            </Button>
          )}
          {calculatedData && !run && (
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Create Payroll Run & Generate Pay Stubs'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}