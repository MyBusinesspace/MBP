import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/entities/all';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MapPin, Clock, Calendar, Repeat, Bell, Globe, Lock, UserCheck, X, Mail, Link as LinkIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';

export default function EventDialog({ 
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  event,
  initialDate,
  eventType,
  users = [],
  teams = [],
  customers = [],
  eventCategories = [],
  isSheet = false,
  onLoadingChange
}) {
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: eventType || (eventCategories.length > 0 ? eventCategories[0].name : 'meeting'),
    start_time: '',
    end_time: '',
    all_day: false,
    location: '',
    meeting_link: '',
    visibility: 'shared',
    participant_user_ids: [],
    participant_team_ids: [],
    participant_customer_emails: [],
    participant_customer_whatsapp: [],
    color: 'blue',
    reminder_minutes: 0,
    is_recurring: false,
    recurrence_type: 'daily',
    recurrence_interval: 1,
    has_flag: false,
    priority: 'none'
  });

  const [duration, setDuration] = useState('1');

  // Auto-save functionality
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  // Auto-save draft every 2 seconds (only for existing events)
  useEffect(() => {
    if (formData.title && formData.start_time && formData.end_time && event) {
      const saveTimer = setTimeout(async () => {
        // Save to localStorage
        const draftKey = `calendar-draft-${event.id}`;
        localStorage.setItem(draftKey, JSON.stringify({
          ...formData,
          savedAt: new Date().toISOString()
        }));
        
        // Auto-save to backend (only for existing events)
        handleAutoSave();
      }, 2000);
      return () => clearTimeout(saveTimer);
    }
  }, [formData, event]);

  const handleAutoSave = async () => {
    if (!event || loading || isSaving) return;
    
    // Don't auto-save Google Calendar events (read-only)
    if (event.is_google_event || event.id?.startsWith('g_') || event.id?.startsWith('holiday_')) return;
    
    setIsSaving(true);
    try {
      await CalendarEvent.update(event.id, formData);
      setLastSaved(new Date());
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Event no longer exists');
        onClose();
      } else {
        console.error('Auto-save failed:', error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Prevent editing Google Calendar events
  useEffect(() => {
    if (event && (event.is_google_event || event.id?.startsWith('g_') || event.isPublicHoliday)) {
      toast.info('This is a read-only event from an external source');
      onClose();
      return;
    }
  }, [event, onClose]);

  // Initialize form
  useEffect(() => {
    if (event) {
      try {
        const startTimeFormatted = event.start_time ? (() => {
          try {
            const date = new Date(event.start_time);
            return !isNaN(date.getTime()) ? format(date, "yyyy-MM-dd'T'HH:mm") : '';
          } catch {
            return '';
          }
        })() : '';

        const endTimeFormatted = event.end_time ? (() => {
          try {
            const date = new Date(event.end_time);
            return !isNaN(date.getTime()) ? format(date, "yyyy-MM-dd'T'HH:mm") : '';
          } catch {
            return '';
          }
        })() : '';

        setFormData({
          title: event.title || '',
          description: event.description || '',
          event_type: event.event_type || (eventCategories.length > 0 ? eventCategories[0].name : 'meeting'),
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
          all_day: event.all_day || false,
          location: event.location || '',
          meeting_link: event.meeting_link || '',
          visibility: event.visibility || 'shared',
          participant_user_ids: event.participant_user_ids || [],
          participant_team_ids: event.participant_team_ids || [],
          participant_customer_emails: event.participant_customer_emails || [],
          participant_customer_whatsapp: event.participant_customer_whatsapp || [],
          color: event.color || 'blue',
          reminder_minutes: event.reminder_minutes || 0,
          is_recurring: event.is_recurring || false,
          recurrence_type: event.recurrence_type || 'daily',
          recurrence_interval: event.recurrence_interval || 1,
          has_flag: event.has_flag || false,
          priority: event.priority || 'none'
        });

        // Calculate duration
        if (event.start_time && event.end_time) {
          try {
            const start = new Date(event.start_time);
            const end = new Date(event.end_time);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const durationHours = (end - start) / (1000 * 60 * 60);
              setDuration(durationHours > 0 ? String(durationHours) : '1');
            }
          } catch {
            setDuration('1');
          }
        }
      } catch (error) {
        console.warn('Error initializing event data:', error);
      }
    } else if (initialDate) {
      const start = new Date(initialDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(initialDate);
      end.setHours(10, 0, 0, 0);

      setFormData(prev => ({
        ...prev,
        start_time: format(start, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(end, "yyyy-MM-dd'T'HH:mm"),
        event_type: eventType || (eventCategories.length > 0 ? eventCategories[0].name : 'meeting')
      }));
      setDuration('1');
    }
  }, [event, initialDate, eventType, eventCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submitting Google Calendar events
    if (event && (event.is_google_event || event.id?.startsWith('g_') || event.isPublicHoliday)) {
      toast.error('Cannot edit external calendar events');
      return;
    }
    
    if (loading) return;
    
    if (!formData.title || !formData.start_time) {
      toast.error('Please fill in title and date');
      return;
    }

    setLoading(true);
    try {
      let savedEvent;
      if (event) {
        savedEvent = await CalendarEvent.update(event.id, formData);
        toast.success('Event updated');
      } else {
        savedEvent = await CalendarEvent.create(formData);
        toast.success('Event created');
      }

      const draftKey = event ? `calendar-draft-${event.id}` : 'calendar-draft-new';
      localStorage.removeItem(draftKey);
      
      onSuccess(savedEvent, 0);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      if (error.response?.status === 404) {
        toast.error('Event no longer exists');
        onClose();
      } else {
        toast.error('Failed to save event');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDurationChange = (value) => {
    setDuration(value);
    
    if (value && formData.start_time) {
      try {
        const hours = parseFloat(value);
        if (!isNaN(hours) && hours > 0) {
          const start = new Date(formData.start_time);
          if (!isNaN(start.getTime())) {
            const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
            setFormData({
              ...formData,
              end_time: format(end, "yyyy-MM-dd'T'HH:mm")
            });
          }
        }
      } catch (error) {
        console.warn('Error calculating duration:', error);
      }
    } else if (!value && formData.start_time) {
      setFormData({
        ...formData,
        end_time: formData.start_time
      });
    }
  };

  const toggleUser = (userId) => {
    setFormData(prev => ({
      ...prev,
      participant_user_ids: prev.participant_user_ids.includes(userId)
        ? prev.participant_user_ids.filter(id => id !== userId)
        : [...prev.participant_user_ids, userId]
    }));
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (!email) return;
    
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.participant_customer_emails.includes(email)) {
      toast.error('This email is already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      participant_customer_emails: [...prev.participant_customer_emails, email]
    }));
    setEmailInput('');
    toast.success('Email added');
  };

  const handleRemoveEmail = (emailToRemove) => {
    setFormData(prev => ({
      ...prev,
      participant_customer_emails: prev.participant_customer_emails.filter(e => e !== emailToRemove)
    }));
  };

  const handleCopyLink = () => {
    const eventLink = `${window.location.origin}${window.location.pathname}?event=${event?.id || 'new'}`;
    navigator.clipboard.writeText(eventLink);
    setLinkCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const getCategoryEmoji = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('call')) return '📞';
    if (name.includes('site') || name.includes('meeting')) return '🎯';
    if (name.includes('company') || name.includes('event')) return '🎉';
    if (name.includes('absence') || name.includes('holiday') || name.includes('vacation')) return '🚫';
    if (name.includes('deadline')) return '⏰';
    if (name.includes('personal')) return '👤';
    if (name.includes('day off')) return '🌙';
    return '📌';
  };

  const selectedCategory = eventCategories.find(cat => cat.name === formData.event_type);

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {event ? 'Edit Event' : 'New Event'}
        </h2>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </div>
          )}
          {isSaving && (
            <div className="text-xs text-slate-500">Saving...</div>
          )}
          <Button
            type="submit"
            disabled={loading || !formData.title || !formData.start_time}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Title - Editable */}
      <div className="space-y-1">
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="New Event"
          className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Notes - Editable */}
      <div>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Notes here editable"
          rows={2}
          className="text-sm border-0 px-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-500"
        />
      </div>

      {/* URL / Meeting Link */}
      {formData.event_type && formData.event_type.toLowerCase().includes('call') && (
        <div className="py-2">
          <Input
            value={formData.meeting_link}
            onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
            placeholder="URL"
            className="text-sm border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-blue-600"
          />
        </div>
      )}

      {/* Date & Time Section */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-3 mt-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</div>
        
        {/* Start Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm">Start Date</span>
          </div>
          <input
            type="date"
            value={formData.start_time ? formData.start_time.split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value;
              const startTime = formData.start_time ? formData.start_time.split('T')[1] : '09:00';
              setFormData({
                ...formData,
                start_time: `${date}T${startTime}`
              });
            }}
            className="text-sm border-0 bg-transparent text-right focus:outline-none"
          />
        </div>

        {/* End Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm">End Date</span>
          </div>
          <input
            type="date"
            value={formData.end_time ? formData.end_time.split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value;
              const endTime = formData.end_time ? formData.end_time.split('T')[1] : '10:00';
              setFormData({
                ...formData,
                end_time: `${date}T${endTime}`
              });
            }}
            className="text-sm border-0 bg-transparent text-right focus:outline-none"
          />
        </div>

        {/* All Day with Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm">All Day</span>
          </div>
          <div className="flex items-center gap-3">
            {!formData.all_day && (
              <input
                type="time"
                value={formData.start_time ? formData.start_time.split('T')[1]?.substring(0, 5) || '09:00' : '09:00'}
                onChange={(e) => {
                  try {
                    const date = formData.start_time ? formData.start_time.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                    const newStartTime = `${date}T${e.target.value}:00`;

                    // Calculate end time based on duration
                    let newEndTime = newStartTime;
                    if (duration) {
                      const hours = parseFloat(duration);
                      if (!isNaN(hours) && hours > 0) {
                        const start = new Date(newStartTime);
                        if (!isNaN(start.getTime())) {
                          const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
                          newEndTime = format(end, "yyyy-MM-dd'T'HH:mm:ss");
                        }
                      }
                    }

                    setFormData({
                      ...formData,
                      start_time: newStartTime,
                      end_time: newEndTime
                    });
                  } catch (error) {
                    console.warn('Error updating start time:', error);
                  }
                }}
                className="text-sm border-0 bg-transparent text-right focus:outline-none"
              />
            )}
            <Switch
              checked={formData.all_day}
              onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
            />
          </div>
        </div>

        {/* Duration */}
        {!formData.all_day && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 flex items-center justify-center text-slate-400 font-semibold text-xs">+H</span>
              <span className="text-sm">Duration</span>
            </div>
            <Select
              value={duration}
              onValueChange={handleDurationChange}
            >
              <SelectTrigger className="w-32 h-8 text-sm border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25">+0.25h (15 min)</SelectItem>
                <SelectItem value="0.5">+0.5h (30 min)</SelectItem>
                <SelectItem value="1">+1h</SelectItem>
                <SelectItem value="1.5">+1.5h</SelectItem>
                <SelectItem value="2">+2h</SelectItem>
                <SelectItem value="3">+3h</SelectItem>
                <SelectItem value="4">+4h</SelectItem>
                <SelectItem value="5">+5h</SelectItem>
                <SelectItem value="6">+6h</SelectItem>
                <SelectItem value="8">+8h</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Repeat */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Repeat className="w-4 h-4 text-slate-400" />
            <span className="text-sm">Repeat</span>
          </div>
          <Select
            value={formData.is_recurring ? formData.recurrence_type : 'never'}
            onValueChange={(value) => {
              if (value === 'never') {
                setFormData({ ...formData, is_recurring: false });
              } else {
                setFormData({ ...formData, is_recurring: true, recurrence_type: value });
              }
            }}
          >
            <SelectTrigger className="w-32 h-8 text-sm border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Early Reminder */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="text-sm">Early Reminder</span>
          </div>
          <Select
            value={String(formData.reminder_minutes || '0')}
            onValueChange={(value) => setFormData({ ...formData, reminder_minutes: parseInt(value) })}
          >
            <SelectTrigger className="w-32 h-8 text-sm border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">None</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="1440">1 day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-3 mt-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</div>
        
        <Select
          value={formData.event_type}
          onValueChange={(value) => setFormData({ ...formData, event_type: value })}
        >
          <SelectTrigger className="border-0">
            <SelectValue>
              <span className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded", selectedCategory && `bg-${selectedCategory.color}-500`)} />
                {getCategoryEmoji(formData.event_type)} {formData.event_type}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {eventCategories
              .filter(category => {
                const name = category.name.toLowerCase();
                return !name.includes('holiday') && !name.includes('vacation') && !name.includes('leave') && !name.includes('absence');
              })
              .map(category => (
                <SelectItem key={category.id} value={category.name}>
                  <span className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded", `bg-${category.color}-500`)} />
                    {getCategoryEmoji(category.name)} {category.name}
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">!!!</span>
            <span className="text-sm">Priority</span>
          </div>
          <Select
            value={formData.priority || 'none'}
            onValueChange={(value) => setFormData({ ...formData, priority: value })}
          >
            <SelectTrigger className="w-32 h-8 text-sm border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Places & People Section */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-3 mt-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Places & People</div>
        
        {/* Location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <MapPin className="w-4 h-4 text-slate-400" />
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter a Location"
              className="text-sm border-0 px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Event Visibility */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Event Visibility</div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, visibility: 'private' })}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                formData.visibility === 'private' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Private - Only for me</span>
              </div>
              {formData.visibility === 'private' && (
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({ ...formData, visibility: 'shared' })}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                formData.visibility === 'shared' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Shared - Everyone can see</span>
              </div>
              {formData.visibility === 'shared' && (
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({ ...formData, visibility: 'selected' })}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                formData.visibility === 'selected' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span>Selected - Choose users</span>
              </div>
              {formData.visibility === 'selected' && (
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* User Selection - Show when visibility is 'selected' */}
        {formData.visibility === 'selected' && (
          <div className="space-y-2 pt-2">
            <div className="text-sm font-medium">Select Users</div>
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white">
              {users.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                >
                  <Checkbox
                    checked={formData.participant_user_ids.includes(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                  />
                  <Avatar user={user} size="sm" className="w-6 h-6" />
                  <span className="text-sm">
                    {user.first_name} {user.last_name}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Email Invitation */}
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-medium">Invite by Email</div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="email@example.com"
                  className="text-sm h-8"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddEmail}
                  size="sm"
                  className="h-8"
                >
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
              
              {formData.participant_customer_emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.participant_customer_emails.map((email, idx) => (
                    <div
                      key={idx}
                      className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center gap-1.5"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="hover:text-purple-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Copy Link */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className="w-full h-8"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Copy Invitation Link
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete button at the bottom if editing */}
      {event && onDelete && (
        <div className="pt-4">
          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving}
            className={cn(
              "w-full p-3 text-sm rounded-lg transition-colors flex items-center justify-center gap-2",
              isSaving 
                ? "text-slate-400 bg-slate-100 cursor-not-allowed"
                : "text-red-600 hover:bg-red-50"
            )}
          >
            Delete Event
          </button>
        </div>
      )}
    </form>
  );
}