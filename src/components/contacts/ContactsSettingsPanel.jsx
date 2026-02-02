import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tags, ImageIcon, Upload, Pencil, X, Building, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useData } from '../DataProvider';
import { Branch } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '../users/ImageCropDialog';
import ContactCategoryManager from './ContactCategoryManagerEmbed';

export default function ContactsSettingsPanel({ isOpen, onClose, onSettingsChanged, currentCompany: propCurrentCompany }) {
  const { currentCompany: contextCurrentCompany, setCurrentCompany } = useData();
  const currentCompany = propCurrentCompany || contextCurrentCompany;
  const [activeTab, setActiveTab] = useState('categories');
  
  // Tab icons state
  const [contactsTabIconUrl, setContactsTabIconUrl] = useState(currentCompany?.contacts_tab_icon_url || '');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  
  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContactsTabIconUrl(currentCompany?.contacts_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-6 py-4 bg-cyan-600 text-white border-b">
          <SheetTitle className="text-white flex items-center gap-2">
            <Building className="w-5 h-5" />
            Contact Settings
          </SheetTitle>
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
            <ContactCategoryManager 
              embedded={true}
              onCategoriesChanged={onSettingsChanged}
            />
          </TabsContent>

          <TabsContent value="status" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Contact Status Options</h3>
              <div className="space-y-3">
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <p className="font-semibold text-green-900">Active</p>
                  <p className="text-xs text-green-700 mt-1">Contact is currently active and in use</p>
                </div>
                <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <p className="font-semibold text-yellow-900">Inactive</p>
                  <p className="text-xs text-yellow-700 mt-1">Contact is temporarily inactive</p>
                </div>
                <div className="p-4 border rounded-lg bg-slate-50 border-slate-200">
                  <p className="font-semibold text-slate-900">Archived</p>
                  <p className="text-xs text-slate-700 mt-1">Contact is archived and hidden from default views</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                💡 These are the standard contact statuses. You can change a contact's status from the contact details panel.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="tab-icons" className="flex-1 overflow-y-auto mt-0 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
                <p className="text-xs text-slate-500 mb-4">Customize the icon shown on the "Contacts" tab.</p>
              </div>

              {/* Contacts Tab Icon */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${contactsTabIconUrl ? '' : 'bg-cyan-100'}`}>
                    {contactsTabIconUrl ? (
                      <img src={contactsTabIconUrl} alt="Contacts icon" className="w-10 h-10 object-contain" />
                    ) : (
                      <Building className="w-10 h-10 text-cyan-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">Contacts Tab Icon</h4>
                    <p className="text-xs text-slate-500">Default: Building icon</p>
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
                    id="contacts-tab-icon-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    disabled={uploadingIcon}
                    onClick={() => document.getElementById('contacts-tab-icon-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                  {contactsTabIconUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropImageSrc(contactsTabIconUrl);
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
                            await Branch.update(currentCompany.id, { contacts_tab_icon_url: null });
                            const updatedCompany = { ...currentCompany, contacts_tab_icon_url: null };
                            setContactsTabIconUrl('');
                            if (setCurrentCompany) {
                              setCurrentCompany(updatedCompany);
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
          isSaving={uploadingIcon}
          onSave={async (croppedBlob) => {
            if (!currentCompany?.id) {
              toast.error('No company selected');
              return;
            }
            
            setUploadingIcon(true);
            
            try {
              const file = new File([croppedBlob], 'contacts-tab-icon.png', { type: 'image/png' });
              const result = await base44.integrations.Core.UploadFile({ file });
              
              if (!result?.file_url) {
                throw new Error('No file URL returned from upload');
              }
              
              await Branch.update(currentCompany.id, { contacts_tab_icon_url: result.file_url });
              
              setContactsTabIconUrl(result.file_url);
              
              const updatedCompany = { ...currentCompany, contacts_tab_icon_url: result.file_url };
              if (setCurrentCompany) {
                setCurrentCompany(updatedCompany);
              }
              
              toast.success('Icon updated!');
              if (onSettingsChanged) onSettingsChanged();
              
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