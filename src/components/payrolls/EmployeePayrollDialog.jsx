import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, DollarSign, Info, CheckCircle, TrendingUp, Calculator, Plus, Trash2, Clock, CalendarDays, Briefcase, Home } from 'lucide-react';
import { format } from 'date-fns';
import Avatar from '../Avatar';
import { useData } from '../DataProvider';
import { PayStub, AppSettings, PayItem, PayItemType } from '@/entities/all';

export default function EmployeePayrollDialog({
  isOpen = false,
  profile,
  users = [],
  onSave,
  onClose
}) {
  const { currentUser } = useData();
  const [formData, setFormData] = useState({
    employee_id: '',
    monthly_basic_salary: 0,
    annual_salary: 0,
    ordinary_hourly_rate: 0,
    overtime_hourly_rate: 0,
    standard_working_hours_per_day: 8,
    standard_working_days_per_month: 22,
    salary_items: [],
    leave_tracking_enabled: true,
    overtime_tracking_enabled: true,
    payment_method: 'Direct Deposit',
    bank_name: '',
    routing_number: '',
    account_number: '',
    iban: '',
    swift_code: '',
    tax_filing_status: '',
    tax_allowances: 0,
    change_history: []
  });
  const [showHistory, setShowHistory] = useState(false);
  const [recentPayStubs, setRecentPayStubs] = useState([]);
  const [loadingPayStubs, setLoadingPayStubs] = useState(false);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);
  const [payItems, setPayItems] = useState([]);
  const [payItemTypes, setPayItemTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('salary');

  // Load overtime multiplier from settings and pay items
  useEffect(() => {
    if (isOpen) {
      // Load settings
      AppSettings.list('id', 1)
        .then(settings => {
          if (settings && settings.length > 0 && settings[0].overtime_multiplier) {
            setOvertimeMultiplier(settings[0].overtime_multiplier);
          }
        })
        .catch(err => {
          console.warn('Failed to load settings, using default overtime multiplier 1.5:', err);
        });

      // Load pay items and types
      Promise.all([
        PayItem.list('sort_order', 1000),
        PayItemType.list('sort_order', 1000)
      ]).then(([items, types]) => {
        setPayItems(items.filter(i => i.is_active !== false));
        setPayItemTypes(types.filter(t => t.is_active !== false));
      }).catch(err => {
        console.error('Failed to load pay items:', err);
      });
    }
  }, [isOpen]);

  // Load recent pay stubs for this employee
  useEffect(() => {
    if (profile?.employee_id && isOpen) {
      setLoadingPayStubs(true);
      PayStub.filter({ employee_id: profile.employee_id }, '-created_date', 5)
        .then(stubs => {
          setRecentPayStubs(stubs || []);
        })
        .catch(err => {
          console.error('Failed to load pay stubs:', err);
          setRecentPayStubs([]);
        })
        .finally(() => {
          setLoadingPayStubs(false);
        });
    }
  }, [profile?.employee_id, isOpen]);

  // Calculate average monthly salary
  const salaryAverages = useMemo(() => {
    if (!recentPayStubs || recentPayStubs.length === 0) {
      return {
        withExtraTime: 0,
        withoutExtraTime: 0,
        count: 0
      };
    }

    let totalWithExtra = 0;
    let totalWithoutExtra = 0;
    let count = 0;

    recentPayStubs.forEach(stub => {
      if (stub.net_pay) {
        totalWithExtra += stub.net_pay;
        count++;

        const dataSnapshot = stub.data_snapshot || {};
        const overtimePay = dataSnapshot.overtime_pay || 0;
        const grossWithoutOvertime = (stub.gross_pay || 0) - overtimePay;
        
        const deductionRatio = stub.gross_pay > 0 ? (stub.deductions || 0) / stub.gross_pay : 0;
        const netWithoutOvertime = grossWithoutOvertime - (grossWithoutOvertime * deductionRatio);
        
        totalWithoutExtra += netWithoutOvertime;
      }
    });

    return {
      withExtraTime: count > 0 ? totalWithExtra / count : 0,
      withoutExtraTime: count > 0 ? totalWithoutExtra / count : 0,
      count
    };
  }, [recentPayStubs]);

  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
        salary_items: profile.salary_items || [],
        standard_working_hours_per_day: profile.standard_working_hours_per_day || 8,
        standard_working_days_per_month: profile.standard_working_days_per_month || 22,
        leave_tracking_enabled: profile.leave_tracking_enabled !== false,
        overtime_tracking_enabled: profile.overtime_tracking_enabled !== false,
        iban: profile.iban || '',
        swift_code: profile.swift_code || '',
        change_history: profile.change_history || []
      });
    } else {
      setFormData({
        employee_id: '',
        monthly_basic_salary: 0,
        annual_salary: 0,
        ordinary_hourly_rate: 0,
        overtime_hourly_rate: 0,
        standard_working_hours_per_day: 8,
        standard_working_days_per_month: 22,
        salary_items: [],
        leave_tracking_enabled: true,
        overtime_tracking_enabled: true,
        payment_method: 'Direct Deposit',
        bank_name: '',
        routing_number: '',
        account_number: '',
        iban: '',
        swift_code: '',
        tax_filing_status: '',
        tax_allowances: 0,
        change_history: []
      });
    }
    setShowHistory(false);
    setActiveTab('salary');
  }, [profile]);

  const selectedUser = users.find(u => u.id === formData.employee_id);

  // Helper to get pay item category
  const getPayItemCategory = (payItemId) => {
    const item = payItems.find(i => i.id === payItemId);
    if (!item) return 'Earnings';
    const type = payItemTypes.find(t => t.id === item.pay_item_type_id);
    return type?.category || 'Earnings';
  };

  // Add salary item
  const handleAddSalaryItem = () => {
    setFormData(prev => ({
      ...prev,
      salary_items: [
        ...prev.salary_items,
        {
          pay_item_id: '',
          pay_item_name: '',
          category: 'Earnings',
          amount: 0,
          calculation_type: 'fixed',
          is_active: true
        }
      ]
    }));
  };

  // Update salary item
  const handleUpdateSalaryItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.salary_items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // If pay_item_id changed, update name and category
      if (field === 'pay_item_id') {
        const selectedItem = payItems.find(i => i.id === value);
        if (selectedItem) {
          newItems[index].pay_item_name = selectedItem.name;
          newItems[index].category = getPayItemCategory(value);
        }
      }
      
      return { ...prev, salary_items: newItems };
    });
  };

  // Remove salary item
  const handleRemoveSalaryItem = (index) => {
    setFormData(prev => ({
      ...prev,
      salary_items: prev.salary_items.filter((_, i) => i !== index)
    }));
  };

  // Calculate totals from salary items
  const salaryItemsTotals = useMemo(() => {
    const items = formData.salary_items || [];
    const earnings = items
      .filter(i => i.is_active && (i.category === 'Earnings' || i.category === 'Reimbursements'))
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const deductions = items
      .filter(i => i.is_active && i.category === 'Deductions')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    return { earnings, deductions, net: earnings - deductions };
  }, [formData.salary_items]);

  // Auto-calculate all rates when monthly salary or overtime multiplier changes
  useEffect(() => {
    const monthly = formData.monthly_basic_salary || 0;
    const annual = monthly * 12;
    const ordinaryHourly = annual / 2080; // 52 weeks × 40 hours
    const overtimeHourly = ordinaryHourly * overtimeMultiplier;

    setFormData(prev => ({
      ...prev,
      annual_salary: annual,
      ordinary_hourly_rate: ordinaryHourly,
      overtime_hourly_rate: overtimeHourly
    }));
  }, [formData.monthly_basic_salary, overtimeMultiplier]);

  const handleSave = () => {
    if (!formData.employee_id) {
      alert('Please select an employee');
      return;
    }

    if (!formData.monthly_basic_salary || formData.monthly_basic_salary <= 0) {
      alert('Please enter a valid monthly salary');
      return;
    }

    const changes = [];
    const now = new Date().toISOString();
    const userName = currentUser?.full_name || currentUser?.email || 'Unknown';
    const userEmail = currentUser?.email || '';

    if (profile) {
      const changedFields = [];
      if (profile.monthly_basic_salary !== formData.monthly_basic_salary) {
        changedFields.push(`Monthly salary changed from $${profile.monthly_basic_salary || 0} to $${formData.monthly_basic_salary || 0}`);
      }
      if (profile.payment_method !== formData.payment_method) {
        changedFields.push(`Payment method changed from ${profile.payment_method} to ${formData.payment_method}`);
      }
      if (profile.bank_name !== formData.bank_name) {
        changedFields.push(`Bank name changed from ${profile.bank_name || 'empty'} to ${formData.bank_name || 'empty'}`);
      }
      if (profile.routing_number !== formData.routing_number) {
        changedFields.push(`Routing number changed.`);
      }
      if (profile.account_number !== formData.account_number) {
        changedFields.push(`Account number changed.`);
      }
      if (profile.tax_filing_status !== formData.tax_filing_status) {
        changedFields.push(`Tax filing status changed from ${profile.tax_filing_status || 'empty'} to ${formData.tax_filing_status || 'empty'}`);
      }
      if (profile.tax_allowances !== formData.tax_allowances) {
        changedFields.push(`Tax allowances changed from ${profile.tax_allowances || 0} to ${formData.tax_allowances || 0}`);
      }

      if (changedFields.length > 0) {
        changes.push({
          change_type: 'Edited',
          date: now,
          user_email: userEmail,
          user_name: userName,
          details: changedFields.join('. '),
          changes: {
            old: profile,
            new: formData
          }
        });
      }
    } else {
      changes.push({
        change_type: 'Created',
        date: now,
        user_email: userEmail,
        user_name: userName,
        details: `${selectedUser?.nickname || selectedUser?.full_name || 'Employee'} payroll profile has been created.`,
        changes: {}
      });
    }

    const updatedData = {
      ...formData,
      change_history: [...(formData.change_history || []), ...changes]
    };

    onSave(updatedData);
  };

  const latestChange = formData.change_history && formData.change_history.length > 0 
    ? formData.change_history[formData.change_history.length - 1] 
    : null;

  const sortedHistory = [...(formData.change_history || [])].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[700px] flex flex-col p-0 overflow-y-auto">
        <SheetHeader className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <SheetTitle>
              {profile ? 'Edit Employee Profile' : 'New Employee Profile'}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Employee Selection & Worker Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Employee <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                disabled={!!profile}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee">
                    {selectedUser && (
                      <div className="flex items-center gap-2">
                        <Avatar user={selectedUser} size="xs" />
                        <span>{selectedUser.nickname || selectedUser.full_name || selectedUser.email}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar user={user} size="xs" />
                        <span>{user.nickname || user.full_name || user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Worker Type
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border">
                {selectedUser?.worker_type === 'office' ? (
                  <>
                    <Home className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Office Worker</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-slate-700">Field Worker</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Edit in Users or Team Management</p>
            </div>
          </div>

          {/* Salary Averages - Show for existing profiles */}
          {profile && salaryAverages.count > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div className="flex-1 flex items-center gap-4 text-xs">
                  <span className="text-indigo-900 font-medium">Avg. Monthly:</span>
                  <span className="text-indigo-800">With OT: ${salaryAverages.withExtraTime.toFixed(2)}</span>
                  <span className="text-indigo-800">Without OT: ${salaryAverages.withoutExtraTime.toFixed(2)}</span>
                  <span className="text-indigo-600">({salaryAverages.count} periods)</span>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sticky top-0 z-20 bg-white">
              <TabsTrigger value="salary">Salary & Pay Items</TabsTrigger>
              <TabsTrigger value="work">Work Settings</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>

            {/* Salary & Pay Items Tab */}
            <TabsContent value="salary" className="space-y-4 mt-4">
              {/* Monthly Basic Salary */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Monthly Basic Salary <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthly_basic_salary}
                    onChange={(e) => setFormData({ ...formData, monthly_basic_salary: parseFloat(e.target.value) || 0 })}
                    className="pl-9 text-lg font-semibold"
                    placeholder="Enter monthly basic salary"
                  />
                </div>
              </div>

              {/* Calculated Values */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 text-slate-600" />
                  <h4 className="text-sm font-semibold text-slate-900">Auto-Calculated Values</h4>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Annual Salary</Label>
                    <div className="text-base font-semibold text-slate-900">
                      ${formData.annual_salary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-slate-500">Monthly × 12</p>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Ordinary Hourly</Label>
                    <div className="text-base font-semibold text-slate-900">
                      ${formData.ordinary_hourly_rate.toFixed(2)}/hr
                    </div>
                    <p className="text-xs text-slate-500">Annual ÷ 2080h</p>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Overtime Hourly</Label>
                    <div className="text-base font-semibold text-green-700">
                      ${formData.overtime_hourly_rate.toFixed(2)}/hr
                    </div>
                    <p className="text-xs text-slate-500">× {overtimeMultiplier}x</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Recurring Pay Items Section */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Recurring Pay Items</h4>
                  <p className="text-xs text-slate-500">These items will be pre-loaded in each payroll run</p>
                </div>
                <Button onClick={handleAddSalaryItem} size="sm" variant="outline" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-700">Category</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-700">Pay Item</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-700 w-24">Type</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-700 w-28">Amount</th>
                      <th className="text-center px-3 py-2 font-medium text-slate-700 w-14">Active</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Basic Salary - Fixed first row */}
                    <tr className="border-b bg-indigo-50/50">
                      <td className="px-3 py-2">
                        <span className="text-sm font-medium text-slate-700">Earnings</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm font-medium text-indigo-700">Basic Salary</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm text-slate-600">Fixed</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          ${(formData.monthly_basic_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                      </td>
                      <td className="px-2 py-2"></td>
                    </tr>

                    {/* Additional salary items */}
                    {formData.salary_items.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Select
                            value={item.category || 'Earnings'}
                            onValueChange={(value) => {
                              handleUpdateSalaryItem(index, 'category', value);
                              handleUpdateSalaryItem(index, 'pay_item_id', '');
                              handleUpdateSalaryItem(index, 'pay_item_name', '');
                            }}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue>
                                {item.category || 'Earnings'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="z-[9999]" side="top">
                              <SelectItem value="Earnings">Earnings</SelectItem>
                              <SelectItem value="Deductions">Deductions</SelectItem>
                              <SelectItem value="Employer Contributions">Employer Contrib.</SelectItem>
                              <SelectItem value="Reimbursements">Reimbursements</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={item.pay_item_id || ''}
                            onValueChange={(value) => handleUpdateSalaryItem(index, 'pay_item_id', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue>
                                {item.pay_item_name || 'Select pay item'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="z-[9999] max-h-60" side="top">
                              {payItems
                                .filter(pi => getPayItemCategory(pi.id) === (item.category || 'Earnings'))
                                .map(pi => (
                                  <SelectItem key={pi.id} value={pi.id}>
                                    {pi.name}
                                  </SelectItem>
                                ))
                              }
                              {payItems.filter(pi => getPayItemCategory(pi.id) === (item.category || 'Earnings')).length === 0 && (
                                <div className="px-2 py-1.5 text-xs text-slate-500 italic">
                                  No items in this category
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={item.calculation_type || 'fixed'}
                            onValueChange={(value) => handleUpdateSalaryItem(index, 'calculation_type', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue>
                                {item.calculation_type === 'fixed' && 'Fixed'}
                                {item.calculation_type === 'per_hour' && 'Per Hour'}
                                {item.calculation_type === 'per_day' && 'Per Day'}
                                {item.calculation_type === 'percentage' && '%'}
                                {!item.calculation_type && 'Fixed'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="z-[9999]" side="top">
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="per_hour">Per Hour</SelectItem>
                              <SelectItem value="per_day">Per Day</SelectItem>
                              <SelectItem value="percentage">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.amount || 0}
                            onChange={(e) => handleUpdateSalaryItem(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Switch
                            checked={item.is_active !== false}
                            onCheckedChange={(checked) => handleUpdateSalaryItem(index, 'is_active', checked)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSalaryItem(index)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pay Items Summary - Include basic salary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Earnings:</span>
                    <span className="font-semibold text-green-700 ml-2">
                      +${((formData.monthly_basic_salary || 0) + salaryItemsTotals.earnings).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Deductions:</span>
                    <span className="font-semibold text-red-600 ml-2">
                      -${salaryItemsTotals.deductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Net:</span>
                    <span className="font-semibold text-blue-900 ml-2">
                      ${((formData.monthly_basic_salary || 0) + salaryItemsTotals.net).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">How pay items work:</p>
                    <p>Items configured here will be automatically loaded when creating a payroll run. You can still edit amounts in each individual payslip.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Work Settings Tab */}
            <TabsContent value="work" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Working Hours/Day
                  </Label>
                  <Input
                    type="number"
                    value={formData.standard_working_hours_per_day}
                    onChange={(e) => setFormData({ ...formData, standard_working_hours_per_day: parseFloat(e.target.value) || 8 })}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    <CalendarDays className="w-4 h-4 inline mr-1" />
                    Working Days/Month
                  </Label>
                  <Input
                    type="number"
                    value={formData.standard_working_days_per_month}
                    onChange={(e) => setFormData({ ...formData, standard_working_days_per_month: parseInt(e.target.value) || 22 })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900">Automatic Integrations</h4>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Leave Tracking</Label>
                    <p className="text-xs text-slate-500">Auto-calculate days worked from Leave Requests</p>
                  </div>
                  <Switch
                    checked={formData.leave_tracking_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, leave_tracking_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Overtime Tracking</Label>
                    <p className="text-xs text-slate-500">Auto-calculate overtime from Time Tracker</p>
                  </div>
                  <Switch
                    checked={formData.overtime_tracking_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, overtime_tracking_enabled: checked })}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">How integrations work:</p>
                    <p>When enabled, the system will automatically calculate worked days (minus approved leaves) and overtime hours (from time tracker entries) when generating payroll.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Payment Tab */}
            <TabsContent value="payment" className="space-y-4 mt-4">
              {/* Payment Method */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Payment Method
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct Deposit">Direct Deposit</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bank Details */}
              {(formData.payment_method === 'Direct Deposit' || formData.payment_method === 'Bank Transfer') && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">Bank Name</Label>
                    <Input
                      value={formData.bank_name || ''}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="Bank name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">IBAN</Label>
                      <Input
                        value={formData.iban || ''}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                        placeholder="AE12 3456 7890 1234 5678 901"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">SWIFT/BIC</Label>
                      <Input
                        value={formData.swift_code || ''}
                        onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                        placeholder="ABCDAEXX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">Routing Number</Label>
                      <Input
                        value={formData.routing_number || ''}
                        onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                        placeholder="Routing number"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">Account Number</Label>
                      <Input
                        type="password"
                        value={formData.account_number || ''}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="Account number"
                      />
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Tax Information */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Tax Information</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">Tax Filing Status</Label>
                    <Select
                      value={formData.tax_filing_status || ''}
                      onValueChange={(value) => setFormData({ ...formData, tax_filing_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Head of Household">Head of Household</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">Tax Allowances</Label>
                    <Input
                      type="number"
                      value={formData.tax_allowances || 0}
                      onChange={(e) => setFormData({ ...formData, tax_allowances: parseInt(e.target.value) || 0 })}
                      placeholder="Number of allowances"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* History & Notes */}
          {profile && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">History & Notes</h3>
                </div>

                {latestChange ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-yellow-700 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-yellow-900">
                          {latestChange.change_type} by {latestChange.user_name} on {format(new Date(latestChange.date), 'd MMM yyyy \'at\' h:mma')}
                        </div>
                        <div className="text-sm text-yellow-800 mt-1">
                          {latestChange.details}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3 text-center">
                    <p className="text-sm text-slate-500">No history available yet</p>
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  {formData.change_history && formData.change_history.length > 0 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-blue-600"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      {showHistory ? 'Hide' : 'Show'} History ({formData.change_history.length} entries)
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const note = prompt('Add a note:');
                      if (note) {
                        const newChange = {
                          change_type: 'Note',
                          date: new Date().toISOString(),
                          user_email: currentUser?.email || '',
                          user_name: currentUser?.full_name || currentUser?.email || 'Unknown',
                          details: note,
                          changes: {}
                        };
                        setFormData({
                          ...formData,
                          change_history: [...(formData.change_history || []), newChange]
                        });
                      }
                    }}
                  >
                    Add Note
                  </Button>
                </div>

                {showHistory && formData.change_history && formData.change_history.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-700">Changes</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-700">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-700">User</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-700">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedHistory.map((change, index) => (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="px-3 py-2">{change.change_type}</td>
                            <td className="px-3 py-2 text-slate-600">
                              {format(new Date(change.date), 'd MMM yyyy h:mm a')}
                            </td>
                            <td className="px-3 py-2">{change.user_name}</td>
                            <td className="px-3 py-2 text-slate-600">{change.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="w-4 h-4 mr-2" />
            {profile ? 'Update' : 'Create'} Profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}