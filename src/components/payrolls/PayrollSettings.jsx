import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  DollarSign,
  Calendar,
  Save,
  Percent,
  FileText,
  ImageIcon,
  Upload,
  Pencil,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { AppSettings, Branch } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { useData } from '@/components/DataProvider';
import ImageCropDialog from '@/components/users/ImageCropDialog';
import PayItemsManager from './PayItemsManager';

export default function PayrollSettings({ onRefresh }) {
  const { currentCompany, setCurrentCompany } = useData();
  const [activeTab, setActiveTab] = useState('tax');
  const [isSaving, setIsSaving] = useState(false);
  
  // Tab icon state
  const [payrollTabIconUrl, setPayrollTabIconUrl] = useState(currentCompany?.payroll_tab_icon_url || '');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  // Tax Settings
  const [taxSettings, setTaxSettings] = useState({
    federal_tax_rate: 12,
    state_tax_rate: 5,
    social_security_rate: 6.2,
    medicare_rate: 1.45,
    overtime_multiplier: 1.5
  });

  // Pay Period Settings
  const [payPeriodSettings, setPayPeriodSettings] = useState({
    default_pay_frequency: 'Bi-Weekly',
    overtime_threshold_hours: 40,
    pay_day_of_month: 1,
    pay_delay_days: 0
  });



  // Deduction Templates
  const [deductionTemplates, setDeductionTemplates] = useState({
    health_insurance_default: 0,
    retirement_contribution_default: 0,
    life_insurance_default: 0
  });

  // Payrun Number Settings - NEW
  const [payrunNumberSettings, setPayrunNumberSettings] = useState({
    prefix: 'PR',
    next_number: 1,
    digits: 2
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setPayrollTabIconUrl(currentCompany?.payroll_tab_icon_url || '');
  }, [currentCompany]);

  const loadSettings = async () => {
    try {
      const settings = await AppSettings.list('setting_key', 1000);

      // Temporary objects to build up settings
      const tempTaxSettings = {};
      const tempPayPeriodSettings = {};
      const tempDeductionTemplates = {};
      const tempPayrunNumberSettings = {};

      settings.forEach(setting => {
        const key = setting.setting_key;

        if (key.startsWith('payroll_tax_')) {
          tempTaxSettings[key.replace('payroll_tax_', '')] = parseFloat(setting.setting_value) || 0;
        } else if (key.startsWith('payroll_period_')) {
          const periodKey = key.replace('payroll_period_', '');
          if (['overtime_threshold_hours', 'pay_day_of_month', 'pay_delay_days'].includes(periodKey)) {
            tempPayPeriodSettings[periodKey] = parseInt(setting.setting_value) || 0;
          } else {
            tempPayPeriodSettings[periodKey] = setting.setting_value;
          }
        } else if (key.startsWith('payroll_deduction_')) {
          tempDeductionTemplates[key.replace('payroll_deduction_', '')] = parseFloat(setting.setting_value) || 0;
        } else if (key.startsWith('payroll_payrun_')) { // NEW
          const payrunKey = key.replace('payroll_payrun_', '');
          if (['next_number', 'digits'].includes(payrunKey)) {
            tempPayrunNumberSettings[payrunKey] = parseInt(setting.setting_value) || 0;
          } else {
            tempPayrunNumberSettings[payrunKey] = setting.setting_value;
          }
        }
      });

      // Update states with loaded values, merging with initial defaults
      setTaxSettings(prev => ({ ...prev, ...tempTaxSettings }));
      setPayPeriodSettings(prev => ({ ...prev, ...tempPayPeriodSettings }));
      setDeductionTemplates(prev => ({ ...prev, ...tempDeductionTemplates }));
      setPayrunNumberSettings(prev => ({ ...prev, ...tempPayrunNumberSettings }));

    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings.');
    }
  };

  const saveTaxSettings = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(taxSettings)) {
        const settingKey = `payroll_tax_${key}`;
        const existing = await AppSettings.filter({ setting_key: settingKey });

        if (existing.length > 0) {
          await AppSettings.update(existing[0].id, {
            setting_value: value.toString(),
            setting_type: 'number'
          });
        } else {
          await AppSettings.create({
            setting_key: settingKey,
            setting_value: value.toString(),
            setting_type: 'number',
            description: `Payroll tax setting: ${key}`
          });
        }
      }

      toast.success('Tax settings saved successfully');
      await onRefresh();
    } catch (error) {
      console.error('Failed to save tax settings:', error);
      toast.error('Failed to save tax settings');
    } finally {
      setIsSaving(false);
    }
  };

  const savePayPeriodSettings = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(payPeriodSettings)) {
        const settingKey = `payroll_period_${key}`;
        const existing = await AppSettings.filter({ setting_key: settingKey });

        if (existing.length > 0) {
          await AppSettings.update(existing[0].id, {
            setting_value: value.toString(),
            setting_type: typeof value === 'number' ? 'number' : 'string'
          });
        } else {
          await AppSettings.create({
            setting_key: settingKey,
            setting_value: value.toString(),
            setting_type: typeof value === 'number' ? 'number' : 'string',
            description: `Payroll period setting: ${key}`
          });
        }
      }

      toast.success('Pay period settings saved successfully');
      await onRefresh();
    } catch (error) {
      console.error('Failed to save pay period settings:', error);
      toast.error('Failed to save pay period settings');
    } finally {
      setIsSaving(false);
    }
  };



  const saveDeductionTemplates = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(deductionTemplates)) {
        const settingKey = `payroll_deduction_${key}`;
        const existing = await AppSettings.filter({ setting_key: settingKey });

        if (existing.length > 0) {
          await AppSettings.update(existing[0].id, {
            setting_value: value.toString(),
            setting_type: 'number'
          });
        } else {
          await AppSettings.create({
            setting_key: settingKey,
            setting_value: value.toString(),
            setting_type: 'number',
            description: `Payroll deduction template: ${key}`
          });
        }
      }

      toast.success('Deduction templates saved successfully');
      await onRefresh();
    } catch (error) {
      console.error('Failed to save deduction templates:', error);
      toast.error('Failed to save deduction templates');
    } finally {
      setIsSaving(false);
    }
  };

  // NEW: Save Payrun Number Settings
  const savePayrunNumberSettings = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(payrunNumberSettings)) {
        const settingKey = `payroll_payrun_${key}`;
        const existing = await AppSettings.filter({ setting_key: settingKey });

        let settingType = 'string';
        if (key === 'next_number' || key === 'digits') {
          settingType = 'number';
        }

        if (existing.length > 0) {
          await AppSettings.update(existing[0].id, {
            setting_value: value.toString(),
            setting_type: settingType
          });
        } else {
          await AppSettings.create({
            setting_key: settingKey,
            setting_value: value.toString(),
            setting_type: settingType,
            description: `Payroll payrun number setting: ${key}`
          });
        }
      }

      toast.success('Payrun number settings saved successfully');
      await onRefresh();
    } catch (error) {
      console.error('Failed to save payrun number settings:', error);
      toast.error('Failed to save payrun number settings');
    } finally {
      setIsSaving(false);
    }
  };



  // NEW: Helper function to format payrun number
  const getFormattedPayrunNumber = () => {
    const nextNum = parseInt(payrunNumberSettings.next_number, 10);
    const numDigits = parseInt(payrunNumberSettings.digits, 10);

    const actualNextNum = isNaN(nextNum) || nextNum < 1 ? 1 : nextNum;
    const actualNumDigits = isNaN(numDigits) || numDigits < 1 ? 1 : numDigits;

    const paddedNumber = String(actualNextNum).padStart(actualNumDigits, '0');
    return `${payrunNumberSettings.prefix}-${paddedNumber}`;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Payroll Settings</h3>
          </div>
          {currentCompany && (
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border">
              {currentCompany.logo_url && (
                <img src={currentCompany.logo_url} alt="" className="w-6 h-6 object-contain" />
              )}
              <div>
                <div className="text-sm font-medium text-slate-900">{currentCompany.name}</div>
                <div className="text-xs text-slate-500">Linked Company</div>
              </div>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="tax" className="gap-2">
              <Percent className="w-4 h-4" />
              Tax
            </TabsTrigger>
            <TabsTrigger value="periods" className="gap-2">
              <Calendar className="w-4 h-4" />
              Periods
            </TabsTrigger>
            <TabsTrigger value="payitems" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Pay Items
            </TabsTrigger>
            <TabsTrigger value="deductions" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Deductions
            </TabsTrigger>
            <TabsTrigger value="payrun" className="gap-2">
              <FileText className="w-4 h-4" />
              Payrun #
            </TabsTrigger>
            <TabsTrigger value="tab-icons" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Tab Icon
            </TabsTrigger>
          </TabsList>

          {/* Tax Rates Tab */}
          <TabsContent value="tax" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Federal Tax Rate (%)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxSettings.federal_tax_rate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, federal_tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="12.00"
                />
                <p className="text-xs text-slate-500 mt-1">Default federal income tax withholding rate</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  State Tax Rate (%)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxSettings.state_tax_rate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, state_tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="5.00"
                />
                <p className="text-xs text-slate-500 mt-1">State income tax withholding rate</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Social Security Rate (%)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxSettings.social_security_rate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, social_security_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="6.20"
                />
                <p className="text-xs text-slate-500 mt-1">FICA Social Security tax rate</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Medicare Rate (%)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxSettings.medicare_rate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, medicare_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="1.45"
                />
                <p className="text-xs text-slate-500 mt-1">Medicare tax rate</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Overtime Multiplier
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={taxSettings.overtime_multiplier}
                  onChange={(e) => setTaxSettings({ ...taxSettings, overtime_multiplier: parseFloat(e.target.value) || 1.5 })}
                  placeholder="1.5"
                />
                <p className="text-xs text-slate-500 mt-1">Overtime pay rate multiplier (e.g., 1.5 = time and a half)</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={saveTaxSettings} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Tax Settings
              </Button>
            </div>
          </TabsContent>

          {/* Pay Periods Tab */}
          <TabsContent value="periods" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Default Pay Frequency
                </Label>
                <Select
                  value={payPeriodSettings.default_pay_frequency}
                  onValueChange={(value) => setPayPeriodSettings({ ...payPeriodSettings, default_pay_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Bi-Weekly">Bi-Weekly (Every 2 weeks)</SelectItem>
                    <SelectItem value="Semi-Monthly">Semi-Monthly (Twice a month)</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">How often employees are paid</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Overtime Threshold (hours/week)
                </Label>
                <Input
                  type="number"
                  value={payPeriodSettings.overtime_threshold_hours}
                  onChange={(e) => setPayPeriodSettings({ ...payPeriodSettings, overtime_threshold_hours: parseInt(e.target.value) || 40 })}
                  placeholder="40"
                />
                <p className="text-xs text-slate-500 mt-1">Hours per week before overtime kicks in</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Pay Day of Month (for Monthly)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={payPeriodSettings.pay_day_of_month}
                  onChange={(e) => setPayPeriodSettings({ ...payPeriodSettings, pay_day_of_month: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
                <p className="text-xs text-slate-500 mt-1">Day of the month for monthly payroll</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Pay Delay (days after period end)
                </Label>
                <Input
                  type="number"
                  value={payPeriodSettings.pay_delay_days}
                  onChange={(e) => setPayPeriodSettings({ ...payPeriodSettings, pay_delay_days: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">Number of days between period end and pay date</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={savePayPeriodSettings} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Pay Period Settings
              </Button>
            </div>
          </TabsContent>



          {/* NEW Pay Items Tab */}
          <TabsContent value="payitems" className="space-y-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900">
                Configure pay items that will appear on payslips. You can define different types of earnings,
                deductions, reimbursements, leave, benefits, and statutory payments.
              </p>
            </div>

            <PayItemsManager onRefresh={onRefresh} />
          </TabsContent>

          {/* Deduction Templates Tab */}
          <TabsContent value="deductions" className="space-y-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900">
                These are default deduction amounts that will be suggested when creating new employee payroll profiles.
                You can override them for individual employees.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Default Health Insurance (per pay period)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={deductionTemplates.health_insurance_default}
                    onChange={(e) => setDeductionTemplates({ ...deductionTemplates, health_insurance_default: parseFloat(e.target.value) || 0 })}
                    className="pl-9"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Default health insurance deduction amount</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Default Retirement Contribution (per pay period)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={deductionTemplates.retirement_contribution_default}
                    onChange={(e) => setDeductionTemplates({ ...deductionTemplates, retirement_contribution_default: parseFloat(e.target.value) || 0 })}
                    className="pl-9"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Default 401(k) or retirement plan contribution</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Default Life Insurance (per pay period)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={deductionTemplates.life_insurance_default}
                    onChange={(e) => setDeductionTemplates({ ...deductionTemplates, life_insurance_default: parseFloat(e.target.value) || 0 })}
                    className="pl-9"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Default life insurance premium deduction</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={saveDeductionTemplates} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Deduction Templates
              </Button>
            </div>
          </TabsContent>

          {/* Payrun Number Tab - NEW */}
          <TabsContent value="payrun" className="space-y-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900">
                Configure the format for payroll run numbers. Each new payroll run will automatically get the next number.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Prefix
                </Label>
                <Input
                  value={payrunNumberSettings.prefix}
                  onChange={(e) => setPayrunNumberSettings({ ...payrunNumberSettings, prefix: e.target.value })}
                  placeholder="PR"
                  maxLength={10}
                />
                <p className="text-xs text-slate-500 mt-1">Prefix for payrun numbers (e.g., PR, PAY, RUN)</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Next Number
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={payrunNumberSettings.next_number}
                  onChange={(e) => setPayrunNumberSettings({ ...payrunNumberSettings, next_number: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
                <p className="text-xs text-slate-500 mt-1">Next payrun number to be assigned</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Number of Digits
                </Label>
                <Select
                  value={payrunNumberSettings.digits.toString()}
                  onValueChange={(value) => setPayrunNumberSettings({ ...payrunNumberSettings, digits: parseInt(value) || 1 })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 digit (1, 2, 3...)</SelectItem>
                    <SelectItem value="2">2 digits (01, 02, 03...)</SelectItem>
                    <SelectItem value="3">3 digits (001, 002, 003...)</SelectItem>
                    <SelectItem value="4">4 digits (0001, 0002, 0003...)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">Number of digits for padding with zeros</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-600 mb-2">Preview:</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {getFormattedPayrunNumber()}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Next payroll run will be assigned this number
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={savePayrunNumberSettings} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Payrun Number Settings
              </Button>
            </div>
          </TabsContent>

          {/* Tab Icon Settings */}
          <TabsContent value="tab-icons" className="space-y-4 mt-6">
            <div>
              <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
              <p className="text-xs text-slate-500 mb-4">Customize the icon shown on the "Payroll" tab.</p>
            </div>

            {/* Payroll Tab Icon */}
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${payrollTabIconUrl ? '' : 'bg-yellow-100'}`}>
                  {payrollTabIconUrl ? (
                    <img src={payrollTabIconUrl} alt="Payroll icon" className="w-10 h-10 object-contain" />
                  ) : (
                    <DollarSign className="w-10 h-10 text-yellow-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-sm text-slate-800">Payroll Tab Icon</h4>
                  <p className="text-xs text-slate-500">Default: Dollar Sign icon</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCropImageSrc(reader.result);
                      setCropDialogOpen(true);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="payroll-tab-icon-upload"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  type="button" 
                  disabled={uploadingIcon}
                  onClick={() => document.getElementById('payroll-tab-icon-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                </Button>
                {payrollTabIconUrl && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCropImageSrc(payrollTabIconUrl);
                        setCropDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!currentCompany?.id) return;
                        try {
                          await Branch.update(currentCompany.id, { payroll_tab_icon_url: null });
                          const updatedCompany = { ...currentCompany, payroll_tab_icon_url: null };
                          setPayrollTabIconUrl('');
                          if (setCurrentCompany) {
                            setCurrentCompany(updatedCompany);
                          }
                          toast.success('Icon reset to default');
                          if (onRefresh) onRefresh();
                        } catch (error) {
                          toast.error('Failed to reset icon');
                        }
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        isOpen={cropDialogOpen}
        onClose={() => {
          setCropDialogOpen(false);
          setCropImageSrc('');
        }}
        imageUrl={cropImageSrc}
        isSaving={uploadingIcon}
        onSave={async (croppedBlob) => {
          if (!currentCompany?.id) {
            toast.error('No company selected');
            return;
          }
          
          setUploadingIcon(true);
          
          try {
            const file = new File([croppedBlob], 'payroll-tab-icon.png', { type: 'image/png' });
            const result = await base44.integrations.Core.UploadFile({ file });
            
            if (!result?.file_url) {
              throw new Error('No file URL returned from upload');
            }
            
            await Branch.update(currentCompany.id, { payroll_tab_icon_url: result.file_url });
            
            setPayrollTabIconUrl(result.file_url);
            
            const updatedCompany = { ...currentCompany, payroll_tab_icon_url: result.file_url };
            if (setCurrentCompany) {
              setCurrentCompany(updatedCompany);
            }
            
            toast.success('Icon updated!');
            if (onRefresh) onRefresh();
            
            setCropDialogOpen(false);
            setCropImageSrc('');
          } catch (error) {
            console.error('Error saving icon:', error);
            toast.error('Failed to save icon: ' + (error.message || 'Unknown error'));
          } finally {
            setUploadingIcon(false);
          }
        }}
      />
    </div>
  );
}