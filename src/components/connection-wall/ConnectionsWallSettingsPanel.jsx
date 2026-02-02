import React, { useRef, useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useData } from '@/components/DataProvider';
import { base44 } from '@/api/base44Client';
import { Image as ImageIcon, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function ConnectionsWallSettingsPanel({ isOpen, onClose }) {
  const { currentCompany, setCurrentCompany } = useData();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePick = () => { console.debug('[Wall Settings] pick clicked'); fileInputRef.current?.click(); };

  const handleUpload = async (e) => {
    console.debug('[Wall Settings] onChange fired', { hasFile: !!(e.target.files && e.target.files[0]) });
    const file = e.target.files?.[0];
    if (!file || !currentCompany?.id) return;
    setUploading(true);
    try {
      console.debug('[Wall Settings] uploading file...', { name: file.name, size: file.size });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      console.debug('[Wall Settings] uploaded', { file_url });
      const updated = await base44.entities.Branch.update(currentCompany.id, { connections_wall_tab_icon_url: file_url });
      console.debug('[Wall Settings] company updated');
      setCurrentCompany(updated);
      toast.success('Icono actualizado');
    } catch (err) {
      console.error('Upload icon error:', err);
      toast.error('No se pudo subir el icono');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReset = async () => {
    console.debug('[Wall Settings] reset icon clicked');
    if (!currentCompany?.id) return;
    setUploading(true);
    try {
      const updated = await base44.entities.Branch.update(currentCompany.id, { connections_wall_tab_icon_url: null });
      setCurrentCompany(updated);
      toast.success('Icono restablecido');
    } catch (err) {
      console.error('Reset icon error:', err);
      toast.error('No se pudo restablecer el icono');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (isOpen) console.debug('[Wall Settings] panel opened');
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(v) => { console.debug('[Wall Settings] onOpenChange', v); if (!v) onClose?.(); }}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Connections · Wall · Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <Tabs defaultValue="tab-icons">
            <TabsList className="grid grid-cols-1 w-full">
              <TabsTrigger value="tab-icons">Tab Icons</TabsTrigger>
            </TabsList>

            <TabsContent value="tab-icons" className="space-y-4 mt-4">
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Personaliza el icono del tab "Wall" en la barra lateral.</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                    {currentCompany?.connections_wall_tab_icon_url ? (
                      <img src={currentCompany.connections_wall_tab_icon_url} alt="Wall Icon" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handlePick} disabled={uploading}>
                      <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Subiendo...' : 'Subir icono'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReset} disabled={uploading || !currentCompany?.connections_wall_tab_icon_url}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Restablecer
                    </Button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}