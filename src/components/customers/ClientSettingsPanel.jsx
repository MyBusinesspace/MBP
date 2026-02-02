import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DocumentTypeManager from '@/components/documents/DocumentTypeManager';
import { Tags, ListChecks, ImageIcon, Upload, Users, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CategoryManagerDialog from './CategoryManagerDialog';
import { useData } from '../DataProvider';
import { Branch } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '../users/ImageCropDialog';

// Client status options (static for now, similar to project status)
const defaultStatuses = [
  { name: 'Active', color: 'green', description: 'Client is currently active' },
  { name: 'Inactive', color: 'gray', description: 'Client is not currently active' },
  { name: 'Prospect', color: 'blue', description: 'Potential client' },
  { name: 'On Hold', color: 'yellow', description: 'Client relationship is paused' }
];

const colorOptions = [
  { value: 'gray', label: 'Gray' },
  { value: 'red', label: 'Red' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
  { value: 'orange', label: 'Orange' },
  { value: 'teal', label: 'Teal' }
];

const getColorClass = (color) => {
  const map = {
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800',
    orange: 'bg-orange-100 text-orange-800',
    teal: 'bg-teal-100 text-teal-800'
  };
  return map[color] || map.blue;
};

export default function ClientSettingsPanel({ isOpen, onClose, onSettingsChanged }) {
  const { currentCompany, setCurrentCompany } = useData();
  const [activeTab, setActiveTab] = useState('categories');
  
  // Tab icons state
  const [clientsTabIconUrl, setClientsTabIconUrl] = useState(currentCompany?.clients_tab_icon_url || '');
  const [uploadingClientsIcon, setUploadingClientsIcon] = useState(false);
  
  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  useEffect(() => {
    if (isOpen) {
      setClientsTabIconUrl(currentCompany?.clients_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-6 py-4 bg-indigo-600 text-white border-b">
          <SheetTitle className="text-white">Client Settings</SheetTitle>
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
            <TabsTrigger value="document-types" className="gap-2">
              <ListChecks className="w-4 h-4" />
              Document Types
            </TabsTrigger>
            <TabsTrigger value="tab-icons" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Tab Icons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="flex-1 overflow-y-auto mt-0 p-0">
            <CategoryManagerDialog
              isOpen={true}
              onClose={() => {}}
              onCategoriesChanged={onSettingsChanged}
              embedded={true}
            />
          </TabsContent>

          <TabsContent value="status" className="flex-1 overflow-y-auto mt-0 px-6 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Client Status Options</h3>
              <div className="space-y-3">
                {defaultStatuses.map(status => (
                  <div key={status.name} className={`p-4 border rounded-lg ${getColorClass(status.color).replace('text-', 'border-').split(' ')[0].replace('bg-', 'bg-')} ${getColorClass(status.color)}`}>
                    <p className="font-semibold">{status.name}</p>
                    <p className="text-xs opacity-75 mt-1">{status.description}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">
                💡 These are the standard client statuses. You can change a client's status from the client details panel.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="document-types" className="flex-1 overflow-y-auto mt-0 p-0">
            <DocumentTypeManager isOpen={true} onClose={() => {}} onSuccess={() => {}} showFoldersTab />
          </TabsContent>

          <TabsContent value="tab-icons" className="flex-1 overflow-y-auto mt-0 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
                <p className="text-xs text-slate-500 mb-4">Customize the icon shown on the "Clients" tab.</p>
              </div>

              {/* Clients Tab Icon */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    {currentCompany?.clients_tab_icon_url ? (
                      <img src={currentCompany.clients_tab_icon_url} alt="Clients icon" className="w-6 h-6 object-contain" />
                    ) : (
                      <Users className="w-6 h-6 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">Clients Tab Icon</h4>
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
                    id="clients-tab-icon-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    disabled={uploadingClientsIcon}
                    onClick={() => document.getElementById('clients-tab-icon-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingClientsIcon ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                  {clientsTabIconUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropImageSrc(clientsTabIconUrl);
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
                            await Branch.update(currentCompany.id, { clients_tab_icon_url: null });
                            setClientsTabIconUrl('');
                            if (setCurrentCompany) setCurrentCompany({ ...currentCompany, clients_tab_icon_url: null });
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
            
            setUploadingClientsIcon(true);
            
            try {
              const file = new File([croppedBlob], 'clients-tab-icon.png', { type: 'image/png' });
              const result = await base44.integrations.Core.UploadFile({ file });
              
              await Branch.update(currentCompany.id, { clients_tab_icon_url: result.file_url });
              
              setClientsTabIconUrl(result.file_url);
              if (setCurrentCompany) setCurrentCompany({ ...currentCompany, clients_tab_icon_url: result.file_url });
              
              toast.success('Icon updated!');
              if (onSettingsChanged) onSettingsChanged();
            } catch (error) {
              console.error('Error saving icon:', error);
              toast.error('Failed to save icon');
            } finally {
              setUploadingClientsIcon(false);
              setCropDialogOpen(false);
              setCropImageSrc('');
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}