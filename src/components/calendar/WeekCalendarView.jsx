import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getWeek } from 'date-fns';
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

export default function WeekCalendarView({ 
  currentDate, 
  events, 
  eventCategories, 
  onEventClick, 
  onEventDoubleClick,
  onDateClick, 
  onDuplicateEvent, 
  onDeleteEvent,
  draggedEvent,
  onDragStart,
  onDragEnd,
  onDrop,
  selectedEventId,
  onEventSelect,
  users = []
}) {
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Mini calendar data
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDayAndHour = (day, hour) => {
    return events.filter(event => {
      if (!event.start_time || event.all_day) return false;
      const eventStart = parseISO(event.start_time);
      const hourStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0);
      const hourEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour + 1, 0, 0);

      return isSameDay(eventStart, day) && eventStart >= hourStart && eventStart < hourEnd;
    }).sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
  };
  
  const getEventDurationInHours = (event) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
  };

  const allDayEvents = events.filter(e => e.all_day && e.start_time);

  const weekNumber = getWeek(currentDate, { weekStartsOn: 0 });

  return (
    <div className="flex h-full bg-white">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col border-r border-slate-200">
      <div className="grid grid-cols-8 border-b border-slate-200">
        <div className="p-3 text-sm font-semibold text-slate-700 bg-slate-50 border-r">All Day</div>
        {weekDays.map((day, idx) => {
          const dayAllDayEvents = allDayEvents.filter(e => isSameDay(parseISO(e.start_time), day));
          
          return (
            <div key={idx} className="p-2 text-center bg-slate-50 border-r last:border-r-0">
              <div className="text-sm font-semibold text-slate-700">{format(day, 'EEE')}</div>
              <div className={cn(
                "text-lg font-semibold text-slate-700",
                isSameDay(day, new Date()) && "text-indigo-600"
              )}>{format(day, 'd')}</div>
              {dayAllDayEvents.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayAllDayEvents.map(event => {
                    const category = eventCategories.find(c => c.name === event.event_type);
                    const colorClass = event.isPublicHoliday ? 'red' : (category?.color || 'blue');
                    
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventSelect && onEventSelect(event.id);
                          onEventClick(event, e);
                        }}
                        className={cn(
                          "px-1 py-0.5 rounded text-[10px] cursor-pointer hover:opacity-80 truncate",
                          selectedEventId === event.id ? 'bg-indigo-600 text-white' : `bg-${colorClass}-100 text-${colorClass}-700`
                        )}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="overflow-y-auto max-h-[600px]">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-slate-100">
            <div className="p-2 text-xs text-slate-500 bg-slate-50 border-r">
              {format(new Date().setHours(hour, 0), 'h a')}
            </div>
            {weekDays.map((day, idx) => {
              const hourEvents = getEventsForDayAndHour(day, hour);
              
              return (
                <div
                  key={idx}
                  onClick={() => onDateClick(day)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetDate = new Date(day);
                    targetDate.setHours(0, 0, 0, 0);
                    onDrop(e, targetDate, hour);
                  }}
                  className={cn(
                    "p-1 min-h-[60px] border-r last:border-r-0 cursor-pointer hover:bg-slate-50 transition-colors"
                  )}
                >
                  {hourEvents.map(event => {
                    const category = eventCategories.find(c => c.name === event.event_type);
                    const colorClass = category?.color || 'gray';
                    const isDragging = draggedEvent?.id === event.id;
                    const isSelected = selectedEventId === event.id;
                    const durationHours = getEventDurationInHours(event);
                    
                    return (
                      <ContextMenu key={event.id}>
                        <ContextMenuTrigger>
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              onDragStart(event, e);
                            }}
                            onDragEnd={onDragEnd}
                            onMouseDown={(e) => {
                              e.currentTarget._clickStartTime = Date.now();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventSelect && onEventSelect(event.id);
                              onEventClick(event, e);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (onEventDoubleClick) {
                                onEventDoubleClick(event, e);
                              }
                            }}
                            className={cn(
                              "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity mb-1 overflow-hidden",
                              isSelected ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : `bg-${colorClass}-100 text-${colorClass}-700`,
                              isDragging && "opacity-50"
                            )}
                            style={{
                              minHeight: durationHours > 1 ? `${durationHours * 60 - 4}px` : 'auto'
                            }}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            <div className={cn("text-xs truncate", isSelected ? "text-white/90" : "opacity-75")}>
                              {format(parseISO(event.start_time), 'h:mm a')}
                            </div>
                            {event.location && (
                              <div className={cn("text-xs truncate", isSelected ? "text-white/90" : "opacity-75")}>
                                <MapPin className="w-3 h-3 inline" /> {event.location}
                              </div>
                            )}
                            {durationHours > 1 && (
                              <div className={cn("text-xs truncate", isSelected ? "text-white/90" : "opacity-60")}>
                                ({durationHours}h)
                              </div>
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-white">
                          <ContextMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateEvent(event);
                          }}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </ContextMenuItem>
                          <ContextMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEvent(event.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>

      {/* Right Sidebar - Mini Calendar + Selected Event Details */}
      <div className="w-64 bg-white flex-shrink-0 flex flex-col">
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
          <div className="border-t border-slate-200 p-4 bg-white flex-1 overflow-auto">
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
                rows={2}
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
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 mt-4">
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
                    <span className="w-4 h-4 flex items-center justify-center text-slate-400 font-semibold text-xs">+H</span>
                    <span className="text-sm">Duration</span>
                  </div>
                  <span className="text-sm text-slate-400">1h</span>
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
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 mt-4">
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
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 mt-4">
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
              <div className="space-y-2">
                <div className="text-sm font-medium">Event Visibility</div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setEditingEvent({ ...editingEvent, visibility: 'private' })}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                      editingEvent.visibility === 'private' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>Private - Only for me</span>
                    </div>
                    {editingEvent.visibility === 'private' && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setEditingEvent({ ...editingEvent, visibility: 'shared' })}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                      editingEvent.visibility === 'shared' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>Shared - Everyone can see</span>
                    </div>
                    {editingEvent.visibility === 'shared' && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setEditingEvent({ ...editingEvent, visibility: 'selected' })}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                      editingEvent.visibility === 'selected' ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>Selected - Choose users</span>
                    </div>
                    {editingEvent.visibility === 'selected' && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button
                onClick={handleSaveEvent}
                disabled={isSaving}
                className="w-full h-9 text-sm bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}