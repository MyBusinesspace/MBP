import React, { useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useData } from '@/components/DataProvider';
import { base44 } from '@/api/base44Client';
import { Image as ImageIcon, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function OrdersFieldsSettings() {
  const [openLabel, setOpenLabel] = useState('Open');
  const [closedLabel, setClosedLabel] = useState('Closed');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const [openSetting] = await base44.entities.AppSettings.filter({ setting_key: 'orders_column_open_label' });
        const [closedSetting] = await base44.entities.AppSettings.filter({ setting_key: 'orders_column_closed_label' });
        if (openSetting?.setting_value) setOpenLabel(openSetting.setting_value);
        if (closedSetting?.setting_value) setClosedLabel(closedSetting.setting_value);
      } catch {}
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const [openSetting] = await base44.entities.AppSettings.filter({ setting_key: 'orders_column_open_label' });
      if (openSetting?.id) await base44.entities.AppSettings.update(openSetting.id, { setting_value: openLabel });
      else await base44.entities.AppSettings.create({ setting_key: 'orders_column_open_label', setting_value: openLabel, setting_type: 'string' });

      const [closedSetting] = await base44.entities.AppSettings.filter({ setting_key: 'orders_column_closed_label' });
      if (closedSetting?.id) await base44.entities.AppSettings.update(closedSetting.id, { setting_value: closedLabel });
      else await base44.entities.AppSettings.create({ setting_key: 'orders_column_closed_label', setting_value: closedLabel, setting_type: 'string' });

      toast.success('Labels saved');
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-slate-700">Open column label</label>
        <input className="mt-1 w-full border rounded px-2 py-1 text-sm" value={openLabel} onChange={e=>setOpenLabel(e.target.value)} />
      </div>
      <div>
        <label className="text-sm text-slate-700">Closed column label</label>
        <input className="mt-1 w-full border rounded px-2 py-1 text-sm" value={closedLabel} onChange={e=>setClosedLabel(e.target.value)} />
      </div>
      <Button onClick={save} disabled={saving} className="w-full">{saving ? 'Saving...' : 'Save'}</Button>
    </div>
  );
}

export default function OrdersSettingsPanel({ isOpen, onClose }) {
  const { currentCompany, setCurrentCompany } = useData();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePick = () => fileInputRef.current?.click();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentCompany?.id) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = await base44.entities.Branch.update(currentCompany.id, { orders_tab_icon_url: file_url });
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
    if (!currentCompany?.id) return;
    setUploading(true);
    try {
      const updated = await base44.entities.Branch.update(currentCompany.id, { orders_tab_icon_url: null });
      setCurrentCompany(updated);
      toast.success('Icono restablecido');
    } catch (err) {
      console.error('Reset icon error:', err);
      toast.error('No se pudo restablecer el icono');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose?.()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Orders · Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <Tabs defaultValue="tab-icons">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="tab-icons">Tab Icons</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
            </TabsList>

            <TabsContent value="tab-icons" className="space-y-4 mt-4">
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Personaliza el icono del tab "Orders" en la barra lateral.</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                    {currentCompany?.orders_tab_icon_url ? (
                      <img src={currentCompany.orders_tab_icon_url} alt="Orders Icon" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handlePick} disabled={uploading}>
                      <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Subiendo...' : 'Subir icono'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReset} disabled={uploading || !currentCompany?.orders_tab_icon_url}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Restablecer
                    </Button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4 mt-4">
              <OrdersFieldsSettings />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}