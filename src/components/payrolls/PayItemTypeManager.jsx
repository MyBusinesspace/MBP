import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Save, X, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PayItemType, PayItem } from '@/entities/all';
import { cn } from '@/lib/utils';

// Default pay item types structure
const DEFAULT_PAY_ITEMS = {
  'Earnings': {
    'Base Pay': [
      { name: 'Salary', description: 'Fixed amount per period' },
      { name: 'Wages', description: 'Hourly Pay × Hours' }
    ],
    'Variable Pay': [
      { name: 'Overtime', description: 'Time and a half' },
      { name: 'Commissions', description: 'Sales commissions' },
      { name: 'Bonuses', description: 'Annual, Performance, Sign-on, etc.' },
      { name: 'Tips', description: 'Customer tips' },
      { name: 'Piecework Pay', description: 'Per unit/piece payment' }
    ],
    'Allowances': [
      { name: 'Travel/Conveyance Allowance', description: 'Transportation allowance' },
      { name: 'Housing Allowance (HRA)', description: 'Housing rent allowance' },
      { name: 'Meal/Uniform Allowance', description: 'Food and uniform allowance' },
      { name: 'Phone/Data Allowance', description: 'Mobile phone and data allowance' },
      { name: 'Driver Allowance', description: 'Allowance for drivers' },
      { name: 'Other Allowance', description: 'Other miscellaneous allowances' }
    ],
    'Paid Time Off (PTO)': [
      { name: 'Annual/Holiday Leave Pay', description: 'Annual leave payment' },
      { name: 'Sick Leave Pay', description: 'Sick leave payment' },
      { name: 'Maternity/Paternity Leave Pay', description: 'Parental leave payment' },
      { name: 'Public Holiday Pay', description: 'Public holiday payment' },
      { name: 'Leave Loading', description: 'Additional leave loading' }
    ],
    'Lump Sum Payments': [
      { name: 'Severance/Termination Payments', description: 'End of service payments' },
      { name: 'Accrued PTO Payout', description: 'Payout on termination' }
    ]
  },
  'Deductions': {
    'Statutory/Mandatory': [
      { name: 'Income Tax Withholding (PAYE/TDS)', description: 'Federal/State/Local tax' },
      { name: 'Social Security/FICA', description: "Employee's share" },
      { name: 'Medicare', description: "Employee's share" },
      { name: 'Retirement Fund Contributions (EPF)', description: 'Mandatory pension' },
      { name: 'Unemployment Insurance', description: "Employee's share" }
    ],
    'Voluntary (Pre-Tax)': [
      { name: 'Retirement Savings (401k/Pension)', description: 'Voluntary pension plans' },
      { name: 'Health/Dental/Vision Insurance', description: 'Insurance premiums' },
      { name: 'FSA/HSA Contributions', description: 'Flexible spending accounts' },
      { name: 'Union Dues', description: 'Union membership fees' }
    ],
    'Other Post-Tax': [
      { name: 'Wage Garnishments', description: 'e.g., Child Support' },
      { name: 'Loan Repayments', description: 'Repayments to the employer' },
      { name: 'Charitable Donations', description: 'Payroll giving' }
    ]
  },
  'Employer Contributions': {
    'Statutory': [
      { name: "Employer's Social Security/FICA", description: "Employer's share" },
      { name: "Employer's Medicare", description: "Employer's share" },
      { name: 'Unemployment Tax (FUTA/SUTA)', description: 'Employer unemployment tax' },
      { name: "Workers' Compensation Insurance", description: 'Work injury insurance' }
    ],
    'Benefit Contributions': [
      { name: 'Retirement Plan Match', description: '401(k) employer match' },
      { name: 'Employer-paid Health/Life Insurance', description: 'Employer insurance contributions' }
    ]
  },
  'Reimbursements': {
    'Expenses': [
      { name: 'Mileage/Travel Expenses', description: 'Travel reimbursement' },
      { name: 'Office Supplies/Equipment', description: 'Equipment purchases' },
      { name: 'Per Diem/Incidentals', description: 'Daily allowances' }
    ]
  }
};

// Sub-categories by category
const SUB_CATEGORIES = {
  'Earnings': ['Base Pay', 'Variable Pay', 'Allowances', 'Paid Time Off (PTO)', 'Lump Sum Payments'],
  'Deductions': ['Statutory/Mandatory', 'Voluntary (Pre-Tax)', 'Other Post-Tax'],
  'Employer Contributions': ['Statutory', 'Benefit Contributions'],
  'Reimbursements': ['Expenses']
};

