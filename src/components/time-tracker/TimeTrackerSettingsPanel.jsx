import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings,
  MapPin,
  Camera,
  Save,
  Clock,
  X,
  ImageIcon,
  Upload,
  Pencil
} from 'lucide-react';
import { AppSettings, Branch } from '@/entities/all';
import { toast } from 'sonner';
import { useData } from '../DataProvider';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '../users/ImageCropDialog';

export default function TimeTrackerSettingsPanel({ isOpen, onClose, onRefresh }) {
  const { currentCompany, setCurrentCompany } = useData();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // Tab icons state
  const [timeTrackerTabIconUrl, setTimeTrackerTabIconUrl] = useState(currentCompany?.time_tracker_tab_icon_url || '');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  
  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    track_gps: true,
    require_photo_clock_in: false,
    require_photo_clock_out: false,
    require_photo_switch: false,
    allow_manual_edit: true,
    require_work_order: true,
    alarm_enabled: true,
    alarm_minutes_before: 5
  });

  // Hours Settings
  const [hoursSettings, setHoursSettings] = useState({
    regular_hours_per_day: 8,
    non_payable_overtime_hours: 0,
    overtime_multiplier: 1.5
  });

  // Location Settings
  const [locationSettings, setLocationSettings] = useState({
    gps_accuracy_threshold: 50,
    tracking_interval_minutes: 30 // NEW: tracking interval in minutes
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setTimeTrackerTabIconUrl(currentCompany?.time_tracker_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  const loadSettings = async () => {
    try {
      const settings = await AppSettings.list('setting_key', 1000);

      // Load general settings
      const tempGeneralSettings = {};
      settings.forEach(setting => {
        if (setting.setting_key.startsWith('timesheet_')) {
          const key = setting.setting_key.replace('timesheet_', '');
          if (['track_gps', 'require_photo_clock_in', 'require_photo_clock_out', 'require_photo_switch', 'allow_manual_edit', 'require_work_order', 'alarm_enabled'].includes(key)) {
            tempGeneralSettings[key] = setting.setting_value === 'true';
          } else if (key === 'alarm_minutes_before') {
            tempGeneralSettings[key] = parseInt(setting.setting_value) || 5;
          }
        }
      });
      if (Object.keys(tempGeneralSettings).length > 0) {
        setGeneralSettings(prev => ({ ...prev, ...tempGeneralSettings }));
      }

      // Load hours settings
      const tempHoursSettings = {};
      settings.forEach(setting => {
        if (setting.setting_key.startsWith('timesheet_hours_')) {
          const key = setting.setting_key.replace('timesheet_hours_', '');
          tempHoursSettings[key] = parseFloat(setting.setting_value) || 0;
        }
      });
      if (Object.keys(tempHoursSettings).length > 0) {
        setHoursSettings(prev => ({ ...prev, ...tempHoursSettings }));
      }

      // Load location settings
      const tempLocationSettings = {};
      settings.forEach(setting => {
        if (setting.setting_key.startsWith('timesheet_location_')) {
          const key = setting.setting_key.replace('timesheet_location_', '');
          // Check for specific keys to parse correctly, or use default if not found
          if (key === 'gps_accuracy_threshold') {
            tempLocationSettings[key] = parseFloat(setting.setting_value) || 50;
          } else if (key === 'tracking_interval_minutes') { // Updated key for loading
            tempLocationSettings[key] = parseFloat(setting.setting_value) || 30;
          }
        }
      });
      if (Object.keys(tempLocationSettings).length > 0) {
        setLocationSettings(prev => ({ ...prev, ...tempLocationSettings }));
      }

    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const saveGeneralSettings = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(generalSettings)) {
        const settingKey = `timesheet_${key}`;
        const existing = await AppSettings.filter({ setting_key: settingKey });

        const settingValue = typeof value === 'boolean' ? value.toString() : value.toString();
        const settingType = typeof value === 'boolean' ? 'boolean' : 'number';

        if (existing.length > 0) {
          await AppSettings.update(existing[0].id, {
            setting_value: settingValue,
            setting_type: settingType
          });
        } else {
          await AppSettings.create({
            setting_key: settingKey,
            setting_value: settingValue,
            setting_type: settingType,
            description: `Timesheet general setting: ${key}`
          });
        }
      }

      toast.success('General settings saved successfully');
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to save general settings:', error);
      toast.error('Failed to save general settings');
    } finally {
      setIsSaving(false);
    }
  };

  const saveHoursSettings = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(hoursSettings)) {
        const settingKey = `timesheet_hours_${key}`;
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
            description: `Timesheet hours setting: ${key}`
          });
        }
      }

      toast.success('Hours settings saved successfully');
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to save hours settings:', error);
      toast.error('Failed to save hours settings');
    } finally {
      setIsSaving(false);
    }
  };

  const saveLocationSettings = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(locationSettings)) {
        const settingKey = `timesheet_location_${key}`;
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
            description: `Timesheet location setting: ${key}`
          });
        }
      }

      toast.success('Location settings saved successfully');
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to save location settings:', error);
      toast.error('Failed to save location settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] flex flex-col p-0 overflow-y-auto">
        <SheetHeader className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-indigo-600" />
              Time Tracker Settings
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="gap-2">
                <Settings className="w-4 h-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="hours" className="gap-2">
                <Clock className="w-4 h-4" />
                Hours
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-2">
                <Camera className="w-4 h-4" />
                Photos
              </TabsTrigger>
              <TabsTrigger value="tab-icons" className="gap-2">
                <ImageIcon className="w-4 h-4" />
                Tab Icons
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Track GPS Location</Label>
                    <p className="text-xs text-slate-500 mt-1">Record location when clocking in/out</p>
                  </div>
                  <Switch
                    checked={generalSettings.track_gps}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, track_gps: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Require Work Order</Label>
                    <p className="text-xs text-slate-500 mt-1">Employees must select work order to clock in</p>
                  </div>
                  <Switch
                    checked={generalSettings.require_work_order}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, require_work_order: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Allow Manual Edit</Label>
                    <p className="text-xs text-slate-500 mt-1">Employees can edit their timesheet times</p>
                  </div>
                  <Switch
                    checked={generalSettings.allow_manual_edit}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, allow_manual_edit: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Enable Alarms</Label>
                    <p className="text-xs text-slate-500 mt-1">Notify employees before work order start time</p>
                  </div>
                  <Switch
                    checked={generalSettings.alarm_enabled}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, alarm_enabled: checked })}
                  />
                </div>

                {generalSettings.alarm_enabled && (
                  <div>
                    <Label className="text-sm font-medium">Alarm Minutes Before</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      value={generalSettings.alarm_minutes_before}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, alarm_minutes_before: parseInt(e.target.value) || 5 })}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveGeneralSettings} disabled={isSaving} className="bg-indigo-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save General Settings
                </Button>
              </div>
            </TabsContent>

            {/* Hours Tab */}
            <TabsContent value="hours" className="space-y-4 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  Configure how regular hours, non-payable overtime, and paid overtime are calculated for payroll.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Regular Hours Per Day</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={hoursSettings.regular_hours_per_day}
                    onChange={(e) => setHoursSettings({ ...hoursSettings, regular_hours_per_day: parseFloat(e.target.value) || 8 })}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Standard working hours per day</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Non-Payable Overtime Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="8"
                    value={hoursSettings.non_payable_overtime_hours}
                    onChange={(e) => setHoursSettings({ ...hoursSettings, non_payable_overtime_hours: parseFloat(e.target.value) || 0 })}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Extra hours that don't count as paid overtime</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Overtime Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="3"
                    value={hoursSettings.overtime_multiplier}
                    onChange={(e) => setHoursSettings({ ...hoursSettings, overtime_multiplier: parseFloat(e.target.value) || 1.5 })}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Pay rate multiplier for overtime (1.5 = time and a half)</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-sm mb-3">Calculation Example</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Hours:</span>
                      <span className="font-medium">11 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Regular Hours:</span>
                      <span className="font-medium text-green-600">{hoursSettings.regular_hours_per_day}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Non-Payable OT:</span>
                      <span className="font-medium text-orange-600">
                        {Math.min(hoursSettings.non_payable_overtime_hours, 11 - hoursSettings.regular_hours_per_day)}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Paid OT (×{hoursSettings.overtime_multiplier}):</span>
                      <span className="font-medium text-blue-600">
                        {Math.max(0, 11 - hoursSettings.regular_hours_per_day - hoursSettings.non_payable_overtime_hours)}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveHoursSettings} disabled={isSaving} className="bg-indigo-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save Hours Settings
                </Button>
              </div>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  Configure GPS tracking settings including accuracy requirements and how often location points are recorded during active timesheets.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">GPS Accuracy Threshold (meters)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="500"
                    value={locationSettings.gps_accuracy_threshold}
                    onChange={(e) => setLocationSettings({ ...locationSettings, gps_accuracy_threshold: parseFloat(e.target.value) || 50 })}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum GPS accuracy required for location tracking</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Tracking Interval</Label>
                  <Select
                    value={locationSettings.tracking_interval_minutes.toString()}
                    onValueChange={(value) => setLocationSettings({ ...locationSettings, tracking_interval_minutes: parseFloat(value) })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">
                        <div className="flex items-center gap-2">
                          <span>Disabled</span>
                          <span className="text-xs text-slate-500">(No automatic tracking)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every 1 hour</SelectItem>
                      <SelectItem value="120">Every 2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    How often to record GPS location while employees are clocked in. Set to 0 to disable automatic tracking.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-sm mb-3">Current Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">GPS Accuracy:</span>
                      <span className="font-medium">{locationSettings.gps_accuracy_threshold}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tracking Interval:</span>
                      <span className="font-medium">
                        {locationSettings.tracking_interval_minutes === 0
                          ? 'Disabled'
                          : locationSettings.tracking_interval_minutes < 60
                            ? `${locationSettings.tracking_interval_minutes} minutes`
                            : `${locationSettings.tracking_interval_minutes / 60} hour${locationSettings.tracking_interval_minutes / 60 > 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-amber-900">
                    <strong>Note:</strong> GPS tracking pins are automatically recorded at clock-in and clock-out regardless of this interval setting. This setting only affects automatic tracking during active timesheets.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveLocationSettings} disabled={isSaving} className="bg-indigo-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save Location Settings
                </Button>
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Require Photo on Clock In</Label>
                    <p className="text-xs text-slate-500 mt-1">Employees must take photo when clocking in</p>
                  </div>
                  <Switch
                    checked={generalSettings.require_photo_clock_in}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, require_photo_clock_in: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Require Photo on Clock Out</Label>
                    <p className="text-xs text-slate-500 mt-1">Employees must take photo when clocking out</p>
                  </div>
                  <Switch
                    checked={generalSettings.require_photo_clock_out}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, require_photo_clock_out: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Require Photo on Work Order Switch</Label>
                    <p className="text-xs text-slate-500 mt-1">Employees must take photo when switching work orders</p>
                  </div>
                  <Switch
                    checked={generalSettings.require_photo_switch}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, require_photo_switch: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveGeneralSettings} disabled={isSaving} className="bg-indigo-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save Photo Settings
                </Button>
              </div>
            </TabsContent>

            {/* Tab Icons Tab */}
            <TabsContent value="tab-icons" className="space-y-4 mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
                  <p className="text-xs text-slate-500 mb-4">Customize the icon shown on the "Time Tracker" tab.</p>
                </div>

                {/* Time Tracker Tab Icon */}
                <div className="p-4 border rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${timeTrackerTabIconUrl ? '' : 'bg-blue-100'}`}>
                      {timeTrackerTabIconUrl ? (
                        <img src={timeTrackerTabIconUrl} alt="Time Tracker icon" className="w-10 h-10 object-contain" />
                      ) : (
                        <img src="https://cdn-icons-png.flaticon.com/512/2838/2838779.png" alt="Time Tracker default" className="w-10 h-10 object-contain" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-slate-800">Time Tracker Tab Icon</h4>
                      <p className="text-xs text-slate-500">Default: Clock with tools icon</p>
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
                      id="time-tracker-tab-icon-upload"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button" 
                      disabled={uploadingIcon}
                      onClick={() => document.getElementById('time-tracker-tab-icon-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                    </Button>
                    {timeTrackerTabIconUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCropImageSrc(timeTrackerTabIconUrl);
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
                              await Branch.update(currentCompany.id, { time_tracker_tab_icon_url: null });
                              const updatedCompany = { ...currentCompany, time_tracker_tab_icon_url: null };
                              setTimeTrackerTabIconUrl('');
                              if (setCurrentCompany) {
                                setCurrentCompany(updatedCompany);
                                localStorage.setItem('currentCompany', JSON.stringify(updatedCompany));
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
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Image Crop Dialog */}
        <ImageCropDialog
          isOpen={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setCropImageSrc('');
          }}
          imageUrl={cropImageSrc}
          onSave={async (croppedBlob) => {
            if (!currentCompany?.id) return;
            
            setUploadingIcon(true);
            
            try {
              const file = new File([croppedBlob], 'time-tracker-tab-icon.png', { type: 'image/png' });
              const result = await base44.integrations.Core.UploadFile({ file });
              
              await Branch.update(currentCompany.id, { time_tracker_tab_icon_url: result.file_url });
              
              const updatedCompany = { ...currentCompany, time_tracker_tab_icon_url: result.file_url };
              setTimeTrackerTabIconUrl(result.file_url);
              if (setCurrentCompany) {
                setCurrentCompany(updatedCompany);
                localStorage.setItem('currentCompany', JSON.stringify(updatedCompany));
              }
              
              toast.success('Icon updated!');
              if (onRefresh) onRefresh();
            } catch (error) {
              console.error('Error saving icon:', error);
              toast.error('Failed to save icon');
            } finally {
              setUploadingIcon(false);
              setCropDialogOpen(false);
              setCropImageSrc('');
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}