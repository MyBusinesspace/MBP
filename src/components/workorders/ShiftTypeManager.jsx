import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { useData } from '../DataProvider';
import { ShiftType } from '@/entities/all';

const colorOptions = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' }
];

export default function ShiftTypeManager({ onDataChanged }) {
  const { currentBranch } = useData();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newShift, setNewShift] = useState({ name: '', color: 'blue', start_time: '', end_time: '' });
  const [editingId, setEditingId] = useState(null);

  const loadShifts = async () => {
    setLoading(true);
    try {
      let data = await ShiftType.list('sort_order', 1000);
      if (currentBranch?.id) {
        data = (Array.isArray(data) ? data : []).filter(s => s.branch_id === currentBranch.id || !s.branch_id);
      }
      setShifts(data || []);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [currentBranch]);

  const handleSave = async () => {
    if (!newShift.name.trim()) {
      toast.error('Shift name is required');
      return;
    }

    try {
      const dataToSave = currentBranch?.id ? { ...newShift, branch_id: currentBranch.id } : newShift;
      
      if (editingId) {
        await ShiftType.update(editingId, dataToSave);
        toast.success('Shift updated');
      } else {
        await ShiftType.create({
          ...dataToSave,
          sort_order: shifts.length
        });
        toast.success('Shift created');
      }
      
      setNewShift({ name: '', color: 'blue', start_time: '', end_time: '' });
      setEditingId(null);
      await loadShifts();
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error('Failed to save shift:', error);
      toast.error('Failed to save shift');
    }
  };

  const handleEdit = (shift) => {
    setNewShift({
      name: shift.name,
      color: shift.color,
      start_time: shift.start_time || '',
      end_time: shift.end_time || ''
    });
    setEditingId(shift.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this shift type?')) return;
    
    try {
      await ShiftType.delete(id);
      toast.success('Shift deleted');
      await loadShifts();
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error('Failed to delete shift:', error);
      toast.error('Failed to delete shift');
    }
  };

  const persistOrder = async (ordered) => {
    try {
      await Promise.all(
        ordered
          .map((s, idx) => (s.sort_order !== idx ? ShiftType.update(s.id, { sort_order: idx }) : null))
          .filter(Boolean)
      );
      setShifts(ordered.map((s, idx) => ({ ...s, sort_order: idx })));
      if (onDataChanged) onDataChanged();
      toast.success('Order saved');
    } catch (e) {
      console.error('Failed to reorder shifts:', e);
      toast.error('Failed to save order');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(shifts);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    await persistOrder(items);
  };

  const updateSortOrder = async (shift, value) => {
    try {
      const v = Number.isFinite(value) ? value : 0;
      await ShiftType.update(shift.id, { sort_order: v });
      await loadShifts();
      toast.success('Order updated');
    } catch (e) {
      console.error('Failed to update sort order:', e);
      toast.error('Failed to update sort order');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-slate-500">Loading shift types...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="shifts">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {shifts.map((shift, index) => (
                <Draggable key={shift.id} draggableId={String(shift.id)} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
                    >
                      <div {...dragProvided.dragHandleProps}>
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </div>

                      <div className="flex-1">
                        {editingId === shift.id ? (
                          <div className="space-y-2">
                            <Input
                              value={newShift.name}
                              onChange={(e) => setNewShift({...newShift, name: e.target.value})}
                              placeholder="Name"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="time"
                                value={newShift.start_time}
                                onChange={(e) => setNewShift({...newShift, start_time: e.target.value})}
                                placeholder="Start"
                              />
                              <Input
                                type="time"
                                value={newShift.end_time}
                                onChange={(e) => setNewShift({...newShift, end_time: e.target.value})}
                                placeholder="End"
                              />
                            </div>
                            <Select
                              value={newShift.color}
                              onValueChange={(v) => setNewShift({...newShift, color: v})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {colorOptions.map(color => (
                                  <SelectItem key={color.value} value={color.value}>
                                    <div className="flex items-center gap-2">
                                      <span className={`w-3 h-3 rounded ${color.class}`}></span>
                                      <span>{color.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSave}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => {
                                setEditingId(null);
                                setNewShift({ name: '', color: 'blue', start_time: '', end_time: '' });
                              }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded ${colorOptions.find(c => c.value === shift.color)?.class}`}></span>
                                <span className="font-medium text-sm">{shift.name}</span>
                              </div>
                              {(shift.start_time || shift.end_time) && (
                                <div className="text-xs text-slate-500 ml-5">
                                  {shift.start_time || '--:--'} - {shift.end_time || '--:--'}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="w-16 h-7 text-xs"
                                defaultValue={Number.isFinite(shift.sort_order) ? shift.sort_order : index}
                                onBlur={(e) => updateSortOrder(shift, parseInt(e.target.value, 10))}
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(shift)}>
                                <span className="text-xs">✏️</span>
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(shift.id)}>
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {!editingId && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
          <Input
            placeholder="New shift name"
            value={newShift.name}
            onChange={(e) => setNewShift({...newShift, name: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="time"
              value={newShift.start_time}
              onChange={(e) => setNewShift({...newShift, start_time: e.target.value})}
              placeholder="Start time"
            />
            <Input
              type="time"
              value={newShift.end_time}
              onChange={(e) => setNewShift({...newShift, end_time: e.target.value})}
              placeholder="End time"
            />
          </div>
          <Select
            value={newShift.color}
            onValueChange={(v) => setNewShift({...newShift, color: v})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map(color => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded ${color.class}`}></span>
                    <span>{color.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSave} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Shift
          </Button>
        </div>
      )}
    </div>
  );
}