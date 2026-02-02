import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tags, ListChecks, ImageIcon, Upload, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CategoryManagerDialog from './CategoryManagerDialog';
import { useData } from '../DataProvider';
import { Branch } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '../users/ImageCropDialog';

export default function ProjectSettingsPanel({ isOpen, onClose, onSettingsChanged }) {
  const { currentCompany, setCurrentCompany } = useData();
  const [activeTab, setActiveTab] = useState('categories');
  
  // Tab icons state
  const [projectsTabIconUrl, setProjectsTabIconUrl] = useState(currentCompany?.projects_tab_icon_url || '');
  const [uploadingProjectsIcon, setUploadingProjectsIcon] = useState(false);
  
  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProjectsTabIconUrl(currentCompany?.projects_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-6 py-4 bg-indigo-600 text-white border-b">
          <SheetTitle className="text-white">Project Settings</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none px-6 bg-white">
            <TabsTrigger value="categories" className="gap-2">
              <Tags className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <ListChecks className="w-4 h-4" />
              Status
            </TabsTrigger>
            <TabsTrigger value="tab-icons" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Tab Icons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="flex-1 overflow-y-auto mt-0 p-0">
            <CategoryManagerDialog 
              embedded={true}
              onCategoriesChanged={onSettingsChanged}
            />
          </TabsContent>

          <TabsContent value="status" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Project Status Options</h3>
              <div className="space-y-3">
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <p className="font-semibold text-green-900">Active</p>
                  <p className="text-xs text-green-700 mt-1">Project is currently in progress</p>
                </div>
                <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <p className="font-semibold text-yellow-900">On Hold</p>
                  <p className="text-xs text-yellow-700 mt-1">Project is temporarily paused</p>
                </div>
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <p className="font-semibold text-blue-900">Closed</p>
                  <p className="text-xs text-blue-700 mt-1">Project is completed</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                💡 These are the standard project statuses. You can change a project's status from the project details panel.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="tab-icons" className="flex-1 overflow-y-auto mt-0 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
                <p className="text-xs text-slate-500 mb-4">Customize the icon shown on the "Projects" tab.</p>
              </div>

              {/* Projects Tab Icon */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${projectsTabIconUrl ? '' : 'bg-indigo-100'}`}>
                    {projectsTabIconUrl ? (
                      <img src={projectsTabIconUrl} alt="Projects icon" className="w-10 h-10 object-contain" />
                    ) : (
                      <img src="https://cdn-icons-png.flaticon.com/512/9455/9455779.png" alt="Projects default" className="w-10 h-10 object-contain" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">Projects Tab Icon</h4>
                    <p className="text-xs text-slate-500">Default: Construction crane icon</p>
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
                    id="projects-tab-icon-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    disabled={uploadingProjectsIcon}
                    onClick={() => document.getElementById('projects-tab-icon-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingProjectsIcon ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                  {projectsTabIconUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropImageSrc(projectsTabIconUrl);
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
                            await Branch.update(currentCompany.id, { projects_tab_icon_url: null });
                            const updatedCompany = { ...currentCompany, projects_tab_icon_url: null };
                            setProjectsTabIconUrl('');
                            if (setCurrentCompany) {
                              setCurrentCompany(updatedCompany);
                              localStorage.setItem('currentCompany', JSON.stringify(updatedCompany));
                            }
                            toast.success('Icon reset to default');
                            if (onSettingsChanged) onSettingsChanged();
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
            
            setUploadingProjectsIcon(true);
            
            try {
              const file = new File([croppedBlob], 'projects-tab-icon.png', { type: 'image/png' });
              const result = await base44.integrations.Core.UploadFile({ file });
              
              await Branch.update(currentCompany.id, { projects_tab_icon_url: result.file_url });
              
              const updatedCompany = { ...currentCompany, projects_tab_icon_url: result.file_url };
              setProjectsTabIconUrl(result.file_url);
              if (setCurrentCompany) {
                setCurrentCompany(updatedCompany);
                // Force localStorage update to persist across components
                localStorage.setItem('currentCompany', JSON.stringify(updatedCompany));
              }
              
              toast.success('Icon updated!');
              if (onSettingsChanged) onSettingsChanged();
            } catch (error) {
              console.error('Error saving icon:', error);
              toast.error('Failed to save icon');
            } finally {
              setUploadingProjectsIcon(false);
              setCropDialogOpen(false);
              setCropImageSrc('');
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}