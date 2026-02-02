import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Trash2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/components/DataProvider';
import { Branch } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '@/components/users/ImageCropDialog';
import { createPageUrl } from '@/utils';

export default function ReportsSettingsPanel({ isOpen, onClose }) {
  const { currentCompany, setCurrentCompany } = useData();
  const [activeTab, setActiveTab] = useState('icons');
  const [isUploading, setIsUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [woId, setWoId] = useState('');

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target.result);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob) => {
    if (!currentCompany) return;

    setIsUploading(true);
    try {
      const file = new File([croppedBlob], 'reports-tab-icon.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await Branch.update(currentCompany.id, {
        reports_tab_icon_url: file_url
      });

      setCurrentCompany({
        ...currentCompany,
        reports_tab_icon_url: file_url
      });

      toast.success('Reports icon updated! Refresh the page to see changes in the sidebar.');
      setCropDialogOpen(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Failed to upload icon:', error);
      toast.error('Failed to upload icon');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetIcon = async () => {
    if (!currentCompany) return;

    try {
      await Branch.update(currentCompany.id, {
        reports_tab_icon_url: null
      });

      setCurrentCompany({
        ...currentCompany,
        reports_tab_icon_url: null
      });

      toast.success('Reports icon reset to default! Refresh the page to see changes.');
    } catch (error) {
      console.error('Failed to reset icon:', error);
      toast.error('Failed to reset icon');
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reports Settings</SheetTitle>
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700 mb-1">Where to edit report templates</p>
              <ul className="text-[11px] text-slate-600 leading-relaxed list-disc pl-5">
                <li>
                  PDF dialog (UI & controls):
                  <code className="ml-1 px-1 py-0.5 bg-white border border-slate-200 rounded">components/workorders/WorkOrderPDFDialog</code>
                </li>
                <li>
                  PDF print view:
                  <code className="ml-1 px-1 py-0.5 bg-white border border-slate-200 rounded">pages/WorkOrderPDFView</code>
                </li>
                <li>
                  Summary PDF view:
                  <code className="ml-1 px-1 py-0.5 bg-white border border-slate-200 rounded">pages/WorkOrdersSummaryPDFView</code>
                </li>
              </ul>
            </div>
          </SheetHeader>

          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700 mb-2">Quick access</p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Work Order ID..."
                value={woId}
                onChange={(e) => setWoId(e.target.value)}
                className="h-8"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!woId) return;
                  const url = createPageUrl('WorkOrderPDFView') + `?id=${woId}`;
                  window.open(url, '_blank');
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Open PDF View
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Use a valid Work Order ID.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="icons">Tab Icon</TabsTrigger>
            </TabsList>

            <TabsContent value="icons" className="mt-4 space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-medium">Reports Tab Icon</Label>
                <p className="text-xs text-slate-500">
                  Upload a custom icon for the Reports tab in the sidebar.
                </p>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden bg-slate-50">
                    {currentCompany?.reports_tab_icon_url ? (
                      <img
                        src={currentCompany.reports_tab_icon_url}
                        alt="Reports Icon"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <BarChart3 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={isUploading}>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Upload Icon'}
                        </span>
                      </Button>
                    </label>

                    {currentCompany?.reports_tab_icon_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetIcon}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Reset to Default
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Recommended: Square image, at least 64x64 pixels. PNG with transparent background works best.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <ImageCropDialog
        isOpen={cropDialogOpen}
        onClose={() => {
          setCropDialogOpen(false);
          setSelectedImage(null);
        }}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={false}
      />
    </>
  );
}