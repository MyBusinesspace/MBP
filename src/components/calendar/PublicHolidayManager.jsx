import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PublicHoliday } from '@/entities/all';
import { toast } from 'sonner';
import { Plus, Trash2, Calendar, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function PublicHolidayManager() {
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      const data = await PublicHoliday.list('date');
      setHolidays(data || []);
    } catch (error) {
      console.error('Failed to load holidays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newHoliday.name || !newHoliday.date) {
      toast.error('Please enter name and date');
      return;
    }

    setIsSaving(true);
    try {
      await PublicHoliday.create(newHoliday);
      toast.success('Holiday added');
      setNewHoliday({ name: '', date: '' });
      loadHolidays();
    } catch (error) {
      toast.error('Failed to add holiday');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await PublicHoliday.delete(id);
      toast.success('Holiday deleted');
      setHolidays(holidays.filter(h => h.id !== id));
    } catch (error) {
      toast.error('Failed to delete holiday');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new holiday */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Holiday Name</Label>
          <Input
            placeholder="e.g. National Day"
            value={newHoliday.name}
            onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
          />
        </div>
        <div className="w-40">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={newHoliday.date}
            onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
          />
        </div>
        <Button onClick={handleAdd} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* List of holidays */}
      <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
        {holidays.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            No public holidays defined yet
          </div>
        ) : (
          holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-red-500" />
                <div>
                  <div className="font-medium text-sm">{holiday.name}</div>
                  <div className="text-xs text-slate-500">
                    {format(parseISO(holiday.date), 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(holiday.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}