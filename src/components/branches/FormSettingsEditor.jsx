import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, FileText, ClipboardList, Palette, Eye, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Branch } from '@/entities/all';
import { createPageUrl } from '@/utils';

const defaultWorkingReport = {
    show_company_name: true,
    show_phone: true,
    show_email: true,
    show_tax_number: true,
    show_logo: true,
    show_wo_number: true,
    show_category: true,
    show_asset_details: true,
    show_instructions: true,
    show_work_done: true,
    show_spare_parts: true,
    show_notes: true,
    show_signatures: true,
    custom_title: '',
    custom_footer_text: ''
};

const defaultSummaryReport = {
    show_company_name: true,
    show_phone: true,
    show_email: true,
    show_tax_number: true,
    show_logo: true,
    show_filters_applied: true,
    show_statistics: true,
    show_project: true,
    show_customer: true,
    show_category: true,
    show_assigned_users: true,
    show_time_details: true,
    show_notes: true,
    show_contact_person: false,
    show_wo_title: true,
    show_equipment: true,
    show_location: true,
    page_break_per_team: false,
    custom_title: '',
    custom_footer_text: ''
};

const defaultPayslipReport = {
    show_company_name: true,
    show_company_address: true,
    show_company_phone: true,
    show_company_email: true,
    show_tax_number: true,
    show_logo: true,
    show_employee_id: true,
    show_employee_position: true,
    show_employee_email: true,
    show_hours_worked: true,
    show_overtime_details: true,
    show_earnings_breakdown: true,
    show_deductions_breakdown: true,
    show_bank_details: false,
    show_tax_breakdown: true,
    custom_title: 'PAY SLIP',
    custom_footer_text: 'This is a computer-generated document. No signature required.',
    currency: 'AED',
    currency_symbol: ''
};

