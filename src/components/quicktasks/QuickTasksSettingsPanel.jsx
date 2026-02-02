import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Eye, Shield, Image as ImageIcon, Settings, Upload, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Branch } from '@/entities/all';
import ImageCropDialog from '../users/ImageCropDialog';
import { toast } from 'sonner';

export default function QuickTasksSettingsPanel({
  isOpen,
  onClose,
  settings,
  onUpdatePermissions,
  visibleColumns,
  onUpdateColumns,
  currentCompany,
  onSettingsChanged
}) {
  const [activeTab, setActiveTab] = useState('columns');
  const [tabIconUrl, setTabIconUrl] = useState('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen && currentCompany) {
      setTabIconUrl(currentCompany.quick_tasks_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  const handleIconUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageToCrop(event.target.result);
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSaveCroppedIcon = async (croppedBlob) => {
    if (!currentCompany || !croppedBlob) return;

    setIsUploading(true);
    try {
      const file = new File([croppedBlob], 'quick-tasks-tab-icon.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await Branch.update(currentCompany.id, { quick_tasks_tab_icon_url: file_url });
      setTabIconUrl(file_url);
      
      localStorage.setItem('currentCompanyData', JSON.stringify({
        ...currentCompany,
        quick_tasks_tab_icon_url: file_url
      }));

      toast.success('Tab icon updated. Refresh page to see changes in sidebar.');
    } catch (error) {
      console.error('Failed to upload icon:', error);
      toast.error('Failed to upload icon');
    } finally {
      setIsUploading(false);
      setShowCropDialog(false);
      setImageToCrop(null);
    }
  };

  const handleResetIcon = async () => {
    if (!currentCompany) return;

    try {
      await Branch.update(currentCompany.id, { quick_tasks_tab_icon_url: null });
      setTabIconUrl('');
      
      localStorage.setItem('currentCompanyData', JSON.stringify({
        ...currentCompany,
        quick_tasks_tab_icon_url: null
      }));

      toast.success('Tab icon reset. Refresh page to see changes in sidebar.');
    } catch (error) {
      console.error('Failed to reset icon:', error);
      toast.error('Failed to reset icon');
    }
  };

  const columnLabels = {
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
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Quick Tasks Settings
            </SheetTitle>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-4 grid grid-cols-3">
              <TabsTrigger value="columns" className="gap-2">
                <Eye className="w-4 h-4" />
                Columns
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2">
                <Shield className="w-4 h-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="tab-icons" className="gap-2">
                <ImageIcon className="w-4 h-4" />
                Tab Icons
              </TabsTrigger>
            </TabsList>

            <TabsContent value="columns" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Visible Columns</h3>
                <p className="text-xs text-slate-500">Select which columns to display in the tasks table.</p>
                <div className="space-y-2">
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer border"
                      onClick={() => onUpdateColumns({ ...visibleColumns, [key]: !value })}
                    >
                      <span className="text-sm font-medium">{columnLabels[key] || key}</span>
                      <Checkbox checked={value} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Task Visibility</h3>
                <p className="text-xs text-slate-500">Control which tasks users can see.</p>
                <div className="space-y-2">
                  <div
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all",
                      settings?.permission_mode === 'restricted'
                        ? "bg-indigo-50 border-indigo-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                    onClick={() => onUpdatePermissions('restricted')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        settings?.permission_mode === 'restricted'
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300"
                      )}>
                        {settings?.permission_mode === 'restricted' && (
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
                      settings?.permission_mode === 'all'
                        ? "bg-indigo-50 border-indigo-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                    onClick={() => onUpdatePermissions('all')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        settings?.permission_mode === 'all'
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300"
                      )}>
                        {settings?.permission_mode === 'all' && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Open</p>
                        <p className="text-xs text-slate-600 mt-1">All users can see all tasks</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tab-icons" className="flex-1 overflow-y-auto mt-0 p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Quick Tasks Tab Icon</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Upload a custom icon for the Quick Tasks tab in the sidebar.
                  </p>

                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white overflow-hidden">
                      {tabIconUrl ? (
                        <img src={tabIconUrl} alt="Tab Icon" className="w-12 h-12 object-contain" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                        id="quick-tasks-icon-upload"
                      />
                      <label htmlFor="quick-tasks-icon-upload">
                        <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                          <span>
                            {isUploading ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            {tabIconUrl ? 'Change Icon' : 'Upload Icon'}
                          </span>
                        </Button>
                      </label>

                      {tabIconUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={handleResetIcon}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Reset to Default
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-4">
                    💡 Recommended size: 64x64 pixels. PNG format with transparency works best.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {showCropDialog && imageToCrop && (
        <ImageCropDialog
          isOpen={showCropDialog}
          onClose={() => {
            setShowCropDialog(false);
            setImageToCrop(null);
          }}
          imageUrl={imageToCrop}
          onSave={handleSaveCroppedIcon}
          aspectRatio={1}
          title="Crop Tab Icon"
        />
      )}
    </>
  );
}