import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Archive, Settings as SettingsIcon, Save, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PayItem, PayItemType } from '@/entities/all';
import PayItemTypeManager from './PayItemTypeManager';

export default function PayItemsManager({ onRefresh }) {
  const [activeTab, setActiveTab] = useState('active');
  const [payItems, setPayItems] = useState([]);
  const [payItemTypes, setPayItemTypes] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    pay_item_type_id: '',
    paid_to: 'Employee',
    description: '',
    default_amount: 0,
    is_taxable: true,
    show_on_payslip: true,
    calculation_type: 'fixed'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [items, types] = await Promise.all([
        PayItem.list('sort_order', 1000),
        PayItemType.list('sort_order', 1000)
      ]);

      setPayItems(items);
      setPayItemTypes(types.filter(t => t.is_active !== false));
    } catch (error) {
      console.error('Failed to load pay items:', error);
      toast.error('Failed to load pay items');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = payItems.filter(item => {
    if (activeTab === 'active') return item.is_active !== false;
    return item.is_active === false;
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.pay_item_type_id) {
      toast.error('Please fill in name and pay item type');
      return;
    }

    try {
      if (editingItem) {
        await PayItem.update(editingItem.id, formData);
        toast.success('Pay item updated');
      } else {
        await PayItem.create(formData);
        toast.success('Pay item created');
      }

      await loadData();
      await onRefresh();
      handleCancel();
    } catch (error) {
      console.error('Failed to save pay item:', error);
      toast.error('Failed to save pay item');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      pay_item_type_id: item.pay_item_type_id,
      paid_to: item.paid_to || 'Employee',
      description: item.description || '',
      default_amount: item.default_amount || 0,
      is_taxable: item.is_taxable !== false,
      show_on_payslip: item.show_on_payslip !== false,
      calculation_type: item.calculation_type || 'fixed'
    });
    setShowForm(true);
  };

  const handleArchive = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Archive ${selectedItems.length} pay item(s)?`)) return;

    try {
      await Promise.all(
        selectedItems.map(id => PayItem.update(id, { is_active: false }))
      );

      toast.success(`${selectedItems.length} pay item(s) archived`);
      setSelectedItems([]);
      await loadData();
      await onRefresh();
    } catch (error) {
      console.error('Failed to archive pay items:', error);
      toast.error('Failed to archive pay items');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      name: '',
      pay_item_type_id: '',
      paid_to: 'Employee',
      description: '',
      default_amount: 0,
      is_taxable: true,
      show_on_payslip: true,
      calculation_type: 'fixed'
    });
  };

  const toggleSelection = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const getPayItemTypeName = (typeId) => {
    const type = payItemTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown';
  };

  const getPayItemTypeCategory = (typeId) => {
    const type = payItemTypes.find(t => t.id === typeId);
    return type?.category || '';
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowForm(true)} size="sm" disabled={showForm}>
            <Plus className="w-4 h-4 mr-2" />
            New Pay Item
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTypeManager(true)}
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            Manage Pay Item Types
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {editingItem ? 'Edit Pay Item' : 'New Pay Item'}
            </h3>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Basic Salary, Housing Allowance"
              />
            </div>

            <div>
              <Label className="text-xs">Pay Item Type *</Label>
              <Select
                value={formData.pay_item_type_id}
                onValueChange={(value) => setFormData({ ...formData, pay_item_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {payItemTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span>{type.name}</span>
                        <span className="text-xs text-slate-500">({type.category})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Paid To</Label>
              <Select
                value={formData.paid_to}
                onValueChange={(value) => setFormData({ ...formData, paid_to: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Employer">Employer</SelectItem>
                  <SelectItem value="Tax Authority">Tax Authority</SelectItem>
                  <SelectItem value="Pension Fund">Pension Fund</SelectItem>
                  <SelectItem value="Insurance Provider">Insurance Provider</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Calculation Type</Label>
              <Select
                value={formData.calculation_type}
                onValueChange={(value) => setFormData({ ...formData, calculation_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="hourly_rate">Hourly Rate</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_taxable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked })}
              />
              <Label className="text-xs cursor-pointer">Is Taxable</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.show_on_payslip}
                onCheckedChange={(checked) => setFormData({ ...formData, show_on_payslip: checked })}
              />
              <Label className="text-xs cursor-pointer">Show on Payslip</Label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          {selectedItems.length > 0 && activeTab === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive ({selectedItems.length})
            </Button>
          )}
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <p className="text-slate-500">
                {activeTab === 'active' ? 'No active pay items' : 'No archived pay items'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === filteredItems.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="text-left p-3 font-medium text-slate-700">Name</th>
                    <th className="text-left p-3 font-medium text-slate-700">Pay Item Type</th>
                    <th className="text-left p-3 font-medium text-slate-700">Paid To</th>
                    <th className="text-center p-3 font-medium text-slate-700">On Payslip</th>
                    <th className="text-right p-3 font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const typeName = getPayItemTypeName(item.pay_item_type_id);
                    const typeCategory = getPayItemTypeCategory(item.pay_item_type_id);

                    return (
                      <tr key={item.id} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div>{typeName}</div>
                          <div className="text-xs text-slate-500">{typeCategory}</div>
                        </td>
                        <td className="p-3 text-slate-700">
                          <span className="text-xs italic">{item.paid_to || 'Employee'}</span>
                        </td>
                        <td className="p-3 text-center">
                          {item.show_on_payslip !== false && (
                            <CheckCircle className="w-5 h-5 text-green-600 inline" />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pay Item Type Manager Dialog */}
      {showTypeManager && (
        <PayItemTypeManager
          isOpen={showTypeManager}
          onClose={() => setShowTypeManager(false)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}