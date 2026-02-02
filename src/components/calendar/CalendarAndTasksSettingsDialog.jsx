import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Settings, Upload, Trash2, Loader2, CalendarDays, ListCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Branch } from '@/entities/all';
import ImageCropDialog from '../users/ImageCropDialog';
import EventCategoryManager from './EventCategoryManager';
import PublicHolidayManager from './PublicHolidayManager';
import { toast } from 'sonner';

export default function CalendarAndTasksSettingsDialog({
  isOpen,
  onClose,
  currentCompany,
  isGoogleConnected,
  quickTaskSettings,
  onUpdateQuickTaskPermissions,
  quickTaskVisibleColumns,
  onUpdateQuickTaskColumns
}) {
  const [activeTab, setActiveTab] = useState('calendar-categories');
  const [calendarTabIconUrl, setCalendarTabIconUrl] = useState('');
  const [quickTasksTabIconUrl, setQuickTasksTabIconUrl] = useState('');
  const [showCalendarCropDialog, setShowCalendarCropDialog] = useState(false);
  const [showQuickTasksCropDialog, setShowQuickTasksCropDialog] = useState(false);
  const [calendarImageToCrop, setCalendarImageToCrop] = useState(null);
  const [quickTasksImageToCrop, setQuickTasksImageToCrop] = useState(null);
  const [isCalendarUploading, setIsCalendarUploading] = useState(false);
  const [isQuickTasksUploading, setIsQuickTasksUploading] = useState(false);

  useEffect(() => {
    if (isOpen && currentCompany) {
      setCalendarTabIconUrl(currentCompany.calendar_tab_icon_url || '');
      setQuickTasksTabIconUrl(currentCompany.quick_tasks_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  const handleCalendarIconUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCalendarImageToCrop(event.target.result);
        setShowCalendarCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSaveCroppedCalendarIcon = async (croppedBlob) => {
    if (!currentCompany || !croppedBlob) return;
    setIsCalendarUploading(true);
    try {
      const file = new File([croppedBlob], 'calendar-tab-icon.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await Branch.update(currentCompany.id, { calendar_tab_icon_url: file_url });
      setCalendarTabIconUrl(file_url);
      toast.success('Calendar tab icon updated.');
    } catch (error) {
      console.error('Failed to upload calendar icon:', error);
      toast.error('Failed to upload calendar icon');
    } finally {
      setIsCalendarUploading(false);
      setShowCalendarCropDialog(false);
      setCalendarImageToCrop(null);
    }
  };

  const handleResetCalendarIcon = async () => {
    if (!currentCompany) return;
    try {
      await Branch.update(currentCompany.id, { calendar_tab_icon_url: null });
      setCalendarTabIconUrl('');
      toast.success('Calendar tab icon reset.');
    } catch (error) {
      console.error('Failed to reset calendar icon:', error);
      toast.error('Failed to reset calendar icon');
    }
  };

  const handleQuickTasksIconUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setQuickTasksImageToCrop(event.target.result);
        setShowQuickTasksCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSaveCroppedQuickTasksIcon = async (croppedBlob) => {
    if (!currentCompany || !croppedBlob) return;
    setIsQuickTasksUploading(true);
    try {
      const file = new File([croppedBlob], 'quick-tasks-tab-icon.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await Branch.update(currentCompany.id, { quick_tasks_tab_icon_url: file_url });
      setQuickTasksTabIconUrl(file_url);
      toast.success('Quick Tasks tab icon updated.');
    } catch (error) {
      console.error('Failed to upload quick tasks icon:', error);
      toast.error('Failed to upload quick tasks icon');
    } finally {
      setIsQuickTasksUploading(false);
      setShowQuickTasksCropDialog(false);
      setQuickTasksImageToCrop(null);
    }
  };

  const handleResetQuickTasksIcon = async () => {
    if (!currentCompany) return;
    try {
      await Branch.update(currentCompany.id, { quick_tasks_tab_icon_url: null });
      setQuickTasksTabIconUrl('');
      toast.success('Quick Tasks tab icon reset.');
    } catch (error) {
      console.error('Failed to reset quick tasks icon:', error);
      toast.error('Failed to reset quick tasks icon');
    }
  };

  const quickTaskColumnLabels = {
    title: 'Title',
    department: 'Department',
    client: 'Client',
    assigned: 'Assigned To',
    working: 'Tick / Working On',
    created: 'Created On',
    due_date: 'Due Date'
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col overflow-y-auto">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Calendar & Tasks Settings
            </SheetTitle>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4">
            <TabsList className="mx-6 grid grid-cols-4 gap-1">
              <TabsTrigger value="calendar-categories">Events</TabsTrigger>
              <TabsTrigger value="calendar-holidays">Holidays</TabsTrigger>
              <TabsTrigger value="quick-tasks-settings">Tasks</TabsTrigger>
              <TabsTrigger value="tab-icons">Icons</TabsTrigger>
            </TabsList>

            {/* Calendar Categories */}
            <TabsContent value="calendar-categories" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Event Categories</h3>
                <EventCategoryManager />
              </div>
            </TabsContent>

            {/* Public Holidays */}
            <TabsContent value="calendar-holidays" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Public Holidays</h3>
                <p className="text-xs text-slate-500">Manage public holidays to appear in the calendar.</p>
                <PublicHolidayManager />
              </div>
            </TabsContent>

            {/* Quick Tasks Settings */}
            <TabsContent value="quick-tasks-settings" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Visible Columns</h3>
                  <p className="text-xs text-slate-500 mb-4">Select which columns to display in the Quick Tasks table.</p>
                  <div className="space-y-2">
                    {Object.entries(quickTaskVisibleColumns || {}).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer border"
                        onClick={() => onUpdateQuickTaskColumns({ ...quickTaskVisibleColumns, [key]: !value })}
                      >
                        <span className="text-sm font-medium">{quickTaskColumnLabels[key] || key}</span>
                        <Checkbox checked={value} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Task Visibility</h3>
                  <p className="text-xs text-slate-500 mb-4">Control which quick tasks users can see.</p>
                  <div className="space-y-2">
                    <div
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-all",
                        quickTaskSettings?.permission_mode === 'restricted'
                          ? "bg-indigo-50 border-indigo-300"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      )}
                      onClick={() => onUpdateQuickTaskPermissions('restricted')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          quickTaskSettings?.permission_mode === 'restricted'
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-slate-300"
                        )}>
                          {quickTaskSettings?.permission_mode === 'restricted' && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Restricted</p>
                          <p className="text-xs text-slate-600 mt-1">Users can only see tasks assigned to them or their team</p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-all",
                        quickTaskSettings?.permission_mode === 'all'
                          ? "bg-indigo-50 border-indigo-300"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      )}
                      onClick={() => onUpdateQuickTaskPermissions('all')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          quickTaskSettings?.permission_mode === 'all'
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-slate-300"
                        )}>
                          {quickTaskSettings?.permission_mode === 'all' && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Open</p>
                          <p className="text-xs text-slate-600 mt-1">All users can see all quick tasks</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab Icons */}
            <TabsContent value="tab-icons" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
              <div className="space-y-6">
                {/* Calendar Tab Icon */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Calendar Tab Icon</h3>
                  <p className="text-xs text-slate-500 mb-4">Upload a custom icon for the Calendar tab.</p>
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white overflow-hidden">
                      {calendarTabIconUrl ? (
                        <img src={calendarTabIconUrl} alt="Calendar Icon" className="w-12 h-12 object-contain" />
                      ) : (
                        <CalendarDays className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input type="file" accept="image/*" onChange={handleCalendarIconUpload} className="hidden" id="calendar-icon-upload" />
                      <label htmlFor="calendar-icon-upload">
                        <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                          <span>
                            {isCalendarUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {calendarTabIconUrl ? 'Change Icon' : 'Upload Icon'}
                          </span>
                        </Button>
                      </label>
                      {calendarTabIconUrl && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleResetCalendarIcon}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Tasks Tab Icon */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Quick Tasks Tab Icon</h3>
                  <p className="text-xs text-slate-500 mb-4">Upload a custom icon for the Quick Tasks section.</p>
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white overflow-hidden">
                      {quickTasksTabIconUrl ? (
                        <img src={quickTasksTabIconUrl} alt="Quick Tasks Icon" className="w-12 h-12 object-contain" />
                      ) : (
                        <ListCheck className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input type="file" accept="image/*" onChange={handleQuickTasksIconUpload} className="hidden" id="quick-tasks-icon-upload" />
                      <label htmlFor="quick-tasks-icon-upload">
                        <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                          <span>
                            {isQuickTasksUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {quickTasksTabIconUrl ? 'Change Icon' : 'Upload Icon'}
                          </span>
                        </Button>
                      </label>
                      {quickTasksTabIconUrl && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleResetQuickTasksIcon}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {showCalendarCropDialog && calendarImageToCrop && (
        <ImageCropDialog
          isOpen={showCalendarCropDialog}
          onClose={() => {
            setShowCalendarCropDialog(false);
            setCalendarImageToCrop(null);
          }}
          imageUrl={calendarImageToCrop}
          onSave={handleSaveCroppedCalendarIcon}
          aspectRatio={1}
          title="Crop Calendar Icon"
        />
      )}

      {showQuickTasksCropDialog && quickTasksImageToCrop && (
        <ImageCropDialog
          isOpen={showQuickTasksCropDialog}
          onClose={() => {
            setShowQuickTasksCropDialog(false);
            setQuickTasksImageToCrop(null);
          }}
          imageUrl={quickTasksImageToCrop}
          onSave={handleSaveCroppedQuickTasksIcon}
          aspectRatio={1}
          title="Crop Quick Tasks Icon"
        />
      )}
    </>
  );
}