import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Info } from 'lucide-react';
import { toast } from "sonner";
import { calculateDepreciation } from './DepreciationCalculator';
import { CurrencyIcon } from '../../Layout';

const categories = ["Vehicle", "Tool", "IT Equipment", "Uniform", "Other"];
const statuses = ["Available", "In Use", "Maintenance", "Decommissioned"];
const depreciationMethods = ["Straight Line", "Declining Balance", "Double Declining Balance", "No Depreciation"];

export default function AssetForm({ isOpen, onClose, asset, onSave, users, projects }) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [depreciationPreview, setDepreciationPreview] = useState(null);

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        category: asset.category || 'Tool',
        status: asset.status || 'Available',
        identifier: asset.identifier || '',
        assigned_to_user_id: asset.assigned_to_user_id || null,
        project_id: asset.project_id || null,
        purchase_date: asset.purchase_date || '',
        purchase_cost: asset.purchase_cost || '',
        depreciation_method: asset.depreciation_method || 'Straight Line',
        useful_life_years: asset.useful_life_years || 5,
        salvage_value: asset.salvage_value || 0,
        notes: asset.notes || ''
      });
    } else {
      setFormData({
        name: '',
        category: 'Tool',
        status: 'Available',
        identifier: '',
        assigned_to_user_id: null,
        project_id: null,
        purchase_date: '',
        purchase_cost: '',
        depreciation_method: 'Straight Line',
        useful_life_years: 5,
        salvage_value: 0,
        notes: ''
      });
    }
  }, [asset, isOpen]);

  // Calculate depreciation preview when relevant fields change
  useEffect(() => {
    if (formData.purchase_cost && formData.purchase_date && formData.depreciation_method !== 'No Depreciation') {
      const preview = calculateDepreciation({
        purchase_cost: parseFloat(formData.purchase_cost),
        purchase_date: formData.purchase_date,
        depreciation_method: formData.depreciation_method,
        useful_life_years: formData.useful_life_years || 5,
        salvage_value: parseFloat(formData.salvage_value) || 0
      });
      setDepreciationPreview(preview);
    } else {
      setDepreciationPreview(null);
    }
  }, [formData.purchase_cost, formData.purchase_date, formData.depreciation_method, formData.useful_life_years, formData.salvage_value]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
        toast.error("Asset name is required.");
        return;
    }
    setIsLoading(true);

    // Calculate current depreciation values
    const depreciation = calculateDepreciation({
      purchase_cost: parseFloat(formData.purchase_cost) || 0,
      purchase_date: formData.purchase_date,
      depreciation_method: formData.depreciation_method,
      useful_life_years: formData.useful_life_years || 5,
      salvage_value: parseFloat(formData.salvage_value) || 0
    });

    const dataToSave = {
      ...formData,
      purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
      useful_life_years: formData.useful_life_years ? parseInt(formData.useful_life_years) : 5,
      salvage_value: formData.salvage_value ? parseFloat(formData.salvage_value) : 0,
      current_value: depreciation.current_value,
      accumulated_depreciation: depreciation.accumulated_depreciation,
      assigned_to_user_id: formData.assigned_to_user_id === 'null' ? null : formData.assigned_to_user_id,
      project_id: formData.project_id === 'null' ? null : formData.project_id
    };

    try {
      if (asset?.id) {
        await base44.entities.Asset.update(asset.id, dataToSave);
      } else {
        await base44.entities.Asset.create(dataToSave);
      }
      onSave();
    } catch (error) {
      console.error("Failed to save asset:", error);
      toast.error("Failed to save asset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Create New Asset'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="e.g., Milwaukee M18 Drill"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={formData.category} onValueChange={(val) => handleChange('category', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Identifier / Serial Number</label>
              <Input
                placeholder="Serial, VIN, Asset Tag..."
                value={formData.identifier}
                onChange={(e) => handleChange('identifier', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned To</label>
              <Select value={formData.assigned_to_user_id || 'null'} onValueChange={(val) => handleChange('assigned_to_user_id', val)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Unassigned</SelectItem>
                  {users?.map(user => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Project</label>
              <Select value={formData.project_id || 'null'} onValueChange={(val) => handleChange('project_id', val)}>
                <SelectTrigger><SelectValue placeholder="No Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">No Project</SelectItem>
                  {projects?.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Financial & Depreciation Section */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Financial & Depreciation
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Date</label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Cost</label>
              <div className="flex items-center gap-2">
                <CurrencyIcon className="w-4 h-4 text-slate-400 text-[10px]" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.purchase_cost}
                  onChange={(e) => handleChange('purchase_cost', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Depreciation Method</label>
              <Select value={formData.depreciation_method} onValueChange={(val) => handleChange('depreciation_method', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {depreciationMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.depreciation_method !== 'No Depreciation' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Useful Life (Years)</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.useful_life_years}
                    onChange={(e) => handleChange('useful_life_years', e.target.value)}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Salvage Value</label>
                  <div className="flex items-center gap-2">
                    <CurrencyIcon className="w-4 h-4 text-slate-400 text-[10px]" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.salvage_value}
                      onChange={(e) => handleChange('salvage_value', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-slate-500">Expected value at end of useful life</p>
                </div>

                {depreciationPreview && (
                  <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-blue-900">Depreciation Preview</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600">Current Value:</span>
                        <div className="font-semibold text-blue-700 flex items-center gap-1">
                          <CurrencyIcon className="w-3 h-3 text-[8px]" />
                          {depreciationPreview.current_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Accumulated Depreciation:</span>
                        <div className="font-semibold text-red-600 flex items-center gap-1">
                          <CurrencyIcon className="w-3 h-3 text-[8px]" />
                          {depreciationPreview.accumulated_depreciation.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Annual Depreciation:</span>
                        <div className="font-semibold text-slate-700 flex items-center gap-1">
                          <CurrencyIcon className="w-3 h-3 text-[8px]" />
                          {depreciationPreview.annual_depreciation.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Depreciation Rate:</span>
                        <div className="font-semibold text-slate-700">
                          {depreciationPreview.depreciation_rate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Any additional details..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}