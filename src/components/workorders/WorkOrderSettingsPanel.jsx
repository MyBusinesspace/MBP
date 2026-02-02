import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Settings, Upload, Pencil, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkOrderCategoryManager from './WorkOrderCategoryManager';
import ShiftTypeManager from './ShiftTypeManager';
import OrderDocumentTypeManager from './OrderDocumentTypeManager';
import WorkOrderStatusManager from './WorkOrderStatusManager';
import { useData } from '../DataProvider';
import { Branch, AppSettings } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '../users/ImageCropDialog';
import { toast } from 'sonner';

export default function WorkOrderSettingsPanel({
  isOpen = false,
  onClose,
  categories = [],
  shiftTypes = [],
  onDataChanged,
}) {
  const { currentCompany, setCurrentCompany } = useData();
  const [activeTab, setActiveTab] = useState('categories');
  
  // Tab icons state
  const [scheduleTabIconUrl, setScheduleTabIconUrl] = useState(currentCompany?.schedule_tab_icon_url || '');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  
  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  
  // Timezone state
  const [timezone, setTimezone] = useState('Asia/Dubai');
  const [savedTimezone, setSavedTimezone] = useState('Asia/Dubai');
  const [savingTimezone, setSavingTimezone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScheduleTabIconUrl(currentCompany?.schedule_tab_icon_url || '');
      loadTimezone();
    }
  }, [isOpen, currentCompany]);
  
  const loadTimezone = async () => {
    try {
      const settings = await AppSettings.filter({ setting_key: 'work_orders_timezone' });
      if (settings && settings.length > 0) {
        const tz = settings[0].setting_value || 'Asia/Dubai';
        setTimezone(tz);
        setSavedTimezone(tz);
      }
    } catch (error) {
      console.error('Error loading timezone:', error);
    }
  };
  
  const saveTimezone = async () => {
    setSavingTimezone(true);
    try {
      const settings = await AppSettings.filter({ setting_key: 'work_orders_timezone' });
      if (settings && settings.length > 0) {
        await AppSettings.update(settings[0].id, { setting_value: timezone });
      } else {
        await AppSettings.create({
          setting_key: 'work_orders_timezone',
          setting_value: timezone,
          setting_type: 'string',
          description: 'Timezone for work orders scheduling'
        });
      }
      setSavedTimezone(timezone);
      toast.success('Timezone saved successfully');
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error('Error saving timezone:', error);
      toast.error('Failed to save timezone');
    } finally {
      setSavingTimezone(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b bg-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-white" />
              <SheetTitle className="text-white text-sm">Work Order Settings</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-indigo-700 h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-6 rounded-none border-b bg-white h-9">
              <TabsTrigger value="categories" className="text-xs">Categories</TabsTrigger>
              <TabsTrigger value="statuses" className="text-xs">Statuses</TabsTrigger>
              <TabsTrigger value="shifts" className="text-xs">Shift Types</TabsTrigger>
              <TabsTrigger value="order-docs" className="text-xs">Order Document Types</TabsTrigger>
              <TabsTrigger value="timezone" className="text-xs">
                <div className="flex flex-col items-center">
                  <span>Timezone</span>
                  <span className="text-[9px] text-indigo-600 font-semibold mt-0.5">
                    {savedTimezone.split('/')[1]?.replace('_', ' ') || savedTimezone}
                  </span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="tab-icons" className="text-xs">Tab Icons</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="p-4">
              <WorkOrderCategoryManager
                categories={categories}
                onDataChanged={onDataChanged}
              />
            </TabsContent>

            <TabsContent value="statuses" className="p-4">
              <WorkOrderStatusManager onDataChanged={onDataChanged} />
            </TabsContent>

            <TabsContent value="shifts" className="p-4">
              <ShiftTypeManager
                shiftTypes={shiftTypes}
                onDataChanged={onDataChanged}
              />
            </TabsContent>

            <TabsContent value="order-docs" className="p-4">
              <OrderDocumentTypeManager categories={categories} onDataChanged={onDataChanged} />
            </TabsContent>

            <TabsContent value="timezone" className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-slate-800 mb-1">Work Orders Timezone</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Configure the timezone used for scheduling work orders. This ensures that times are displayed correctly for your team's location.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue>
                        {timezone ? 
                          `${timezone.split('/')[1]?.replace('_', ' ')} (${timezone.split('/')[0]})` : 
                          'Select timezone'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GMT+4)</SelectItem>
                      <SelectItem value="Europe/Madrid">Europe/Madrid (GMT+1)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (GMT-5)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los Angeles (GMT-8)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (GMT+11)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={saveTimezone} 
                    disabled={savingTimezone}
                    className="w-full"
                  >
                    {savingTimezone ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Timezone'
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tab-icons" className="p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
                  <p className="text-xs text-slate-500 mb-4">Customize the icon shown on the "Schedule" tab.</p>
                </div>

                {/* Schedule Tab Icon */}
                <div className="p-4 border rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${scheduleTabIconUrl ? '' : 'bg-orange-100'}`}>
                      {scheduleTabIconUrl ? (
                        <img src={scheduleTabIconUrl} alt="Schedule icon" className="w-10 h-10 object-contain" />
                      ) : (
                        <img src="https://cdn-icons-png.flaticon.com/512/10492/10492086.png" alt="Schedule default" className="w-10 h-10 object-contain" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-slate-800">Schedule Tab Icon</h4>
                      <p className="text-xs text-slate-500">Default: Tools & gears icon</p>
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
                      id="schedule-tab-icon-upload"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button" 
                      disabled={uploadingIcon}
                      onClick={() => document.getElementById('schedule-tab-icon-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                    </Button>
                    {scheduleTabIconUrl && scheduleTabIconUrl.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCropImageSrc(scheduleTabIconUrl);
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
                              await Branch.update(currentCompany.id, { schedule_tab_icon_url: null });
                              const updatedCompany = { ...currentCompany, schedule_tab_icon_url: null };
                              setScheduleTabIconUrl('');
                              if (setCurrentCompany) {
                                setCurrentCompany(updatedCompany);
                                localStorage.setItem('currentCompany', JSON.stringify(updatedCompany));
                              }
                              toast.success('Icon reset to default');
                              if (onDataChanged) onDataChanged();
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
          isSaving={uploadingIcon}
          onSave={async (croppedBlob) => {
            if (!currentCompany?.id) {
              toast.error('No company selected');
              return;
            }
            
            setUploadingIcon(true);
            
            try {
              const file = new File([croppedBlob], 'schedule-tab-icon.png', { type: 'image/png' });
              const result = await base44.integrations.Core.UploadFile({ file });
              
              if (!result?.file_url) {
                throw new Error('No file URL returned from upload');
              }
              
              console.log('Uploaded file URL:', result.file_url);
              console.log('Updating Branch ID:', currentCompany.id);
              
              // Update Branch in database
              await Branch.update(currentCompany.id, { schedule_tab_icon_url: result.file_url });
              
              // Update local state
              setScheduleTabIconUrl(result.file_url);
              
              // Update currentCompany in DataProvider
              const updatedCompany = { ...currentCompany, schedule_tab_icon_url: result.file_url };
              if (setCurrentCompany) {
                setCurrentCompany(updatedCompany);
              }
              
              toast.success('Icon updated!');
              if (onDataChanged) onDataChanged();
              
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
      </SheetContent>
    </Sheet>
  );
}