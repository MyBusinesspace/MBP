import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Save, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import QuickReportA4Preview from '@/components/reports/QuickReportA4Preview';

export default function QuickReportsSettings() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    template_name: '',
    description: '',
    is_default: false,
    header_title: 'Quick Report',
    header_subtitle: '',
    header_logo_url: '',
    metrics: [
      { label: 'Total', key: 'total' },
      { label: 'Completed', key: 'completed' }
    ],
    details: [
      { label: 'Date range', key: 'date_range' }
    ],
    list_columns: [
      { label: 'Name', key: 'name', width: 200 },
      { label: 'Status', key: 'status', width: 120 }
    ]
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await base44.entities.QuickReportSettings.list('-updated_date', 50);
      setTemplates(Array.isArray(data) ? data : []);
      if (data?.length) {
        const def = data.find(t => t.is_default) || data[0];
        pickTemplate(def);
      }
    } catch (_e) {
      setTemplates([]);
    }
  };

  const pickTemplate = (t) => {
    if (!t) { setSelectedId(null); return; }
    setSelectedId(t.id);
    setForm({
      template_name: t.template_name || '',
      description: t.description || '',
      is_default: !!t.is_default,
      header_title: t.header_title || '',
      header_subtitle: t.header_subtitle || '',
      header_logo_url: t.header_logo_url || '',
      metrics: Array.isArray(t.metrics) ? t.metrics : [],
      details: Array.isArray(t.details) ? t.details : [],
      list_columns: Array.isArray(t.list_columns) ? t.list_columns : []
    });
  };

  const newTemplate = () => {
    setSelectedId(null);
    setForm(prev => ({ ...prev, template_name: '', description: '', is_default: false }));
  };

  const updateArrayItem = (arrKey, idx, field, value) => {
    setForm(prev => {
      const next = [...prev[arrKey]];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, [arrKey]: next };
    });
  };

  const addArrayItem = (arrKey, item) => setForm(prev => ({ ...prev, [arrKey]: [...prev[arrKey], item] }));
  const removeArrayItem = (arrKey, idx) => setForm(prev => ({ ...prev, [arrKey]: prev[arrKey].filter((_, i) => i !== idx) }));

  const saveTemplate = async () => {
    if (!form.template_name.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    try {
      if (selectedId) {
        await base44.entities.QuickReportSettings.update(selectedId, form);
      } else {
        const created = await base44.entities.QuickReportSettings.create(form);
        setSelectedId(created.id);
      }
      toast.success('Settings saved');
      await loadTemplates();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm">Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => pickTemplate(t)}
                className={`w-full text-left px-3 py-2 rounded border ${selectedId===t.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="text-sm font-medium">{t.template_name}</div>
                {t.description && (<div className="text-xs text-slate-500">{t.description}</div>)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={newTemplate} className="w-full">
              <Plus className="w-4 h-4 mr-2"/> New Template
            </Button>
            <Button onClick={saveTemplate} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2"/> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>

          {/* Quick A4 Preview below actions */}
          <div className="pt-4">
            <div className="text-xs text-slate-500 mb-2">Vista rápida (A4)</div>
            <QuickReportA4Preview form={form} />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Layout designer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Template name</label>
              <Input value={form.template_name} onChange={(e)=>setForm({...form, template_name:e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Description</label>
              <Input value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Header title</label>
              <Input value={form.header_title} onChange={(e)=>setForm({...form, header_title:e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Header subtitle</label>
              <Input value={form.header_subtitle} onChange={(e)=>setForm({...form, header_subtitle:e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600">Logo URL (optional)</label>
              <div className="flex gap-2">
                <Input value={form.header_logo_url} onChange={(e)=>setForm({...form, header_logo_url:e.target.value})} placeholder="https://..." />
                <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                  {form.header_logo_url ? (
                    <img src={form.header_logo_url} alt="logo" className="object-contain w-full h-full" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Top metrics (quantities)</h3>
              <Button size="sm" variant="outline" onClick={()=>addArrayItem('metrics', {label:'Label', key:'key'})}><Plus className="w-4 h-4 mr-1"/>Add</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {form.metrics.map((m, idx)=> (
                <div key={idx} className="flex gap-2 items-center">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <Input className="flex-1" value={m.label} onChange={(e)=>updateArrayItem('metrics', idx, 'label', e.target.value)} placeholder="Label" />
                  <Input className="flex-1" value={m.key} onChange={(e)=>updateArrayItem('metrics', idx, 'key', e.target.value)} placeholder="key" />
                  <Button size="icon" variant="ghost" onClick={()=>removeArrayItem('metrics', idx)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Header details</h3>
              <Button size="sm" variant="outline" onClick={()=>addArrayItem('details', {label:'Label', key:'key'})}><Plus className="w-4 h-4 mr-1"/>Add</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {form.details.map((m, idx)=> (
                <div key={idx} className="flex gap-2 items-center">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <Input className="flex-1" value={m.label} onChange={(e)=>updateArrayItem('details', idx, 'label', e.target.value)} placeholder="Label" />
                  <Input className="flex-1" value={m.key} onChange={(e)=>updateArrayItem('details', idx, 'key', e.target.value)} placeholder="key" />
                  <Button size="icon" variant="ghost" onClick={()=>removeArrayItem('details', idx)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">List columns</h3>
              <Button size="sm" variant="outline" onClick={()=>addArrayItem('list_columns', {label:'Column', key:'field', width:120})}><Plus className="w-4 h-4 mr-1"/>Add</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6"></TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="w-28">Width</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.list_columns.map((c, idx)=> (
                  <TableRow key={idx}>
                    <TableCell><GripVertical className="w-4 h-4 text-slate-400"/></TableCell>
                    <TableCell><Input value={c.label} onChange={(e)=>updateArrayItem('list_columns', idx, 'label', e.target.value)} placeholder="Label"/></TableCell>
                    <TableCell><Input value={c.key} onChange={(e)=>updateArrayItem('list_columns', idx, 'key', e.target.value)} placeholder="field_key"/></TableCell>
                    <TableCell><Input type="number" value={c.width ?? 120} onChange={(e)=>updateArrayItem('list_columns', idx, 'width', Number(e.target.value || 0))}/></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={()=>removeArrayItem('list_columns', idx)}><Trash2 className="w-4 h-4"/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Live Preview */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{form.header_title || 'Untitled report'}</div>
                {form.header_subtitle && <div className="text-slate-500 text-sm">{form.header_subtitle}</div>}
              </div>
              {form.header_logo_url && (
                <img src={form.header_logo_url} alt="logo" className="h-10 object-contain" />
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {form.metrics.map((m, i)=> (
                <div key={i} className="p-3 bg-slate-50 rounded border">
                  <div className="text-xs text-slate-500">{m.label}</div>
                  <div className="text-base font-semibold">{{}.value ?? '123'}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              {form.details.map((d, i)=> (
                <div key={i} className="text-sm text-slate-600"><span className="font-medium">{d.label}: </span><span className="text-slate-500">{{}.value ?? '—'}</span></div>
              ))}
            </div>
            <div className="mt-4 border-t pt-3">
              <div className="flex gap-2 text-xs font-medium text-slate-600">
                {form.list_columns.map((c,i)=> (
                  <div key={i} style={{width:(c.width||120)+'px'}} className="truncate">{c.label}</div>
                ))}
              </div>
              <div className="text-xs text-slate-400 mt-2">List preview (first row)</div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={saveTemplate} disabled={saving}><Save className="w-4 h-4 mr-2"/>{saving ? 'Saving...' : 'Save settings'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}