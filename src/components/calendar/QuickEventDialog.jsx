import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/entities/all';
import { toast } from 'sonner';
import { formatISO } from 'date-fns';

export default function QuickEventDialog({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      // Focus input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const endTime = new Date(now);
      endTime.setHours(endTime.getHours() + 1);

      await CalendarEvent.create({
        title: title.trim(),
        start_time: formatISO(now),
        end_time: formatISO(endTime),
        all_day: false,
        event_type: 'meeting',
        color: 'blue'
      });

      toast.success('Event created successfully');
      setTitle('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to create event:', error);
      toast.error('Failed to create event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Quick Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            ref={inputRef}
            placeholder="Event title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="text-lg"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Press Enter to create • Esc to cancel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}