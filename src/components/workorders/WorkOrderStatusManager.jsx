import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, GripVertical, PlayCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppSettings } from '@/entities/all';

const colorOptions = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-100' },
  { value: 'green', label: 'Green', class: 'bg-green-100' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100' },
  { value: 'red', label: 'Red', class: 'bg-red-100' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100' },
];

const iconOptions = [
  { value: 'play', label: 'Open', icon: PlayCircle },
  { value: 'check', label: 'Closed', icon: CheckCircle2 },
];

// Default statuses (these are the built-in ones from TimeEntry entity)
const defaultStatuses = [
  { id: 'open', name: 'Open', color: 'green', icon: 'play', isDefault: true },
  { id: 'closed', name: 'Closed', color: 'gray', icon: 'check', isDefault: true },
];

export default function WorkOrderStatusManager({ onDataChanged }) {
  const [statuses, setStatuses] = useState(defaultStatuses);
  const [customStatuses, setCustomStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState({ name: '', color: 'blue', icon: 'play' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load custom statuses from AppSettings
  const loadStatuses = async () => {
    console.log('🔍 [WorkOrderStatusManager] Loading statuses...');
    setLoading(true);
    try {
      const settings = await AppSettings.list();
      console.log('🔍 [WorkOrderStatusManager] Settings loaded:', settings?.length);
      
      const woSettings = settings.find(s => s.setting_key === 'work_order_statuses');
      console.log('🔍 [WorkOrderStatusManager] Work order settings:', woSettings);
      
      if (woSettings?.setting_value?.customStatuses) {
        setCustomStatuses(woSettings.setting_value.customStatuses);
        console.log('✅ [WorkOrderStatusManager] Custom statuses loaded:', woSettings.setting_value.customStatuses.length);
      }
    } catch (error) {
      console.error('❌ [WorkOrderStatusManager] Failed to load statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const saveStatuses = async (newCustomStatuses) => {
    try {
      const settings = await AppSettings.list();
      const woSettings = settings.find(s => s.setting_key === 'work_order_statuses');
      
      if (woSettings) {
        await AppSettings.update(woSettings.id, {
          setting_value: { customStatuses: newCustomStatuses }
        });
      } else {
        await AppSettings.create({
          setting_key: 'work_order_statuses',
          setting_value: { customStatuses: newCustomStatuses }
        });
      }
      
      setCustomStatuses(newCustomStatuses);
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error('Failed to save statuses:', error);
      toast.error('Failed to save status');
    }
  };

  const handleAdd = async () => {
    if (!newStatus.name.trim()) {
      toast.error('Status name is required');
      return;
    }

    const newCustomStatus = {
      id: `custom_${Date.now()}`,
      name: newStatus.name,
      color: newStatus.color,
      icon: newStatus.icon || 'play',
      isDefault: false
    };

    await saveStatuses([...customStatuses, newCustomStatus]);
    setNewStatus({ name: '', color: 'blue', icon: 'play' });
    toast.success('Status added');
  };

  const handleEdit = (status) => {
    setNewStatus({ name: status.name, color: status.color, icon: status.icon || 'play' });
    setEditingId(status.id);
  };

  const handleUpdate = async () => {
    if (!newStatus.name.trim()) return;
    
    const updated = customStatuses.map(s => 
      s.id === editingId ? { ...s, name: newStatus.name, color: newStatus.color, icon: newStatus.icon || 'play' } : s
    );
    await saveStatuses(updated);
    setNewStatus({ name: '', color: 'blue', icon: 'play' });
    setEditingId(null);
    toast.success('Status updated');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this status?')) return;
    const updated = customStatuses.filter(s => s.id !== id);
    await saveStatuses(updated);
    toast.success('Status deleted');
  };

  const allStatuses = [...defaultStatuses, ...customStatuses];

  if (loading) {
    return <div className="text-xs text-slate-500 text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-500 mb-3">
        Work order statuses define the lifecycle state. Default statuses cannot be deleted.
      </p>

      {allStatuses.map((status) => {
        const StatusIcon = iconOptions.find(i => i.value === status.icon)?.icon || Play;
        return (
        <div key={status.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
          <GripVertical className="w-3 h-3 text-slate-400" />
          
          <div className="flex-1">
            {editingId === status.id ? (
              <div className="flex gap-2 items-center flex-wrap">
                <Input
                  value={newStatus.name}
                  onChange={(e) => setNewStatus({...newStatus, name: e.target.value})}
                  placeholder="Name"
                  className="h-7 text-xs flex-1 min-w-[100px]"
                />
                <Select
                  value={newStatus.color}
                  onValueChange={(v) => setNewStatus({...newStatus, color: v})}
                >
                  <SelectTrigger className="w-16 h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <span className={`w-3 h-3 rounded ${color.class}`}></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newStatus.icon || 'play'}
                  onValueChange={(v) => setNewStatus({...newStatus, icon: v})}
                >
                  <SelectTrigger className="w-16 h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => {
                      const Icon = icon.icon;
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <Icon className="w-3 h-3" />
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleUpdate} className="h-7 text-xs px-2">Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => {
                  setEditingId(null);
                  setNewStatus({ name: '', color: 'blue', icon: 'play' });
                }}>✕</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-4 h-4 rounded flex items-center justify-center",
                    colorOptions.find(c => c.value === status.color)?.class
                  )}>
                    <StatusIcon className="w-2.5 h-2.5 text-slate-600" />
                  </span>
                  <span className="text-xs font-medium">{status.name}</span>
                  {status.isDefault && (
                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Default</span>
                  )}
                </div>
                {!status.isDefault && (
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEdit(status)}>
                      <span className="text-[10px]">✏️</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(status.id)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        );
      })}

      {!editingId && (
        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex gap-2 items-center flex-wrap">
            <Input
              placeholder="New status name"
              value={newStatus.name}
              onChange={(e) => setNewStatus({...newStatus, name: e.target.value})}
              className="h-7 text-xs flex-1 min-w-[100px]"
            />
            <Select
              value={newStatus.color}
              onValueChange={(v) => setNewStatus({...newStatus, color: v})}
            >
              <SelectTrigger className="w-16 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map(color => (
                  <SelectItem key={color.value} value={color.value}>
                    <span className={`w-3 h-3 rounded ${color.class}`}></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newStatus.icon || 'play'}
              onValueChange={(v) => setNewStatus({...newStatus, icon: v})}
            >
              <SelectTrigger className="w-16 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map(icon => {
                  const Icon = icon.icon;
                  return (
                    <SelectItem key={icon.value} value={icon.value}>
                      <Icon className="w-3 h-3" />
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} className="h-7 text-xs px-3">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}