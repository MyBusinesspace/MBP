import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Loader2 } from 'lucide-react';
import { ClientEquipment } from '@/entities/all';

export default function AddEquipmentPanel({ isOpen, onClose, customerId, projectId, onSuccess }) {
  const [equipmentId, setEquipmentId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: customerId,
    project_id: projectId,
    name: '',
    brand: '',
    serial_number: '',
    year_of_manufacture: '',
    notes: '',
    document_urls: []
  });

  useEffect(() => {
    if (customerId || projectId) {
      setFormData(prev => ({ 
        ...prev, 
        customer_id: customerId,
        project_id: projectId 
      }));
    }
  }, [customerId, projectId]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setEquipmentId(null);
        setFormData({
          customer_id: customerId,
          project_id: projectId,
          name: '',
          brand: '',
          serial_number: '',
          year_of_manufacture: '',
          notes: '',
          document_urls: []
        });
      }, 300);
    }
  }, [isOpen, customerId, projectId]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('Equipment name is required');
      return;
    }

    setIsSaving(true);
    try {
      let finalId = equipmentId;
      
      if (!equipmentId) {
        const newEquipment = await ClientEquipment.create(formData);
        finalId = newEquipment.id;
        setEquipmentId(finalId);
      } else {
        await ClientEquipment.update(equipmentId, formData);
      }
      
      if (onSuccess) await onSuccess(finalId);
      
    } catch (error) {
      console.error('Failed to save equipment:', error);
      alert('Failed to save equipment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold">
              New Equipment
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Equipment Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter equipment name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand" className="text-sm font-medium">
              Brand
            </Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="e.g., Caterpillar, JCB"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial" className="text-sm font-medium">
              Serial Number
            </Label>
            <Input
              id="serial"
              value={formData.serial_number}
              onChange={(e) => handleChange('serial_number', e.target.value)}
              placeholder="Serial number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year" className="text-sm font-medium">
              Year of Manufacture
            </Label>
            <Input
              id="year"
              value={formData.year_of_manufacture}
              onChange={(e) => handleChange('year_of_manufacture', e.target.value)}
              placeholder="e.g., 2020"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !formData.name}
              className="w-full gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Equipment
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}