export default function FormSettingsEditor({ company, onSave }) {
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('colors');
    
    const formSettings = company?.form_settings || {};
    
    const [colors, setColors] = useState({
        primary_color: formSettings.primary_color || '#DC2626',
        secondary_color: formSettings.secondary_color || '#1E40AF',
        header_background_color: formSettings.header_background_color || '#F8FAFC'
    });
    
    const [workingReport, setWorkingReport] = useState({
        ...defaultWorkingReport,
        ...(formSettings.working_report || {})
    });
    
    const [summaryReport, setSummaryReport] = useState({
        ...defaultSummaryReport,
        ...(formSettings.summary_report || {})
    });

    const [payslipReport, setPayslipReport] = useState({
        ...defaultPayslipReport,
        ...(formSettings.payslip_report || {})
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            const newFormSettings = {
                ...colors,
                working_report: workingReport,
                summary_report: summaryReport,
                payslip_report: payslipReport
            };
            
            await Branch.update(company.id, {
                form_settings: newFormSettings
            });
            
            toast.success('Form settings saved');
            if (onSave) onSave(newFormSettings);
        } catch (error) {
            console.error('Failed to save form settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handlePreviewWorkingReport = () => {
        // Open a sample working report preview
        toast.info('Preview requires a work order ID');
    };

    const handlePreviewSummaryReport = () => {
        const today = new Date().toISOString().split('T')[0];
        const params = new URLSearchParams();
        params.set('startDate', today);
        params.set('endDate', today);
        params.set('groupBy', 'team');
        window.open(createPageUrl(`WorkOrdersSummaryPDFView?${params.toString()}`), '_blank');
    };

    const ToggleField = ({ label, checked, onChange, description }) => (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                {description && <p className="text-xs text-slate-500">{description}</p>}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">PDF Forms Customization</h3>
                    <p className="text-sm text-slate-500">Customize the appearance and content of your PDF reports</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Settings
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="colors" className="gap-2">
                        <Palette className="w-4 h-4" />
                        Colors
                    </TabsTrigger>
                    <TabsTrigger value="working" className="gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Working Report
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Summary Report
                    </TabsTrigger>
                    <TabsTrigger value="payslip" className="gap-2">
                        <Receipt className="w-4 h-4" />
                        Payslip
                    </TabsTrigger>
                </TabsList>

                {/* Brand Colors Tab */}
                <TabsContent value="colors" className="mt-4 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                        <h4 className="font-medium text-slate-900">Brand Colors</h4>
                        <p className="text-xs text-slate-500">These colors will be used throughout your PDF forms</p>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Primary Color</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={colors.primary_color}
                                        onChange={(e) => setColors({...colors, primary_color: e.target.value})}
                                        className="w-10 h-10 rounded cursor-pointer border"
                                    />
                                    <Input 
                                        value={colors.primary_color}
                                        onChange={(e) => setColors({...colors, primary_color: e.target.value})}
                                        placeholder="#DC2626"
                                        className="flex-1"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Headers, titles, accents</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Secondary Color</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={colors.secondary_color}
                                        onChange={(e) => setColors({...colors, secondary_color: e.target.value})}
                                        className="w-10 h-10 rounded cursor-pointer border"
                                    />
                                    <Input 
                                        value={colors.secondary_color}
                                        onChange={(e) => setColors({...colors, secondary_color: e.target.value})}
                                        placeholder="#1E40AF"
                                        className="flex-1"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Team headers, sections</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Header Background</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={colors.header_background_color}
                                        onChange={(e) => setColors({...colors, header_background_color: e.target.value})}
                                        className="w-10 h-10 rounded cursor-pointer border"
                                    />
                                    <Input 
                                        value={colors.header_background_color}
                                        onChange={(e) => setColors({...colors, header_background_color: e.target.value})}
                                        placeholder="#F8FAFC"
                                        className="flex-1"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Background for headers</p>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Color Preview</p>
                            <div className="flex gap-4">
                                <div 
                                    className="px-4 py-2 rounded text-white text-sm font-bold"
                                    style={{ backgroundColor: colors.primary_color }}
                                >
                                    Primary Header
                                </div>
                                <div 
                                    className="px-4 py-2 rounded text-white text-sm font-bold"
                                    style={{ backgroundColor: colors.secondary_color }}
                                >
                                    Team Section
                                </div>
                                <div 
                                    className="px-4 py-2 rounded border text-sm"
                                    style={{ backgroundColor: colors.header_background_color }}
                                >
                                    Background
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Working Report Tab */}
                <TabsContent value="working" className="mt-4 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-medium text-slate-900">Working Report (Service & Maintenance)</h4>
                                <p className="text-xs text-slate-500">Customize fields shown in individual work order PDFs</p>
                            </div>
                        </div>

                        {/* Working Report Preview */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Preview</p>
                            <div className="bg-white border border-slate-300 rounded-lg p-4" style={{ fontSize: '10px' }}>
                                {/* Header */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="space-y-0.5">
                                        {workingReport.show_company_name && <p className="font-bold text-red-600">{company?.name || 'COMPANY NAME'}</p>}
                                        {workingReport.show_phone && <p className="text-gray-600">Contact: {company?.phone || '+971...'}</p>}
                                        {workingReport.show_email && <p className="text-gray-600">{company?.email || 'email@company.com'}</p>}
                                        {workingReport.show_tax_number && <p className="font-bold">TRN No. {company?.tax_number || '000000000000000'}</p>}
                                    </div>
                                    {workingReport.show_logo && (
                                        <div className="w-20 h-8 border border-slate-200 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                                            {company?.logo_forms_url || company?.logo_url ? (
                                                <img src={company?.logo_forms_url || company?.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                            ) : (
                                                <span className="text-[8px] text-slate-400">Logo</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="h-0.5 bg-red-500 my-2"></div>
                                <p className="font-bold mb-2">{workingReport.custom_title || 'SERVICE & MAINTENANCE REPORT'}</p>
                                
                                {/* Content preview */}
                                <div className="space-y-1 text-[8px]">
                                    {workingReport.show_wo_number && <p>📋 WO Number: N123</p>}
                                    {workingReport.show_category && <p>📁 Category: Maintenance</p>}
                                    {workingReport.show_asset_details && <p>🔧 Asset Details: Tower Crane TC-001</p>}
                                    {workingReport.show_instructions && <p>📝 Instructions: [Visible]</p>}
                                    {workingReport.show_work_done && <p>✅ Work Done: [Visible]</p>}
                                    {workingReport.show_spare_parts && <p>🔩 Spare Parts: [Visible]</p>}
                                    {workingReport.show_notes && <p>📄 Notes: [Visible]</p>}
                                    {workingReport.show_signatures && <p>✍️ Signatures: [Visible]</p>}
                                </div>
                                {workingReport.custom_footer_text && (
                                    <p className="text-[8px] text-gray-500 mt-2 pt-1 border-t">{workingReport.custom_footer_text}</p>
                                )}
                            </div>
                        </div>

                        {/* Header Section Container */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Header Section</p>
                            <ToggleField 
                                label="Company Name" 
                                checked={workingReport.show_company_name}
                                onChange={(v) => setWorkingReport({...workingReport, show_company_name: v})}
                            />
                            <ToggleField 
                                label="Phone Number" 
                                checked={workingReport.show_phone}
                                onChange={(v) => setWorkingReport({...workingReport, show_phone: v})}
                            />
                            <ToggleField 
                                label="Email" 
                                checked={workingReport.show_email}
                                onChange={(v) => setWorkingReport({...workingReport, show_email: v})}
                            />
                            <ToggleField 
                                label="Tax Number (TRN)" 
                                checked={workingReport.show_tax_number}
                                onChange={(v) => setWorkingReport({...workingReport, show_tax_number: v})}
                            />
                            <ToggleField 
                                label="Company Logo" 
                                checked={workingReport.show_logo}
                                onChange={(v) => setWorkingReport({...workingReport, show_logo: v})}
                            />
                        </div>

                        {/* Content Section Container */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Content Sections</p>
                            <ToggleField 
                                label="Work Order Number" 
                                checked={workingReport.show_wo_number}
                                onChange={(v) => setWorkingReport({...workingReport, show_wo_number: v})}
                            />
                            <ToggleField 
                                label="Category" 
                                checked={workingReport.show_category}
                                onChange={(v) => setWorkingReport({...workingReport, show_category: v})}
                            />
                            <ToggleField 
                                label="Asset Details" 
                                checked={workingReport.show_asset_details}
                                onChange={(v) => setWorkingReport({...workingReport, show_asset_details: v})}
                            />
                            <ToggleField 
                                label="Order Instructions" 
                                checked={workingReport.show_instructions}
                                onChange={(v) => setWorkingReport({...workingReport, show_instructions: v})}
                            />
                            <ToggleField 
                                label="Work Done Section" 
                                checked={workingReport.show_work_done}
                                onChange={(v) => setWorkingReport({...workingReport, show_work_done: v})}
                            />
                            <ToggleField 
                                label="Spare Parts Section" 
                                checked={workingReport.show_spare_parts}
                                onChange={(v) => setWorkingReport({...workingReport, show_spare_parts: v})}
                            />
                            <ToggleField 
                                label="Notes / Remarks" 
                                checked={workingReport.show_notes}
                                onChange={(v) => setWorkingReport({...workingReport, show_notes: v})}
                            />
                            <ToggleField 
                                label="Signatures Section" 
                                checked={workingReport.show_signatures}
                                onChange={(v) => setWorkingReport({...workingReport, show_signatures: v})}
                            />
                        </div>

                        {/* Custom Text Container */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Custom Text</p>
                            <div className="space-y-3 py-2">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Custom Report Title</label>
                                    <Input 
                                        value={workingReport.custom_title}
                                        onChange={(e) => setWorkingReport({...workingReport, custom_title: e.target.value})}
                                        placeholder="SERVICE & MAINTENANCE REPORT"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Custom Footer Text</label>
                                    <Input 
                                        value={workingReport.custom_footer_text}
                                        onChange={(e) => setWorkingReport({...workingReport, custom_footer_text: e.target.value})}
                                        placeholder="Thank you for your business"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Payslip Report Tab */}
                <TabsContent value="payslip" className="mt-4 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-medium text-slate-900">Payslip Report</h4>
                                <p className="text-xs text-slate-500">Customize the employee payslip PDF format</p>
                            </div>
                        </div>

                        {/* Payslip Preview */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Preview</p>
                            <div className="bg-white border border-slate-300 rounded-lg overflow-hidden" style={{ fontSize: '9px' }}>
                                {/* Header - uses primary color from Colors tab */}
                                <div className="text-white p-3 flex items-start gap-3" style={{ backgroundColor: colors.primary_color }}>
                                    {payslipReport.show_logo && (company?.logo_forms_url || company?.logo_url) && (
                                        <img src={company?.logo_forms_url || company?.logo_url} alt="Logo" className="w-10 h-10 object-contain bg-white rounded" />
                                    )}
                                    <div>
                                        {payslipReport.show_company_name && <p className="font-bold text-sm">{company?.name || 'Company Name'}</p>}
                                        {payslipReport.show_company_address && <p className="text-[8px] opacity-90">{company?.address || 'Company Address'}</p>}
                                        {payslipReport.show_tax_number && <p className="text-[8px] opacity-90">TRN: {company?.tax_number || '000000000000000'}</p>}
                                    </div>
                                </div>
                                
                                <div className="p-3 space-y-2">
                                    <p className="font-bold text-sm">{payslipReport.custom_title || 'PAY SLIP'}</p>
                                    <p className="text-[8px] text-gray-500">Pay Period: 1 Jan 2024 - 31 Jan 2024</p>
                                    
                                    {/* Employee Info */}
                                    <div className="bg-slate-50 p-2 rounded border">
                                        <p className="font-bold text-[9px]">Employee Information</p>
                                        <div className="grid grid-cols-2 gap-1 mt-1">
                                            <p>Name: John Doe</p>
                                            {payslipReport.show_employee_id && <p>ID: EMP-001</p>}
                                            {payslipReport.show_employee_email && <p>Email: john@company.com</p>}
                                            {payslipReport.show_employee_position && <p>Position: Mechanic</p>}
                                        </div>
                                    </div>
                                    
                                    {/* Hours */}
                                    {payslipReport.show_hours_worked && (
                                        <div className="border-t pt-1">
                                            <p className="font-bold">Hours Worked</p>
                                            <div className="flex justify-between">
                                                <span>Regular Hours</span><span>176.0 h</span>
                                            </div>
                                            {payslipReport.show_overtime_details && (
                                                <div className="flex justify-between text-orange-600">
                                                    <span>Overtime Hours</span><span>12.5 h</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Earnings */}
                                    {payslipReport.show_earnings_breakdown && (
                                        <div className="border-t pt-1">
                                            <p className="font-bold text-green-700">Earnings</p>
                                            <div className="flex justify-between"><span>Basic Salary</span><span>2,000.00</span></div>
                                            <div className="flex justify-between"><span>Overtime Pay</span><span>250.00</span></div>
                                            <div className="flex justify-between"><span>Allowance</span><span>150.00</span></div>
                                            <div className="flex justify-between font-bold bg-green-50 p-1 rounded mt-1">
                                                <span>Total Earnings</span><span>2,400.00</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Deductions */}
                                    {payslipReport.show_deductions_breakdown && (
                                        <div className="border-t pt-1">
                                            <p className="font-bold text-red-600">Deductions</p>
                                            <div className="flex justify-between text-red-600"><span>Insurance</span><span>-50.00</span></div>
                                            {payslipReport.show_tax_breakdown && (
                                                <div className="flex justify-between text-red-600"><span>Tax</span><span>-100.00</span></div>
                                            )}
                                            <div className="flex justify-between font-bold bg-red-50 p-1 rounded mt-1 text-red-600">
                                                <span>Total Deductions</span><span>-150.00</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Net Pay - uses primary color */}
                                    <div className="p-2 rounded flex justify-between font-bold" style={{ 
                                        backgroundColor: `${colors.primary_color}15`,
                                        borderColor: `${colors.primary_color}40`,
                                        borderWidth: '1px',
                                        color: colors.primary_color 
                                    }}>
                                        <span>NET PAY</span><span>2,250.00 {payslipReport.currency || 'AED'}</span>
                                    </div>
                                    
                                    {/* Bank Details */}
                                    {payslipReport.show_bank_details && (
                                        <div className="text-[8px] text-gray-500 border-t pt-1">
                                            <p className="font-medium">Payment Info: Bank Name | IBAN: AE12...</p>
                                        </div>
                                    )}
                                </div>
                                
                                {payslipReport.custom_footer_text && (
                                    <p className="text-[7px] text-gray-400 text-center py-1 border-t">{payslipReport.custom_footer_text}</p>
                                )}
                            </div>
                        </div>

                        {/* Header Section */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Company Header</p>
                            <ToggleField label="Company Name" checked={payslipReport.show_company_name} onChange={(v) => setPayslipReport({...payslipReport, show_company_name: v})} />
                            <ToggleField label="Company Address" checked={payslipReport.show_company_address} onChange={(v) => setPayslipReport({...payslipReport, show_company_address: v})} />
                            <ToggleField label="Phone Number" checked={payslipReport.show_company_phone} onChange={(v) => setPayslipReport({...payslipReport, show_company_phone: v})} />
                            <ToggleField label="Email" checked={payslipReport.show_company_email} onChange={(v) => setPayslipReport({...payslipReport, show_company_email: v})} />
                            <ToggleField label="Tax Number (TRN)" checked={payslipReport.show_tax_number} onChange={(v) => setPayslipReport({...payslipReport, show_tax_number: v})} />
                            <ToggleField label="Company Logo" checked={payslipReport.show_logo} onChange={(v) => setPayslipReport({...payslipReport, show_logo: v})} />
                        </div>

                        {/* Employee Info Section */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Employee Information</p>
                            <ToggleField label="Employee ID" checked={payslipReport.show_employee_id} onChange={(v) => setPayslipReport({...payslipReport, show_employee_id: v})} />
                            <ToggleField label="Position / Job Title" checked={payslipReport.show_employee_position} onChange={(v) => setPayslipReport({...payslipReport, show_employee_position: v})} />
                            <ToggleField label="Employee Email" checked={payslipReport.show_employee_email} onChange={(v) => setPayslipReport({...payslipReport, show_employee_email: v})} />
                        </div>

                        {/* Hours Section */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Hours & Time</p>
                            <ToggleField label="Hours Worked Section" checked={payslipReport.show_hours_worked} onChange={(v) => setPayslipReport({...payslipReport, show_hours_worked: v})} />
                            <ToggleField label="Overtime Details" description="Show overtime hours breakdown" checked={payslipReport.show_overtime_details} onChange={(v) => setPayslipReport({...payslipReport, show_overtime_details: v})} />
                        </div>

                        {/* Earnings & Deductions Section */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Earnings & Deductions</p>
                            <ToggleField label="Earnings Breakdown" description="Show detailed list of all earnings (salary, overtime, allowances)" checked={payslipReport.show_earnings_breakdown} onChange={(v) => setPayslipReport({...payslipReport, show_earnings_breakdown: v})} />
                            <ToggleField label="Deductions Breakdown" description="Show detailed list of all deductions" checked={payslipReport.show_deductions_breakdown} onChange={(v) => setPayslipReport({...payslipReport, show_deductions_breakdown: v})} />
                            <ToggleField label="Tax Breakdown" description="Show individual tax items (Federal, State, etc.)" checked={payslipReport.show_tax_breakdown} onChange={(v) => setPayslipReport({...payslipReport, show_tax_breakdown: v})} />
                            <ToggleField label="Bank Details" description="Show employee bank information for payment" checked={payslipReport.show_bank_details} onChange={(v) => setPayslipReport({...payslipReport, show_bank_details: v})} />
                        </div>

                        {/* Custom Text */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Custom Text & Currency</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Payslip Title</label>
                                    <Input value={payslipReport.custom_title} onChange={(e) => setPayslipReport({...payslipReport, custom_title: e.target.value})} placeholder="PAY SLIP" className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Footer Text</label>
                                    <Input value={payslipReport.custom_footer_text} onChange={(e) => setPayslipReport({...payslipReport, custom_footer_text: e.target.value})} placeholder="This is a computer-generated document..." className="mt-1" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Currency Code</label>
                                        <Input value={payslipReport.currency} onChange={(e) => setPayslipReport({...payslipReport, currency: e.target.value})} placeholder="AED" className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Currency Symbol (optional)</label>
                                        <Input value={payslipReport.currency_symbol} onChange={(e) => setPayslipReport({...payslipReport, currency_symbol: e.target.value})} placeholder="$" className="mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Summary Report Tab */}
                <TabsContent value="summary" className="mt-4 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-medium text-slate-900">Summary Report (Work Orders List)</h4>
                                <p className="text-xs text-slate-500">Customize fields shown in work orders summary PDFs</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={handlePreviewSummaryReport}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                            </Button>
                        </div>

                        {/* Summary Report Preview */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Preview</p>
                            <div className="bg-white border border-slate-300 rounded-lg p-4" style={{ fontSize: '10px' }}>
                                {/* Header */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="space-y-0.5">
                                        {summaryReport.show_company_name && <p className="font-bold text-red-600">{company?.name || 'COMPANY NAME'}</p>}
                                        {summaryReport.show_phone && <p className="text-gray-600">Contact: {company?.phone || '+971...'}</p>}
                                        {summaryReport.show_email && <p className="text-gray-600">{company?.email || 'email@company.com'}</p>}
                                        {summaryReport.show_tax_number && <p className="font-bold">TRN No. {company?.tax_number || '000000000000000'}</p>}
                                    </div>
                                    {summaryReport.show_logo && (
                                        <div className="w-20 h-8 border border-slate-200 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                                            {company?.logo_forms_url || company?.logo_url ? (
                                                <img src={company?.logo_forms_url || company?.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                            ) : (
                                                <span className="text-[8px] text-slate-400">Logo</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="h-0.5 bg-red-500 my-2"></div>
                                <p className="font-bold mb-1">{summaryReport.custom_title || 'Work Orders Summary Report'}</p>
                                <p className="text-[8px] text-gray-500 mb-2">Period: 2025-11-26 to 2025-11-26 | Total: 5</p>
                                
                                {/* Team section */}
                                <div className="bg-gray-100 p-1 mb-1 border-l-2 border-red-500 font-bold text-[9px]">
                                    Service 1 (2)
                                </div>
                                
                                {/* Sample row */}
                                <div className="border border-slate-200 rounded p-1 mb-1 text-[8px]">
                                    <div className="flex gap-2">
                                        <span className="font-bold">N1 of 2</span>
                                        {summaryReport.show_project && <span>Project Name</span>}
                                        {summaryReport.show_customer && <span className="text-gray-500">(Customer)</span>}
                                    </div>
                                    <div className="text-gray-600 space-x-2">
                                        {summaryReport.show_category && <span>📁 Category</span>}
                                        {summaryReport.show_time_details && <span>🕐 07:00-17:00</span>}
                                        {summaryReport.show_location && <span>📍 Location</span>}
                                        {summaryReport.show_contact_person && <span>👤 Contact</span>}
                                        {summaryReport.show_assigned_users && <span>👷 Assigned</span>}
                                    </div>
                                    {(summaryReport.show_wo_title || summaryReport.show_equipment || summaryReport.show_notes) && (
                                        <div className="bg-amber-50 p-1 mt-1 rounded text-[7px]">
                                            {summaryReport.show_wo_title && <span className="mr-2">📝 Title</span>}
                                            {summaryReport.show_equipment && <span className="mr-2">🔧 Equipment</span>}
                                            {summaryReport.show_notes && <span>📄 Notes</span>}
                                        </div>
                                    )}
                                </div>
                                {summaryReport.custom_footer_text && (
                                    <p className="text-[8px] text-gray-500 mt-2 pt-1 border-t">{summaryReport.custom_footer_text}</p>
                                )}
                            </div>
                        </div>

                        {/* Header Section Container */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Header Section</p>
                            <ToggleField 
                                label="Company Name" 
                                checked={summaryReport.show_company_name}
                                onChange={(v) => setSummaryReport({...summaryReport, show_company_name: v})}
                            />
                            <ToggleField 
                                label="Phone Number" 
                                checked={summaryReport.show_phone}
                                onChange={(v) => setSummaryReport({...summaryReport, show_phone: v})}
                            />
                            <ToggleField 
                                label="Email" 
                                checked={summaryReport.show_email}
                                onChange={(v) => setSummaryReport({...summaryReport, show_email: v})}
                            />
                            <ToggleField 
                                label="Tax Number (TRN)" 
                                checked={summaryReport.show_tax_number}
                                onChange={(v) => setSummaryReport({...summaryReport, show_tax_number: v})}
                            />
                            <ToggleField 
                                label="Company Logo" 
                                checked={summaryReport.show_logo}
                                onChange={(v) => setSummaryReport({...summaryReport, show_logo: v})}
                            />
                        </div>

                        {/* Report Content Container */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Report Content</p>
                            <ToggleField 
                                label="Applied Filters Box" 
                                checked={summaryReport.show_filters_applied}
                                onChange={(v) => setSummaryReport({...summaryReport, show_filters_applied: v})}
                            />
                            <ToggleField 
                                label="Statistics (Ongoing/Closed counts)" 
                                checked={summaryReport.show_statistics}
                                onChange={(v) => setSummaryReport({...summaryReport, show_statistics: v})}
                            />
                        </div>

                        {/* Work Order Fields Container */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Work Order Fields</p>
                            <ToggleField 
                                label="Project Name" 
                                checked={summaryReport.show_project}
                                onChange={(v) => setSummaryReport({...summaryReport, show_project: v})}
                            />
                            <ToggleField 
                                label="Customer Name" 
                                checked={summaryReport.show_customer}
                                onChange={(v) => setSummaryReport({...summaryReport, show_customer: v})}
                            />
                            <ToggleField 
                                label="Category" 
                                checked={summaryReport.show_category}
                                onChange={(v) => setSummaryReport({...summaryReport, show_category: v})}
                            />
                            <ToggleField 
                                label="Assigned Users" 
                                checked={summaryReport.show_assigned_users}
                                onChange={(v) => setSummaryReport({...summaryReport, show_assigned_users: v})}
                            />
                            <ToggleField 
                                label="Date & Time Details" 
                                checked={summaryReport.show_time_details}
                                onChange={(v) => setSummaryReport({...summaryReport, show_time_details: v})}
                            />
                            <ToggleField 
                                label="Notes" 
                                checked={summaryReport.show_notes}
                                onChange={(v) => setSummaryReport({...summaryReport, show_notes: v})}
                            />
                            <ToggleField 
                                label="Contact Person" 
                                checked={summaryReport.show_contact_person}
                                onChange={(v) => setSummaryReport({...summaryReport, show_contact_person: v})}
                            />
                            <ToggleField 
                                label="Work Order Title" 
                                checked={summaryReport.show_wo_title}
                                onChange={(v) => setSummaryReport({...summaryReport, show_wo_title: v})}
                            />
                            <ToggleField 
                                label="Equipment" 
                                checked={summaryReport.show_equipment}
                                onChange={(v) => setSummaryReport({...summaryReport, show_equipment: v})}
                            />
                            <ToggleField 
                                label="Location" 
                                checked={summaryReport.show_location}
                                onChange={(v) => setSummaryReport({...summaryReport, show_location: v})}
                            />
                        </div>

                        {/* Print Options Container */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Print Options</p>
                            <ToggleField 
                                label="One Page Per Team" 
                                description="Insert page break between each team when printing"
                                checked={summaryReport.page_break_per_team}
                                onChange={(v) => setSummaryReport({...summaryReport, page_break_per_team: v})}
                            />
                        </div>

                        {/* Custom Text Container */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Custom Text</p>
                            <div className="space-y-3 py-2">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Custom Report Title</label>
                                    <Input 
                                        value={summaryReport.custom_title}
                                        onChange={(e) => setSummaryReport({...summaryReport, custom_title: e.target.value})}
                                        placeholder="Work Orders Report"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Custom Footer Text</label>
                                    <Input 
                                        value={summaryReport.custom_footer_text}
                                        onChange={(e) => setSummaryReport({...summaryReport, custom_footer_text: e.target.value})}
                                        placeholder="Generated by MyCompany"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}