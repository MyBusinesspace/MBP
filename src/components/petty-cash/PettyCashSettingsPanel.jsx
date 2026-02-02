
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, Shield, Tag, Link2, Plus, Trash2, Pencil, Save, X as XIcon } from 'lucide-react';
import { AppSettings, PettyCashCategory } from '@/entities/all';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'Dhs', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' }
];

const COLOR_OPTIONS = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' }
];

export default function PettyCashSettingsPanel({ isOpen, onClose, onSettingsChanged }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Currency settings
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [decimalSeparator, setDecimalSeparator] = useState('.');
  const [decimalPlaces, setDecimalPlaces] = useState(2);

  // Permission settings
  const [allowUsersToAddInput, setAllowUsersToAddInput] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState('own'); // 'all', 'own', 'team'

  // Categories
  const [categories, setCategories] = useState([]);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: 'blue' });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load app settings
      const allSettings = await AppSettings.list();

      const currencySetting = allSettings.find(s => s.setting_key === 'petty_cash_currency');
      const decimalSepSetting = allSettings.find(s => s.setting_key === 'petty_cash_decimal_separator');
      const decimalPlacesSetting = allSettings.find(s => s.setting_key === 'petty_cash_decimal_places');
      const allowUserInputSetting = allSettings.find(s => s.setting_key === 'petty_cash_allow_user_input');
      const visibilitySetting = allSettings.find(s => s.setting_key === 'petty_cash_visibility');

      setCurrencyCode(currencySetting?.setting_value || 'USD');
      setDecimalSeparator(decimalSepSetting?.setting_value || '.');
      setDecimalPlaces(decimalPlacesSetting ? parseInt(decimalPlacesSetting.setting_value) : 2);
      setAllowUsersToAddInput(allowUserInputSetting?.setting_value === 'true');
      setVisibilityMode(visibilitySetting?.setting_value || 'own');

      // Load categories
      const categoriesData = await PettyCashCategory.list('sort_order');
      setCategories(categoriesData || []);

    } catch (error) {
      console.error('Failed to load settings:', error);
      // toast.error('Failed to load settings'); // Removed toast
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allSettings = await AppSettings.list();

      const settingsToSave = [
        { key: 'petty_cash_currency', value: currencyCode, type: 'string', description: 'Currency code for petty cash' },
        { key: 'petty_cash_decimal_separator', value: decimalSeparator, type: 'string', description: 'Decimal separator (. or ,)' },
        { key: 'petty_cash_decimal_places', value: decimalPlaces.toString(), type: 'number', description: 'Number of decimal places' },
        { key: 'petty_cash_allow_user_input', value: allowUsersToAddInput.toString(), type: 'boolean', description: 'Allow users to add money inputs' },
        { key: 'petty_cash_visibility', value: visibilityMode, type: 'string', description: 'Who can view petty cash balances' }
      ];

      for (const setting of settingsToSave) {
        const existing = allSettings.find(s => s.setting_key === setting.key);
        if (existing) {
          await AppSettings.update(existing.id, { setting_value: setting.value });
        } else {
          await AppSettings.create({
            setting_key: setting.key,
            setting_value: setting.value,
            setting_type: setting.type,
            description: setting.description
          });
        }
      }

      // toast.success('Settings saved successfully'); // Removed toast
      if (onSettingsChanged) onSettingsChanged();
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      // toast.error('Failed to save settings'); // Removed toast
    } finally {
      setSaving(false);
    }
  };

  // Category management
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      // toast.error('Category name is required'); // Removed toast
      return;
    }

    try {
      await PettyCashCategory.create({
        ...newCategory,
        sort_order: categories.length
      });
      
      setNewCategory({ name: '', color: 'blue' });
      
      const updatedCategories = await PettyCashCategory.list('sort_order');
      setCategories(updatedCategories);
      
      // toast.success('Category added'); // Removed toast
      if (onSettingsChanged) onSettingsChanged();
    } catch (error) {
      console.error('Failed to add category:', error);
      // toast.error('Failed to add category'); // Removed toast
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setNewCategory({ name: category.name, color: category.color });
  };

  const handleUpdateCategory = async () => {
    if (!newCategory.name.trim() || !editingCategoryId) return;

    try {
      await PettyCashCategory.update(editingCategoryId, newCategory);
      
      const updatedCategories = await PettyCashCategory.list('sort_order');
      setCategories(updatedCategories);
      
      setEditingCategoryId(null);
      setNewCategory({ name: '', color: 'blue' });
      
      // toast.success('Category updated'); // Removed toast
      if (onSettingsChanged) onSettingsChanged();
    } catch (error) {
      console.error('Failed to update category:', error);
      // toast.error('Failed to update category'); // Removed toast
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await PettyCashCategory.delete(categoryId);
      
      const updatedCategories = await PettyCashCategory.list('sort_order');
      setCategories(updatedCategories);
      
      // toast.success('Category deleted'); // Removed toast
      if (onSettingsChanged) onSettingsChanged();
    } catch (error) {
      console.error('Failed to delete category:', error);
      // toast.error('Failed to delete category'); // Removed toast
    }
  };

  const cancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setNewCategory({ name: '', color: 'blue' });
  };

  if (loading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-600">Loading settings...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const selectedCurrency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Petty Cash Settings
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="currency" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="currency" className="text-xs">
              <Coins className="w-4 h-4 mr-1" />
              Currency
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs">
              <Shield className="w-4 h-4 mr-1" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">
              <Tag className="w-4 h-4 mr-1" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs">
              <Link2 className="w-4 h-4 mr-1" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Currency Settings */}
          <TabsContent value="currency" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Currency Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currencyCode} onValueChange={setCurrencyCode}>
                    <SelectTrigger className="mt-2">
                      <SelectValue>
                        {selectedCurrency && (
                          <span>{selectedCurrency.symbol} {selectedCurrency.name} ({selectedCurrency.code})</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Select the currency for petty cash transactions
                  </p>
                </div>

                <div>
                  <Label htmlFor="decimal-separator">Decimal Separator</Label>
                  <Select value={decimalSeparator} onValueChange={setDecimalSeparator}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=".">Period (.) - e.g., 1,234.56</SelectItem>
                      <SelectItem value=",">Comma (,) - e.g., 1.234,56</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose how decimal values are displayed
                  </p>
                </div>

                <div>
                  <Label htmlFor="decimal-places">Decimal Places</Label>
                  <Select value={decimalPlaces.toString()} onValueChange={(v) => setDecimalPlaces(parseInt(v))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 decimals (1234)</SelectItem>
                      <SelectItem value="1">1 decimal (1234.5)</SelectItem>
                      <SelectItem value="2">2 decimals (1234.56)</SelectItem>
                      <SelectItem value="3">3 decimals (1234.567)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Number of decimal places to show
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Preview:</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {selectedCurrency?.symbol}1{decimalSeparator === ',' ? '.' : ','}234{decimalSeparator}{new Array(decimalPlaces).fill('5').join('')}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Permissions Settings */}
          <TabsContent value="permissions" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Access Permissions</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label htmlFor="allow-user-input" className="text-base font-medium">
                      Allow users to add money inputs
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      By default, only admins can add money inputs. Enable this to allow all users.
                    </p>
                  </div>
                  <Switch
                    id="allow-user-input"
                    checked={allowUsersToAddInput}
                    onCheckedChange={setAllowUsersToAddInput}
                  />
                </div>

                <div>
                  <Label>Balance Visibility</Label>
                  <Select value={visibilityMode} onValueChange={setVisibilityMode}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All employees can see all balances</SelectItem>
                      <SelectItem value="own">Employees can only see their own balance</SelectItem>
                      <SelectItem value="team">Employees can see their team's balances</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Control who can view petty cash balances (Admins always see everything)
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Admins always have full access to add expenses, inputs, and view all balances regardless of these settings.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Categories Settings */}
          <TabsContent value="categories" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Petty Cash Categories</h3>
              
              <div className="space-y-3 mb-6">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    {editingCategoryId === category.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                          placeholder="Category name"
                          className="flex-1"
                        />
                        <Select
                          value={newCategory.color}
                          onValueChange={(v) => setNewCategory({...newCategory, color: v})}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_OPTIONS.map(color => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-4 h-4 rounded", color.class)} />
                                  <span>{color.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleUpdateCategory}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelCategoryEdit}>
                          <XIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-4 h-4 rounded", `bg-${category.color}-500`)} />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEditCategory(category)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {!editingCategoryId && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                  <Label>Add New Category</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Category name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <Select
                      value={newCategory.color}
                      onValueChange={(v) => setNewCategory({...newCategory, color: v})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-4 h-4 rounded", color.class)} />
                              <span>{color.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddCategory}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-600">Press Enter to add quickly</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Integrations Settings */}
          <TabsContent value="integrations" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Accounting Integrations</h3>
              <p className="text-sm text-slate-600 mb-6">
                Connect with external accounting software to sync petty cash transactions
              </p>

              <div className="space-y-3">
                {[
                  { name: 'Soho', logo: '📊', description: 'Sync with Soho accounting software' },
                  { name: 'Xero', logo: '💼', description: 'Connect to Xero cloud accounting' },
                  { name: 'Tally', logo: '📈', description: 'Integrate with Tally ERP' },
                  { name: 'Microsoft 365', logo: '🏢', description: 'Sync with Microsoft Excel/Teams' }
                ].map(integration => (
                  <div key={integration.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{integration.logo}</span>
                        <div>
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-xs text-slate-500">{integration.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-6">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Integration features are under development and will be available in a future update.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
