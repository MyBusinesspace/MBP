import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Customer } from '@/entities/all';
import { useData } from '@/components/DataProvider';
import { Building2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const categoryColorConfig = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-800' },
  red: { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-100 text-red-800' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' },
  green: { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-800' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-800' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800', badge: 'bg-pink-100 text-pink-800' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-800', badge: 'bg-teal-100 text-teal-800' }
};

export default function AddClientPanel({ isOpen, onClose, onSuccess, categories = [], existingCustomers = [] }) {
  const { currentCompany } = useData();
  const [clientData, setClientData] = useState({
    name: '',
    category_ids: [],
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    license_number: ''
  });
  const [clientId, setClientId] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    console.log('🔍 [AddClientPanel] isOpen changed to:', isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !clientId) {
      console.log('✅ [AddClientPanel] Creating initial client...');
      createInitialClient();
    }
  }, [isOpen, clientId]);

  const createInitialClient = async () => {
    try {
      const newClient = await Customer.create({
        name: "New Client",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        tax_number: "",
        license_number: "",
        branch_id: currentCompany?.id,
        category_ids: []
      });
      
      setClientId(newClient.id);
      setClientData({
        name: newClient.name,
        category_ids: [],
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        tax_number: '',
        license_number: ''
      });
      
      console.log('✅ [AddClientPanel] Initial client created:', newClient.id);
    } catch (error) {
      console.error("❌ [AddClientPanel] Failed to create initial client:", error);
      toast.error("Failed to create client");
      onClose();
    }
  };

  useEffect(() => {
    if (!clientData.name || clientData.name === 'New Client') {
      setDuplicateWarning('');
      return;
    }

    const duplicate = existingCustomers.find(
      c => c.name.toLowerCase().trim() === clientData.name.toLowerCase().trim() && c.id !== clientId
    );

    if (duplicate) {
      setDuplicateWarning('⚠️ A client with this name already exists');
    } else {
      setDuplicateWarning('');
    }
  }, [clientData.name, existingCustomers, clientId]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!clientId) return;

    if (duplicateWarning) {
      console.log('⚠️ [AddClientPanel] Skipping save due to duplicate name');
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSaveClient();
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [clientData, clientId, duplicateWarning]);

  const autoSaveClient = async () => {
    if (!clientId || duplicateWarning || isSaving) return;

    setIsSaving(true);
    try {
      console.log('💾 [AddClientPanel] Auto-saving client:', clientId, clientData);
      await Customer.update(clientId, clientData);
      console.log('✅ [AddClientPanel] Auto-save successful');
      
      if (onSuccess) {
        console.log('📢 [AddClientPanel] Calling onSuccess');
        await onSuccess();
        console.log('✅ [AddClientPanel] onSuccess completed');
      }
      
    } catch (error) {
      console.error("❌ [AddClientPanel] Auto-save failed:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    console.log(`📝 [AddClientPanel] Field changed: ${field} =`, value);
    setClientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleCategory = (categoryId) => {
    setClientData(prev => {
      const currentCategories = prev.category_ids || [];
      const newCategories = currentCategories.includes(categoryId)
        ? currentCategories.filter(id => id !== categoryId)
        : [...currentCategories, categoryId];
      
      return {
        ...prev,
        category_ids: newCategories
      };
    });
  };

  const handleClose = async () => {
    console.log('❌ [AddClientPanel] handleClose called');
    
    if (duplicateWarning) {
      toast.error("Cannot save: A client with this name already exists");
      return;
    }

    if (clientId && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      await autoSaveClient();
    }
    
    setClientData({
      name: '',
      category_ids: [],
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      tax_number: '',
      license_number: ''
    });
    setClientId(null);
    isInitialMount.current = true;
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/50"
      />
      
      <div className="ml-auto w-full sm:max-w-xl bg-white shadow-2xl overflow-y-auto relative">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Add New Client</h2>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="hover:bg-slate-100"
              disabled={!!duplicateWarning}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            Changes are saved automatically as you type
            {isSaving && <span className="text-blue-600 ml-2">● Saving...</span>}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Client Name *
              </label>
              <Input
                value={clientData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter client name"
                className={`h-10 ${duplicateWarning ? 'border-red-500' : ''}`}
                autoFocus
              />
              {duplicateWarning && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  {duplicateWarning}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Categories
              </label>
              {categories.length === 0 ? (
                <p className="text-sm text-slate-500">No categories available</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const isSelected = (clientData.category_ids || []).includes(cat.id);
                    const colorConfig = categoryColorConfig[cat.color] || categoryColorConfig.gray;
                    
                    return (
                      <div
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all",
                          isSelected 
                            ? `${colorConfig.bg} border-${cat.color}-400 shadow-sm` 
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCategory(cat.id)}
                          className="pointer-events-none"
                        />
                        <span className={cn(
                          "text-sm font-medium",
                          isSelected ? colorConfig.text : "text-slate-700"
                        )}>
                          {cat.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Contact Information</h3>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Contact Person
              </label>
              <Input
                value={clientData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                placeholder="Enter contact person name"
                className="h-10"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={clientData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@example.com"
                className="h-10"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Phone
              </label>
              <Input
                type="tel"
                value={clientData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 234 567 8900"
                className="h-10"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Address
              </label>
              <Textarea
                value={clientData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Enter full address"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Business Information</h3>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Tax Number
              </label>
              <Input
                value={clientData.tax_number}
                onChange={(e) => handleChange('tax_number', e.target.value)}
                placeholder="Enter tax identification number"
                className="h-10"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                License Number
              </label>
              <Input
                value={clientData.license_number}
                onChange={(e) => handleChange('license_number', e.target.value)}
                placeholder="Enter business license number"
                className="h-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}