export default function PayItemTypeManager({ isOpen, onClose, onRefresh }) {
  const [payItemTypes, setPayItemTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingType, setEditingType] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedSubCategories, setExpandedSubCategories] = useState({});
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pay_item_type_active_tab') || 'Earnings';
    }
    return 'Earnings';
  });

  const [formData, setFormData] = useState({
    name: '',
    category: 'Earnings',
    sub_category: '',
    accounting_code: '',
    description: '',
    color: 'blue'
  });

  useEffect(() => {
    if (isOpen) {
      loadPayItemTypes();
    }
  }, [isOpen]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    localStorage.setItem('pay_item_type_active_tab', value);
  };

  const loadPayItemTypes = async () => {
    setIsLoading(true);
    try {
      const types = await PayItemType.list('sort_order', 1000);
      setPayItemTypes(types.filter(t => t.is_active !== false));
    } catch (error) {
      console.error('Failed to load pay item types:', error);
      toast.error('Failed to load pay item types');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultPayItems = async () => {
    setIsCreatingDefaults(true);
    try {
      let sortOrder = 0;
      const existingNames = payItemTypes.map(t => t.name.toLowerCase());
      let createdCount = 0;

      for (const [category, subCategories] of Object.entries(DEFAULT_PAY_ITEMS)) {
        for (const [subCategory, items] of Object.entries(subCategories)) {
          for (const item of items) {
            if (!existingNames.includes(item.name.toLowerCase())) {
              const newType = await PayItemType.create({
                name: item.name,
                category,
                sub_category: subCategory,
                description: item.description,
                sort_order: sortOrder++,
                is_default: true,
                is_active: true
              });
              
              // Auto-create PayItem
              await PayItem.create({
                name: newType.name,
                pay_item_type_id: newType.id,
                description: newType.description,
                paid_to: 'Employee',
                default_amount: 0,
                is_taxable: category !== 'Reimbursements',
                show_on_payslip: true,
                calculation_type: 'fixed',
                is_active: true
              });
              
              createdCount++;
            }
          }
        }
      }

      toast.success(`Created ${createdCount} default pay item types`);
      await loadPayItemTypes();
      await onRefresh();
    } catch (error) {
      console.error('Failed to create default pay items:', error);
      toast.error('Failed to create default pay items');
    } finally {
      setIsCreatingDefaults(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) {
      toast.error('Please fill in name and category');
      return;
    }

    try {
      if (editingType) {
        await PayItemType.update(editingType.id, formData);
        toast.success('Pay item type updated');
      } else {
        const newType = await PayItemType.create(formData);
        await PayItem.create({
          name: newType.name,
          pay_item_type_id: newType.id,
          description: newType.description,
          paid_to: 'Employee',
          default_amount: 0,
          is_taxable: true,
          show_on_payslip: true,
          calculation_type: 'fixed',
          is_active: true
        });
        toast.success('Pay item type created');
      }
      
      await loadPayItemTypes();
      await onRefresh();
      handleCancel();
    } catch (error) {
      console.error('Failed to save pay item type:', error);
      toast.error('Failed to save pay item type');
    }
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      category: type.category || 'Earnings',
      sub_category: type.sub_category || '',
      accounting_code: type.accounting_code || '',
      description: type.description || '',
      color: type.color || 'blue'
    });
    // Switch to the correct tab when editing
    if (type.category) {
      setActiveTab(type.category);
    }
    setShowForm(true);
  };

  const handleDelete = async (typeId) => {
    if (!confirm('Are you sure you want to delete this pay item type?')) return;

    try {
      await PayItemType.update(typeId, { is_active: false });
      toast.success('Pay item type deleted');
      await loadPayItemTypes();
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete pay item type:', error);
      toast.error('Failed to delete pay item type');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingType(null);
    setFormData({
      name: '',
      category: activeTab,
      sub_category: '',
      accounting_code: '',
      description: '',
      color: 'blue'
    });
  };

  const toggleSubCategory = (subCat) => {
    setExpandedSubCategories(prev => ({
      ...prev,
      [subCat]: !prev[subCat]
    }));
  };

  const categoryColors = {
    'Earnings': 'bg-green-100 text-green-700',
    'Deductions': 'bg-red-100 text-red-700',
    'Employer Contributions': 'bg-orange-100 text-orange-700',
    'Reimbursements': 'bg-blue-100 text-blue-700'
  };

  // Group types by category and sub_category
  const groupedTypes = payItemTypes.reduce((acc, type) => {
    const cat = type.category || 'Earnings';
    const subCat = type.sub_category || 'Other';
    if (!acc[cat]) acc[cat] = {};
    if (!acc[cat][subCat]) acc[cat][subCat] = [];
    acc[cat][subCat].push(type);
    return acc;
  }, {});

  const currentSubCategories = SUB_CATEGORIES[activeTab] || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Pay Item Types</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {!showForm && (
              <>
                <Button 
                  onClick={() => {
                    setFormData(prev => ({ ...prev, category: activeTab }));
                    setShowForm(true);
                  }} 
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Pay Item Type
                </Button>
                <Button 
                  onClick={createDefaultPayItems} 
                  size="sm"
                  variant="outline"
                  disabled={isCreatingDefaults}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isCreatingDefaults && "animate-spin")} />
                  Load Default Items
                </Button>
              </>
            )}
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-sm">
                {editingType ? 'Edit Pay Item Type' : 'New Pay Item Type'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Wages, Overtime, Health Insurance"
                  />
                </div>

                <div>
                  <Label className="text-xs">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value, sub_category: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {formData.category || 'Select category'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="Earnings">Earnings</SelectItem>
                      <SelectItem value="Deductions">Deductions</SelectItem>
                      <SelectItem value="Employer Contributions">Employer Contributions</SelectItem>
                      <SelectItem value="Reimbursements">Reimbursements</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Sub-Category</Label>
                  <Select
                    value={formData.sub_category}
                    onValueChange={(value) => setFormData({ ...formData, sub_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-category">
                        {formData.sub_category || 'Select sub-category'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {(SUB_CATEGORIES[formData.category] || []).map(subCat => (
                        <SelectItem key={subCat} value={subCat}>{subCat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Accounting Code</Label>
                  <Input
                    value={formData.accounting_code}
                    onChange={(e) => setFormData({ ...formData, accounting_code: e.target.value })}
                    placeholder="e.g., 5100-001"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    className="h-20"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingType ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          )}

          {/* List with Tabs */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="flex flex-wrap h-auto mb-4 bg-slate-100 p-1">
                {Object.keys(categoryColors).map(category => {
                  const count = Object.values(groupedTypes[category] || {}).flat().length;
                  return (
                    <TabsTrigger 
                      key={category} 
                      value={category}
                      className="flex-1 min-w-[120px]"
                    >
                      {category}
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-slate-200 text-slate-600">
                          {count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.keys(categoryColors).map(category => {
                const catData = groupedTypes[category] || {};
                const subCats = SUB_CATEGORIES[category] || [];
                
                return (
                  <TabsContent key={category} value={category} className="space-y-3 mt-0">
                    {subCats.map(subCat => {
                      const items = catData[subCat] || [];
                      const isExpanded = expandedSubCategories[subCat] !== false;
                      
                      return (
                        <div key={subCat} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleSubCategory(subCat)}
                            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                              )}
                              <span className="font-medium text-sm">{subCat}</span>
                              <Badge variant="secondary" className="h-5 px-1.5 bg-slate-200 text-slate-600">
                                {items.length}
                              </Badge>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="divide-y">
                              {items.length === 0 ? (
                                <div className="text-center py-4 text-slate-500 text-sm">
                                  No items in this sub-category
                                </div>
                              ) : (
                                items.map((type) => (
                                  <div
                                    key={type.id}
                                    className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{type.name}</div>
                                      {type.accounting_code && (
                                        <div className="text-xs text-slate-500">
                                          Code: {type.accounting_code}
                                        </div>
                                      )}
                                      {type.description && (
                                        <div className="text-xs text-slate-600">
                                          {type.description}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(type)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(type.id)}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Show items without sub-category */}
                    {catData['Other'] && catData['Other'].length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="p-3 bg-slate-50">
                          <span className="font-medium text-sm">Other</span>
                          <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-slate-200 text-slate-600">
                            {catData['Other'].length}
                          </Badge>
                        </div>
                        <div className="divide-y">
                          {catData['Other'].map((type) => (
                            <div
                              key={type.id}
                              className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm">{type.name}</div>
                                {type.accounting_code && (
                                  <div className="text-xs text-slate-500">
                                    Code: {type.accounting_code}
                                  </div>
                                )}
                                {type.description && (
                                  <div className="text-xs text-slate-600">
                                    {type.description}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(type)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(type.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}