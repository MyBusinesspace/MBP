import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function WorkOrderSettings({ isOpen, onClose, settings, onSettingsChange }) {
  const handleToggle = (key) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  const handleWeekStartChange = (value) => {
    onSettingsChange({
      ...settings,
      weekStartsOn: parseInt(value)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Work Order Display Settings</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Visibility Options</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-shifts" className="text-sm font-normal">
                  Show Shift Types
                </Label>
                <p className="text-xs text-slate-500">
                  Display shift type badges with time ranges on work orders
                </p>
              </div>
              <Switch
                id="show-shifts"
                checked={settings.showShifts}
                onCheckedChange={() => handleToggle('showShifts')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-categories" className="text-sm font-normal">
                  Show Categories
                </Label>
                <p className="text-xs text-slate-500">
                  Display category selector on work orders
                </p>
              </div>
              <Switch
                id="show-categories"
                checked={settings.showCategories}
                onCheckedChange={() => handleToggle('showCategories')}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Week Settings</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="week-start" className="text-sm font-normal">
                  Week Starts On
                </Label>
                <p className="text-xs text-slate-500">
                  Choose which day your work week begins
                </p>
              </div>
              <Select
                value={String(settings.weekStartsOn || 1)}
                onValueChange={handleWeekStartChange}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <p>💡 <strong>Tip:</strong> You can hide shifts and categories if you want a cleaner, more compact view of your work orders.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}