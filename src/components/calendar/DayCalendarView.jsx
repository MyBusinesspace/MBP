import React, { useState, useMemo, useEffect } from 'react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, getWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { Copy, Trash2, MapPin, Calendar as CalendarIcon, Save, Clock } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { CalendarEvent } from '@/entities/all';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function DayCalendarView({ 
  currentDate, 
  events, 
  eventCategories, 
  onEventClick, 
  onDuplicateEvent, 
  onDeleteEvent,
  draggedEvent,
  onDragStart,
  onDragEnd,
  onDrop,
  onDateClick,
  onCreateEvent,
  selectedEventId,
  onEventSelect,
  users = []
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Mini calendar data
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get all events for the day (excluding all-day events)
  // Merge live editing changes with events for real-time visual update
  const dayEvents = useMemo(() => {
    const filtered = events.filter(event => {
      if (!event.start_time || event.all_day) return false;
      const eventStart = parseISO(event.start_time);
      return isSameDay(eventStart, currentDate);
    }).sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
    
    // Apply live edits if editing
    if (editingEvent && selectedEventId) {
      return filtered.map(event => 
        event.id === selectedEventId 
          ? { ...event, ...editingEvent }
          : event
      );
    }
    
    return filtered;
  }, [events, currentDate, editingEvent, selectedEventId]);

  const selectedEvent = useMemo(() => {
    return selectedEventId ? events.find(e => e.id === selectedEventId) : null;
  }, [selectedEventId, events]);

  useEffect(() => {
    if (selectedEvent && selectedEvent.start_time && selectedEvent.end_time) {
      try {
        setEditingEvent({
          title: selectedEvent.title,
          description: selectedEvent.description || '',
          location: selectedEvent.location || '',
          start_time: selectedEvent.start_time,
          end_time: selectedEvent.end_time,
          all_day: selectedEvent.all_day || false
        });
      } catch (error) {
        console.warn('Error setting editing event:', error);
        setEditingEvent(null);
      }
    } else {
      setEditingEvent(null);
    }
  }, [selectedEvent]);

  const handleSaveEvent = async () => {
    if (!selectedEvent || !editingEvent) return;
    
    setIsSaving(true);
    try {
      await CalendarEvent.update(selectedEvent.id, editingEvent);
      toast.success('Event updated');
    } catch (error) {
      toast.error('Failed to update event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHourClick = (hour, e) => {
    e.stopPropagation();
    
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      
      const eventDate = new Date(currentDate);
      eventDate.setHours(hour, 0, 0, 0);
      if (onCreateEvent) {
        onCreateEvent(eventDate);
      }
    } else {
      const timeout = setTimeout(() => {
        setClickTimeout(null);
      }, 300);
      setClickTimeout(timeout);
    }
  };

  const allDayEvents = events.filter(event => {
    if (!event.start_time || !event.all_day) return false;
    return isSameDay(parseISO(event.start_time), currentDate);
  });

  const weekNumber = getWeek(currentDate, { weekStartsOn: 0 });

  return (
    <div className="flex h-full bg-white">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="text-2xl font-semibold text-slate-900">
            {format(currentDate, 'd MMMM yyyy')}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">
            {format(currentDate, 'EEEE')}, Week {weekNumber}
          </div>
        </div>

        {/* All-day section */}
        <div className="px-4 py-2 border-b border-slate-200">
          <div className="flex">
            <div className="w-16 flex-shrink-0"></div>
            <div className="flex-1">
              {allDayEvents.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 mb-1">all-day</div>
                  {allDayEvents.map(event => {
                    const category = eventCategories.find(c => c.name === event.event_type);
                    const colorClass = event.isPublicHoliday ? 'red' : (category?.color || 'blue');
                    
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event, e);
                        }}
                        className={cn(
                          "px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80",
                          `bg-${colorClass}-100 text-${colorClass}-700`
                        )}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-300">all-day</div>
              )}
            </div>
          </div>
        </div>

        {/* Hours grid with events overlay */}
        <div className="flex-1 overflow-y-auto relative" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div className="relative" style={{ height: `${hours.length * 60}px` }}>
            {/* Hour lines */}
            {hours.map(hour => (
              <div key={hour} className="flex border-b border-slate-100 absolute w-full" style={{ top: `${hour * 60}px`, height: '60px' }}>
                <div className="w-16 flex-shrink-0 text-xs text-slate-400 pt-1 pl-2">
                  {hour === 12 ? 'Noon' : `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour < 12 ? 'AM' : 'PM'}`}
                </div>
                <div 
                  className="flex-1"
                  onClick={(e) => handleHourClick(hour, e)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => onDrop(e, currentDate, hour)}
                />
              </div>
            ))}

            {/* Events positioned absolutely - grouped by time slot */}
            {(() => {
              const groupedEvents = [];
              const processedIds = new Set();

              dayEvents.forEach(event => {
                if (processedIds.has(event.id)) return;

                const eventStart = parseISO(event.start_time);
                const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();

                // Find all events that start at the same time
                const sameTimeEvents = dayEvents.filter(e => {
                  const eStart = parseISO(e.start_time);
                  const eStartMinutes = eStart.getHours() * 60 + eStart.getMinutes();
                  return eStartMinutes === startMinutes;
                });

                sameTimeEvents.forEach(e => processedIds.add(e.id));
                groupedEvents.push({ events: sameTimeEvents, startMinutes });
              });

              return groupedEvents.map(({ events, startMinutes }, groupIdx) => {
                const mainEvent = events[0];
                const category = eventCategories.find(c => c.name === mainEvent.event_type);
                const colorClass = category?.color || 'blue';
                const isDragging = draggedEvent?.id === mainEvent.id;
                const isSelected = selectedEventId === mainEvent.id;
                const eventStart = parseISO(mainEvent.start_time);
                const eventEnd = parseISO(mainEvent.end_time);
                const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
                const duration = endMinutes - startMinutes;

                return (
                  <ContextMenu key={`group-${groupIdx}`}>
                    <ContextMenuTrigger>
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          onDragStart(mainEvent, e);
                        }}
                        onDragEnd={onDragEnd}
                        onMouseDown={(e) => {
                          e.currentTarget._clickStartTime = Date.now();
                        }}
                        onMouseUp={(e) => {
                          const clickDuration = Date.now() - (e.currentTarget._clickStartTime || 0);
                          if (clickDuration < 200) {
                            e.stopPropagation();
                            onEventSelect && onEventSelect(mainEvent.id);
                            onEventClick(mainEvent, e);
                          }
                        }}
                        className={cn(
                          "absolute rounded px-3 py-2 text-sm cursor-pointer transition-all shadow-sm overflow-hidden",
                          isSelected ? `bg-indigo-600 text-white ring-2 ring-indigo-400` : `bg-${colorClass}-100 text-${colorClass}-800 hover:shadow-md`,
                          isDragging && "opacity-50"
                        )}
                        style={{
                          left: '68px',
                          right: '8px',
                          top: `${startMinutes}px`,
                          height: `${Math.max(duration, 30)}px`,
                          zIndex: isSelected ? 100 : 10 + groupIdx
                        }}
                      >
                        <div className="font-semibold truncate">{mainEvent.title}</div>
                        <div className={cn("text-xs mt-1 truncate", isSelected ? "text-white/90" : "opacity-75")}>
                          {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                        </div>
                        {mainEvent.location && (
                          <div className={cn("text-xs truncate", isSelected ? "text-white/90" : "opacity-75")}>
                            <MapPin className="w-3 h-3 inline" /> {mainEvent.location}
                          </div>
                        )}
                        {events.length > 1 && (
                          <div className={cn("text-xs truncate", isSelected ? "text-white/90" : "opacity-60")}>
                            +{events.length - 1} more
                          </div>
                        )}
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-white border-slate-200 shadow-lg">
                      <ContextMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateEvent(mainEvent);
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent(mainEvent.id);
                        }}
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              });
            })()}
          </div>
        </div>

      </div>

      {/* Right Sidebar - Mini Calendar + Selected Event Details */}
      <div className="w-64 border-l border-slate-200 bg-white flex-shrink-0 flex flex-col">
        <div className="p-4">
          <div className="text-center mb-4">
            <div className="text-sm font-semibold text-slate-700">
              {format(currentDate, 'MMMM yyyy')}
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-slate-400 font-medium">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isSameDay(day, currentDate);
              const isTodayDay = isToday(day);
              
              return (
                <button
                  key={index}
                  onClick={() => onDateClick && onDateClick(day)}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-full text-xs transition-colors",
                    !isCurrentMonth && "text-slate-300",
                    isCurrentMonth && "text-slate-700 hover:bg-slate-100",
                    isCurrentDay && "bg-slate-900 text-white font-semibold",
                    isTodayDay && !isCurrentDay && "font-semibold"
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Event Details - Full EventDialog Content */}
        {selectedEvent && editingEvent && (
          <div className="border-t border-slate-200 bg-white flex-1 flex flex-col">
            <div className="flex-1 overflow-auto p-3">
            {/* Title */}
            <div className="space-y-1">
              <Input
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                placeholder="New Event"
                className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Notes */}
            <div>
              <Textarea
                value={editingEvent.description}
                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                placeholder="Notes here editable"
                rows={1}
                className="text-sm border-0 px-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-500"
              />
            </div>

            {/* URL / Meeting Link */}
            {selectedEvent.event_type && selectedEvent.event_type.toLowerCase().includes('call') && (
              <div className="py-2">
                <Input
                  value={editingEvent.meeting_link || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, meeting_link: e.target.value })}
                  placeholder="URL"
                  className="text-sm border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-blue-600"
                />
              </div>
            )}

            {/* Date & Time Section */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2 mt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</div>
              
              {/* Start Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Start Date</span>
                </div>
                <input
                  type="date"
                  value={editingEvent.start_time ? editingEvent.start_time.split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    const startTime = editingEvent.start_time ? editingEvent.start_time.split('T')[1] : '09:00';
                    setEditingEvent({
                      ...editingEvent,
                      start_time: `${date}T${startTime}`
                    });
                  }}
                  className="text-sm border-0 bg-transparent text-right focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">End Date</span>
                </div>
                <input
                  type="date"
                  value={editingEvent.end_time ? editingEvent.end_time.split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    const endTime = editingEvent.end_time ? editingEvent.end_time.split('T')[1] : '10:00';
                    setEditingEvent({
                      ...editingEvent,
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
                  {!editingEvent.all_day && (
                    <input
                      type="time"
                      value={editingEvent.start_time ? editingEvent.start_time.split('T')[1]?.substring(0, 5) || '09:00' : '09:00'}
                      onChange={(e) => {
                        try {
                          const date = editingEvent.start_time ? editingEvent.start_time.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                          const newStartTime = `${date}T${e.target.value}:00`;
                          setEditingEvent({
                            ...editingEvent,
                            start_time: newStartTime
                          });
                        } catch (error) {
                          console.warn('Error updating start time:', error);
                        }
                      }}
                      className="text-sm border-0 bg-transparent text-right focus:outline-none"
                    />
                  )}
                  <Switch
                    checked={editingEvent.all_day}
                    onCheckedChange={(checked) => setEditingEvent({ ...editingEvent, all_day: checked })}
                  />
                </div>
              </div>

              {/* Duration */}
              {!editingEvent.all_day && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">End Time</span>
                  </div>
                  <input
                    type="time"
                    value={editingEvent.end_time ? editingEvent.end_time.split('T')[1]?.substring(0, 5) || '10:00' : '10:00'}
                    onChange={(e) => {
                      try {
                        const date = editingEvent.end_time ? editingEvent.end_time.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                        const newEndTime = `${date}T${e.target.value}:00`;
                        setEditingEvent({
                          ...editingEvent,
                          end_time: newEndTime
                        });
                      } catch (error) {
                        console.warn('Error updating end time:', error);
                      }
                    }}
                    className="text-sm border-0 bg-transparent text-right focus:outline-none"
                  />
                </div>
              )}

              {/* Repeat */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Repeat</span>
                </div>
                <span className="text-sm text-slate-400">Never</span>
              </div>

              {/* Early Reminder */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Early Reminder</span>
                </div>
                <span className="text-sm text-slate-400">None</span>
              </div>
            </div>

            {/* Categories Section */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2 mt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</div>
              
              <div className="flex items-center justify-between">
                <div className={cn("px-2 py-1 rounded text-xs font-medium flex items-center gap-2", 
                  eventCategories.find(c => c.name === selectedEvent.event_type)?.color 
                    ? `bg-${eventCategories.find(c => c.name === selectedEvent.event_type).color}-100 text-${eventCategories.find(c => c.name === selectedEvent.event_type).color}-700`
                    : 'bg-gray-100 text-gray-700'
                )}>
                  <div className={cn("w-2 h-2 rounded-full", 
                    eventCategories.find(c => c.name === selectedEvent.event_type)?.color 
                      ? `bg-${eventCategories.find(c => c.name === selectedEvent.event_type).color}-500`
                      : 'bg-gray-500'
                  )} />
                  {selectedEvent.event_type || 'Event'}
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">!!!</span>
                  <span className="text-sm">Priority</span>
                </div>
                <span className="text-sm text-slate-400">None</span>
              </div>
            </div>

            {/* Places & People Section */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2 mt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Places & People</div>
              
              {/* Location */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <Input
                    value={editingEvent.location}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                    placeholder="Enter a Location"
                    className="text-sm border-0 px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Event Visibility */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium">Event Visibility</div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setEditingEvent({ ...editingEvent, visibility: 'private' })}
                    className={cn(
                      "w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors",
                      editingEvent.visibility === 'private' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
                    )}
                  >
                    <span>Private - Only for me</span>
                    {editingEvent.visibility === 'private' && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setEditingEvent({ ...editingEvent, visibility: 'shared' })}
                    className={cn(
                      "w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors",
                      editingEvent.visibility === 'shared' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
                    )}
                  >
                    <span>Shared - Everyone can see</span>
                    {editingEvent.visibility === 'shared' && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setEditingEvent({ ...editingEvent, visibility: 'selected' })}
                    className={cn(
                      "w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors",
                      editingEvent.visibility === 'selected' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
                    )}
                  >
                    <span>Selected - Choose users</span>
                    {editingEvent.visibility === 'selected' && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            </div>
            
            {/* Fixed Save Button */}
            <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
              <Button
                onClick={handleSaveEvent}
                disabled={isSaving}
                className="w-full h-9 text-sm bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}