import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, Upload, Pencil, X, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../DataProvider';
import { Branch } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from './ImageCropDialog';
import PermissionsTab from './PermissionsTab';
import EmployeeNumbersTab from './EmployeeNumbersTab';

export default function UsersSettingsPanel({ 
  isOpen, 
  onClose, 
  adminLeader, 
  currentUser, 
  isAdminLeader, 
  allUsers, 
  onSuccess 
}) {
  const { currentCompany, setCurrentCompany } = useData();
  const [activeTab, setActiveTab] = useState('permissions');
  
  // Tab icons state
  const [usersTabIconUrl, setUsersTabIconUrl] = useState(currentCompany?.users_tab_icon_url || '');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  
  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsersTabIconUrl(currentCompany?.users_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Users & Teams Settings
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="employee-numbers">Employee #</TabsTrigger>
            <TabsTrigger value="tab-icons">Tab Icons</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="mt-6">
            <PermissionsTab
              adminLeader={adminLeader}
              currentUser={currentUser}
              isAdminLeader={isAdminLeader}
              allUsers={allUsers}
              onSuccess={onSuccess}
            />
          </TabsContent>

          <TabsContent value="employee-numbers" className="mt-6">
            <EmployeeNumbersTab
              allUsers={allUsers}
              onSuccess={onSuccess}
            />
          </TabsContent>

          <TabsContent value="tab-icons" className="mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
                <p className="text-xs text-slate-500 mb-4">Customize the icon shown on the "Users" tab.</p>
              </div>

              {/* Users Tab Icon */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${usersTabIconUrl ? '' : 'bg-rose-100'}`}>
                    {usersTabIconUrl ? (
                      <img src={usersTabIconUrl} alt="Users icon" className="w-10 h-10 object-contain" />
                    ) : (
                      <Users className="w-10 h-10 text-rose-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">Users Tab Icon</h4>
                    <p className="text-xs text-slate-500">Default: Users icon</p>
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
                    id="users-tab-icon-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    disabled={uploadingIcon}
                    onClick={() => document.getElementById('users-tab-icon-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                  {usersTabIconUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropImageSrc(usersTabIconUrl);
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
                            await Branch.update(currentCompany.id, { users_tab_icon_url: null });
                            const updatedCompany = { ...currentCompany, users_tab_icon_url: null };
                            setUsersTabIconUrl('');
                            if (setCurrentCompany) {
                              setCurrentCompany(updatedCompany);
                            }
                            toast.success('Icon reset to default');
                            if (onSuccess) onSuccess();
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
          isSaving={uploadingIcon}
          onSave={async (croppedBlob) => {
            if (!currentCompany?.id) {
              toast.error('No company selected');
              return;
            }
            
            setUploadingIcon(true);
            
            try {
              const file = new File([croppedBlob], 'users-tab-icon.png', { type: 'image/png' });
              const result = await base44.integrations.Core.UploadFile({ file });
              
              if (!result?.file_url) {
                throw new Error('No file URL returned from upload');
              }
              
              await Branch.update(currentCompany.id, { users_tab_icon_url: result.file_url });
              
              setUsersTabIconUrl(result.file_url);
              
              const updatedCompany = { ...currentCompany, users_tab_icon_url: result.file_url };
              if (setCurrentCompany) {
                setCurrentCompany(updatedCompany);
              }
              
              toast.success('Icon updated!');
              if (onSuccess) onSuccess();
              
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