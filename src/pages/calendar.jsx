import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarEvent, CalendarEventCategory, PublicHoliday, QuickTask } from '@/entities/all';
import { useData } from '../components/DataProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  CheckSquare,
  Square,
  Trash2,
  Copy,
  Search
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO, eachDayOfInterval, startOfDay, getWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EventDialog from '../components/calendar/EventDialog';
import CalendarAndTasksSettingsDialog from '../components/calendar/CalendarAndTasksSettingsDialog';
import EventDetailsDialog from '../components/calendar/EventDetailsDialog';
import QuickTasksList from '../components/quicktasks/QuickTasksList';
import TaskDetailsSidePanel from '../components/quicktasks/TaskDetailsSidePanel';
import { QuickTaskSettings } from '@/entities/all';
import YearCalendarView from '../components/calendar/YearCalendarView';
import WeekCalendarView from '../components/calendar/WeekCalendarView';
import DayCalendarView from '../components/calendar/DayCalendarView';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';


import { Input } from '@/components/ui/input';
import Avatar from '../components/Avatar';

export default function CalendarPage() {
  const { currentUser, currentCompany, teams, loadUsers, loadDepartments, loadCustomers } = useData();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [eventCategories, setEventCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventType, setEventType] = useState('meeting');
  const [viewMode, setViewMode] = useState('month');

  const [searchQuery, setSearchQuery] = useState('');
  
  // Quick Tasks state
  const [quickTaskSettings, setQuickTaskSettings] = useState(null);
  const [quickTaskVisibleColumns, setQuickTaskVisibleColumns] = useState({
    title: true,
    department: true,
    client: true,
    assigned: true,
    due_date: true
  });
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
  const [showTaskDetailsPanel, setShowTaskDetailsPanel] = useState(false);
  const [quickTasksRefreshKey, setQuickTasksRefreshKey] = useState(0);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [quickTasksCollapsed, setQuickTasksCollapsed] = useState(false); 
  
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [copiedEvent, setCopiedEvent] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // ✅ FASE 1: Solo eventos, categorías y festivos
      const [eventsData, categoriesData, holidaysData, quickTaskSettingsData] = await Promise.all([
        CalendarEvent.list('-start_time', 300),
        CalendarEventCategory.list('sort_order'),
        PublicHoliday.list('date'),
        QuickTaskSettings.list()
      ]);

      const validEvents = (eventsData || []).filter(event => {
        // Filter out deleted events (check both top level and data level)
        if (event.is_deleted || event.data?.is_deleted) return false;
        if (!event.start_time || !event.end_time) return false;
        try {
          const startDate = parseISO(event.start_time);
          const endDate = parseISO(event.end_time);
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
          return true;
        } catch (error) {
          return false;
        }
      });

      // Convert public holidays to calendar events
      const holidayEvents = (holidaysData || []).map(holiday => ({
        id: `holiday_${holiday.id}`,
        title: `🎉 ${holiday.name}`,
        description: 'Public Holiday',
        event_type: 'public_holiday',
        start_time: `${holiday.date}T00:00:00.000Z`,
        end_time: `${holiday.date}T23:59:59.999Z`,
        all_day: true,
        color: 'red',
        isPublicHoliday: true
      }));

      setPublicHolidays(holidaysData || []);
      setEvents([...validEvents, ...holidayEvents]);
      // ✅ CRITICAL: Only use categories from database, no virtual categories
      setEventCategories(categoriesData || []);
      
      // Load Quick Task settings
      if (quickTaskSettingsData && quickTaskSettingsData.length > 0) {
        setQuickTaskSettings(quickTaskSettingsData[0]);
      } else {
        try {
          const newSettings = await QuickTaskSettings.create({ permission_mode: 'restricted' });
          setQuickTaskSettings(newSettings);
        } catch (err) {
          // Write maintenance fallback: continue without blocking page
          setQuickTaskSettings({ permission_mode: 'restricted' });
        }
      }
      
      setIsLoading(false);
      
      // ✅ FASE 2: Background
      Promise.all([
        loadUsers(),
        loadDepartments(),
        loadCustomers(),
        (async () => {
          try {
            const googleRes = await base44.functions.invoke('syncGoogleCalendar');
            if (googleRes.data?.connected) {
              setIsGoogleConnected(true);
              // ✅ Map Google events to use existing category or default
              const googleEventsRaw = googleRes.data.events || [];
              const mappedGoogleEvents = googleEventsRaw.map(evt => {
                // Check if event_type exists in our categories
                const categoryExists = categoriesData?.find(c => c.name === evt.event_type);
                return {
                  ...evt,
                  // If Google event has invalid category, set to null (will show as gray)
                  event_type: categoryExists ? evt.event_type : null
                };
              });
              return mappedGoogleEvents;
            }
            setIsGoogleConnected(false);
            return [];
          } catch (err) {
            return [];
          }
        })()
      ]).then(([usersData, departmentsData, customersData, googleEvents]) => {
        setUsers(usersData || []);
        setDepartments((departmentsData || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
        setCustomers(Array.isArray(customersData) ? customersData : []);
        if (googleEvents.length > 0) {
          setEvents(prev => [...prev, ...googleEvents]);
        }
      }).catch(console.error);
      
    } catch (error) {
      toast.error('Failed to load calendar data');
      setIsLoading(false);
    }
  }, [loadUsers]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // ESC key - close event dialog
      if (event.key === 'Escape' && showEventDialog) {
        event.preventDefault();
        setShowEventDialog(false);
        setSelectedEvent(null);
        setSelectedDate(null);
        return;
      }

      // Delete key - delete selected event
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEventId && !showEventDialog) {
        const activeElement = document.activeElement;
        if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
          event.preventDefault();
          const eventToDelete = events.find(e => e.id === selectedEventId);
          if (eventToDelete && !eventToDelete.is_google_event && !eventToDelete.isPublicHoliday && !eventToDelete.id?.startsWith('g_') && !eventToDelete.id?.startsWith('holiday_')) {
            if (showEventDetailsDialog) {
              setShowEventDetailsDialog(false);
            }
            handleDeleteEvent(selectedEventId);
            setSelectedEventId(null);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showEventDialog, showEventDetailsDialog, selectedEventId, events]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredEvents = useMemo(() => {
    let currentFilteredEvents = events;

    if (searchQuery) {
      currentFilteredEvents = currentFilteredEvents.filter(event =>
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (hiddenCategories.length > 0) { 
      currentFilteredEvents = currentFilteredEvents.filter(event => !hiddenCategories.includes(event.event_type));
    }

    return currentFilteredEvents;
  }, [events, searchQuery, hiddenCategories]);

  const getEventsForDay = (day) => {
    return filteredEvents.filter(event => {
      if (!event.start_time || !event.end_time) return false;
      try {
        // Parse dates and extract just the date part (ignore timezone issues)
        const startStr = event.start_time.split('T')[0];
        const endStr = event.end_time.split('T')[0];
        const dayStr = format(day, 'yyyy-MM-dd');
        
        // For holidays/absences, only show on first and last day
        const isHolidayLike = event.event_type?.toLowerCase().includes('holiday') || 
                              event.event_type?.toLowerCase().includes('absence') ||
                              event.event_type?.toLowerCase().includes('vacation');
        
        if (isHolidayLike) {
          return dayStr === startStr || dayStr === endStr;
        }
        
        return dayStr >= startStr && dayStr <= endStr;
      } catch (error) {
        return false;
      }
    });
  };

  const handleDateClick = (day) => {
    // Single click - create new event
    setSelectedDate(day);
    setSelectedEvent(null);
    setShowEventDialog(true);
  };

  const handleDateDoubleClick = (day) => {
    // Double click - create new event
    setSelectedDate(day);
    setSelectedEvent(null);
    setShowEventDialog(true);
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    // Single click - select event and open details
    setSelectedEventId(event.id);
    setSelectedEvent(event);
    setShowEventDetailsDialog(true);
  };

  const handleEventDoubleClick = (event, e) => {
    e.stopPropagation();
    // Don't allow editing Google Calendar or public holiday events
    if (event.is_google_event || event.id?.startsWith('g_') || event.isPublicHoliday) {
      toast.info('This is a read-only event from an external source');
      return;
    }
    // Double click - open event in edit sidebar
    setSelectedEvent(event);
    setSelectedDate(null);
    setShowEventDialog(true);
  };

  const handleEditEvent = (event) => {
    // Don't allow editing Google Calendar or public holiday events
    if (event.is_google_event || event.id?.startsWith('g_') || event.isPublicHoliday) {
      toast.info('This is a read-only event from an external source');
      return;
    }
    setShowEventDetailsDialog(false);
    setSelectedEvent(event);
    setSelectedDate(null);
    setShowEventDialog(true);
  };

  const handleDuplicateEvent = async (event) => {
    try {
      const duplicatedEvent = {
        ...event,
        title: `${event.title} (Copy)`,
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
      };
      
      const newEvent = await CalendarEvent.create(duplicatedEvent);
      toast.success('Event duplicated successfully');
      setEvents(prev => [...prev, newEvent]);
    } catch (error) {
      toast.error('Failed to duplicate event');
    }
  };

  const handleCopyEvent = (event) => {
    setCopiedEvent({
      ...event,
      id: undefined,
      created_date: undefined,
      updated_date: undefined,
    });
    toast.success('Event copied to clipboard');
  };

  const handleCutEvent = async (event) => {
    setCopiedEvent({
      ...event,
      id: undefined,
      created_date: undefined,
      updated_date: undefined,
    });
    await handleDeleteEvent(event.id);
    toast.success('Event cut to clipboard');
  };

  const handlePasteEvent = async (targetDate) => {
    if (!copiedEvent) {
      toast.error('No event copied');
      return;
    }

    try {
      const originalStart = new Date(copiedEvent.start_time);
      const originalEnd = new Date(copiedEvent.end_time);
      const duration = originalEnd.getTime() - originalStart.getTime();

      const newStart = new Date(targetDate);
      newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      const pastedEvent = {
        ...copiedEvent,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      };

      const newEvent = await CalendarEvent.create(pastedEvent);
      toast.success('Event pasted successfully');
      setEvents(prev => [...prev, newEvent]);
    } catch (error) {
      toast.error('Failed to paste event');
    }
  };

  const handleViewEvent = (event) => {
    // Don't allow editing Google Calendar or public holiday events
    if (event.is_google_event || event.id?.startsWith('g_') || event.isPublicHoliday) {
      toast.info('This is a read-only event from an external source');
      return;
    }
    setSelectedEvent(event);
    setSelectedDate(null);
    setShowEventDialog(true);
  };

  const handleEventSuccess = async (savedEvent, emailsSent = 0) => {
    await loadData(); 
    setShowEventDialog(false);
    setSelectedEvent(null);
    setSelectedDate(null);
    
    if (emailsSent > 0) {
      toast.success(`Event created and ${emailsSent} email invitations sent!`);
    } else {
      toast.success('Event saved successfully!');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    // Find the event to check if it's a Google event
    const eventToDelete = events.find(e => e.id === eventId);
    if (eventToDelete && (eventToDelete.is_google_event || eventId?.startsWith('g_') || eventId?.startsWith('holiday_'))) {
      return;
    }
    
    setEvents(prev => prev.filter(e => e.id !== eventId));
    
    try {
      await CalendarEvent.delete(eventId);
      setShowEventDialog(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleDeleteEventFromDetails = async (eventId) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setShowEventDetailsDialog(false);
    setSelectedEvent(null);
    
    try {
      await CalendarEvent.delete(eventId);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handlePreviousMonth = () => {
    if (viewMode === 'year') {
      setCurrentDate(date => new Date(date.getFullYear() - 1, date.getMonth(), 1));
    } else if (viewMode === 'day') {
      setCurrentDate(date => addDays(date, -1));
    } else if (viewMode === 'week') {
      setCurrentDate(date => addDays(date, -7));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'year') {
      setCurrentDate(date => new Date(date.getFullYear() + 1, date.getMonth(), 1));
    } else if (viewMode === 'day') {
      setCurrentDate(date => addDays(date, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(date => addDays(date, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleUpdateQuickTaskPermissions = async (newMode) => {
    try {
      await QuickTaskSettings.update(quickTaskSettings.id, { permission_mode: newMode });
      setQuickTaskSettings({ ...quickTaskSettings, permission_mode: newMode });
      toast.success('Permissions updated');
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const handleUpdateQuickTaskColumns = (newColumns) => {
    setQuickTaskVisibleColumns(newColumns);
  };

  const handleEditTask = (task) => {
    setSelectedTaskForDetails(task);
    setShowTaskDetailsPanel(true);
  };

  const handleAddTask = async () => {
    try {
      const newTask = await QuickTask.create({
        title: 'New Task',
        status: 'open'
      });
      setQuickTasksRefreshKey(prev => prev + 1);
      setSelectedTaskForDetails(newTask);
      setShowTaskDetailsPanel(true);
      toast.success('Task created');
    } catch (error) {
      if (error?.response?.status === 503 || String(error?.message || '').includes('temporarily unavailable')) {
        toast.warning('Writes are temporarily unavailable due to maintenance. Please try again in a few minutes.');
      } else {
        toast.error('Failed to create task');
      }
    }
  };

  const handleTaskUpdate = useCallback((taskId, updates) => {
    setQuickTasksRefreshKey(prev => prev + 1);
    loadData(); // Reload all data to ensure tasks list is fresh
  }, [loadData]);

  const handleDragStart = (event, e) => {
    e.stopPropagation();
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, date) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const handleDrop = async (e, targetDate, targetHour = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedEvent) return;

    try {
      const originalStart = parseISO(draggedEvent.start_time);
      const originalEnd = parseISO(draggedEvent.end_time);
      const duration = originalEnd.getTime() - originalStart.getTime();

      let newStart = new Date(targetDate);
      let newAllDay = draggedEvent.all_day;

      if (targetHour !== null) {
          newStart.setHours(targetHour, 0, 0, 0);
          newAllDay = false;
      } else if (draggedEvent.all_day) {
          newStart.setHours(0, 0, 0, 0);
      } else {
          newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), originalStart.getMilliseconds());
      }

      const newEnd = new Date(newStart.getTime() + duration);

      const updatedData = {
        ...draggedEvent,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        all_day: newAllDay
      };

      await CalendarEvent.update(draggedEvent.id, updatedData);
      
      setEvents(prev => prev.map(evt => 
        evt.id === draggedEvent.id ? { ...evt, ...updatedData } : evt
      ));

      toast.success('Event moved successfully');
    } catch (error) {
      if (error.response?.status === 404) {
        setEvents(prev => prev.filter(evt => evt.id !== draggedEvent.id));
        toast.error('Event no longer exists');
      } else {
        toast.error('Failed to move event');
      }
    } finally {
      setDraggedEvent(null);
      setDragOverDate(null);
    }
  };

  const getCategoryEmoji = (categoryName) => {
    if (!categoryName) return '📌';
    const name = categoryName.toLowerCase();
    if (name === 'google') return '📅';
    if (name.includes('call')) return '📞';
    if (name.includes('site') || name.includes('meeting')) return '🎯';
    if (name.includes('company') || name.includes('event')) return '🎉';
    if (name.includes('absence') || name.includes('holiday') || name.includes('vacation')) return '🚫';
    if (name.includes('deadline')) return '⏰';
    if (name.includes('personal')) return '👤';
    if (name.includes('day off')) return '🌙';
    return '📌';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 h-screen flex flex-col overflow-hidden">
      {/* Header - Only title and Settings */}
      <Card className="p-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentCompany?.calendar_tab_icon_url ? '' : 'bg-purple-100'}`}>
              {currentCompany?.calendar_tab_icon_url ? (
                <img src={currentCompany.calendar_tab_icon_url} alt="Calendar" className="w-10 h-10 object-contain" />
              ) : (
                <CalendarDays className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">Calendar</h1>
            <p className="text-slate-500 text-sm ml-2">
              {viewMode === 'year' ? format(currentDate, 'yyyy') : format(currentDate, 'MMMM yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isGoogleConnected && (
              <span 
                className="text-xs text-green-600 cursor-pointer hover:underline"
                onClick={() => {
                  loadData();
                  toast.success("Refreshed Google Calendar events");
                }}
              >
                ✓ Google Connected
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content: Calendar (flex-1) + Quick Tasks (420px) */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Calendar Section - flex-1 */}
        <div className="flex-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
        {/* Controls Bar - integrated as header */}
        <div className="flex items-center justify-between px-6 h-[60px] border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="border-l pl-4 ml-4 flex gap-2">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className={cn(viewMode === 'day' && 'bg-indigo-600 hover:bg-indigo-700')}
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className={cn(viewMode === 'week' && 'bg-indigo-600 hover:bg-indigo-700')}
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className={cn(viewMode === 'month' && 'bg-indigo-600 hover:bg-indigo-700')}
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('year')}
                  className={cn(viewMode === 'year' && 'bg-indigo-600 hover:bg-indigo-700')}
                >
                  Year
                </Button>
              </div>

              <div className="border-l pl-4 ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-44 justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {hiddenCategories.length === 0 
                            ? 'All Events' 
                            : `${eventCategories.length - hiddenCategories.length} visible`}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 bg-white">
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        setHiddenCategories([]);
                      }}
                      className="flex items-center gap-2"
                    >
                      {hiddenCategories.length === 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <CalendarIcon className="w-4 h-4" />
                      All Events
                    </DropdownMenuItem>
                    <div className="h-px bg-slate-200 my-1" />
                    {eventCategories.map(category => {
                      const isVisible = !hiddenCategories.includes(category.name);
                      return (
                        <DropdownMenuItem 
                          key={category.id}
                          onClick={(e) => {
                            e.preventDefault();
                            if (isVisible) {
                              setHiddenCategories(prev => [...prev, category.name]);
                            } else {
                              setHiddenCategories(prev => prev.filter(c => c !== category.name));
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          {isVisible ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <div className={cn("w-3 h-3 rounded", `bg-${category.color}-500`)} />
                          {getCategoryEmoji(category.name)} {category.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="border-l pl-4 ml-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
              </div>

            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-9 h-9 p-0 rounded-full bg-indigo-600 hover:bg-indigo-700" size="sm">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-lg">
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">CREATE EVENT</div>
                    {eventCategories
                      .filter(category => {
                        const name = category.name?.toLowerCase() || '';
                        return !name.includes('holiday') && 
                               !name.includes('absence') && 
                               !name.includes('vacation') &&
                               !name.includes('leave');
                      })
                      .map(category => (
                      <DropdownMenuItem key={category.id} onClick={() => {
                        setSelectedDate(new Date());
                        setSelectedEvent(null);
                        setEventType(category.name);
                        setShowEventDialog(true);
                      }}>
                        <div className={cn("w-3 h-3 rounded mr-2", `bg-${category.color}-500`)}></div>
                        {getCategoryEmoji(category.name)} {category.name}
                      </DropdownMenuItem>
                    ))}
                    <div className="h-px bg-slate-200 my-1"></div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">CREATE TASK</div>
                    <DropdownMenuItem onClick={handleAddTask}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Quick Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {/* Calendar Views */}
        {viewMode === 'month' && (
          <>
            <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '30px repeat(7, 1fr)' }}>
              <div className="p-2 text-center text-xs font-semibold text-slate-400 bg-slate-50"></div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="p-2 text-center text-xs font-semibold text-slate-700 bg-slate-50">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: '30px repeat(7, 1fr)' }}>
              {calendarDays.map((day, index) => {
                // Add week number at the start of each week
                if (index % 7 === 0) {
                  const weekNum = getWeek(day, { weekStartsOn: 1 });
                  return (
                    <React.Fragment key={`week-${index}`}>
                      <div className="min-h-[150px] p-1 border-b border-r border-slate-100 bg-slate-50 flex items-start justify-center">
                        <span className="text-[9px] text-slate-400 font-medium mt-1">{weekNum}</span>
                      </div>
                      {(() => {
                        const currentDay = day;
                        const dayEvents = getEventsForDay(currentDay);
                        const isToday = isSameDay(currentDay, new Date());
                        const isCurrentMonth = isSameMonth(currentDay, currentDate);
                        const isDragOver = dragOverDate && isSameDay(dragOverDate, currentDay);

                        return (
                          <div
                            key={index}
                            onClick={() => handleDateClick(currentDay)}
                            onDoubleClick={() => handleDateDoubleClick(currentDay)}
                            onDragOver={(e) => handleDragOver(e, currentDay)}
                            onDrop={(e) => handleDrop(e, currentDay)}
                            onContextMenu={(e) => {
                              if (copiedEvent) {
                                e.preventDefault();
                              }
                            }}
                            className={cn(
                              "min-h-[150px] p-1.5 border-b border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden",
                              !isCurrentMonth && "bg-slate-50/50 text-slate-400",
                              isToday && "bg-indigo-50",
                              isDragOver && "bg-indigo-100 ring-2 ring-indigo-400"
                            )}
                          >
                            <div className={cn(
                              "text-xs font-medium mb-1",
                              isToday && "text-indigo-600",
                              !isCurrentMonth && "text-slate-400"
                            )}>
                              {format(currentDay, 'd')}
                            </div>
                            <div className="space-y-0.5 w-full overflow-hidden">
                              {dayEvents.slice(0, 6).map(event => {
                                const category = eventCategories.find(c => c.name === event.event_type);
                                const colorClass = event.isPublicHoliday ? 'red' : (category?.color || 'gray');
                                const isDragging = draggedEvent?.id === event.id;
                                
                                const eventStart = startOfDay(parseISO(event.start_time));
                                const eventEnd = startOfDay(parseISO(event.end_time));
                                const isMultiDay = eventEnd > eventStart;
                                const isFirstDay = isSameDay(eventStart, currentDay);

                                // Find associated user for leave/holiday events (check participant_user_ids first)
                                const eventUser = event.participant_user_ids?.length === 1 
                                  ? users.find(u => u.id === event.participant_user_ids[0]) 
                                  : null;
                                
                                const isSelected = selectedEventId === event.id;
                                return (
                                  <ContextMenu key={event.id}>
                                    <ContextMenuTrigger>
                                      <div
                                        draggable={!event.isPublicHoliday}
                                        onDragStart={(e) => !event.isPublicHoliday && handleDragStart(event, e)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => {
                                          if (!event.isPublicHoliday) {
                                            setSelectedEventId(event.id);
                                            handleEventClick(event, e);
                                          }
                                        }}
                                        onDoubleClick={(e) => !event.isPublicHoliday && handleEventDoubleClick(event, e)}
                                        className={cn(
                                          "text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-all flex items-center gap-1 overflow-hidden",
                                          `bg-${colorClass}-100 text-${colorClass}-700`,
                                          isDragging && "opacity-50",
                                          isMultiDay && !isFirstDay && "border-l-2 border-l-slate-400",
                                          isSelected && "ring-2 ring-indigo-500 ring-offset-1"
                                        )}
                                        title={event.title}
                                      >
                                        <span className="truncate min-w-0">
                                          {isFirstDay || !isMultiDay ? event.title : '⋯ ' + event.title}
                                        </span>
                                        {event.is_google_event || event.id?.startsWith('g_') ? (
                                          <span className="w-4 h-4 shrink-0 flex items-center justify-center bg-white rounded-full text-[8px] font-bold text-blue-600">
                                            G
                                          </span>
                                        ) : eventUser ? (
                                          <Avatar user={eventUser} size="xs" className="w-4 h-4 shrink-0" />
                                        ) : null}
                                      </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent className="bg-white border-slate-200 shadow-lg">
                                      <ContextMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewEvent(event);
                                      }}>
                                        <CalendarIcon className="w-4 h-4 mr-2" />
                                        View Event
                                      </ContextMenuItem>
                                      <ContextMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyEvent(event);
                                      }}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy
                                      </ContextMenuItem>
                                      <ContextMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleCutEvent(event);
                                      }}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Cut
                                      </ContextMenuItem>
                                      {copiedEvent && (
                                        <ContextMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          handlePasteEvent(currentDay);
                                        }}>
                                          <Copy className="w-4 h-4 mr-2" />
                                          Paste
                                        </ContextMenuItem>
                                      )}
                                      <ContextMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleDuplicateEvent(event);
                                      }}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Duplicate
                                      </ContextMenuItem>
                                      <ContextMenuItem 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteEvent(event.id);
                                        }}
                                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                );
                              })}
                              {dayEvents.length > 2 && (
                                <div className="text-[9px] text-slate-500">
                                  +{dayEvents.length - 6} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </React.Fragment>
                  );
                }
                
                // Regular day rendering for non-week-start days
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDragOver = dragOverDate && isSameDay(dragOverDate, day);

                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day)}
                    onDoubleClick={() => handleDateDoubleClick(day)}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDrop={(e) => handleDrop(e, day)}
                    onContextMenu={(e) => {
                      if (copiedEvent) {
                        e.preventDefault();
                      }
                    }}
                    className={cn(
                      "min-h-[150px] p-1.5 border-b border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden",
                      !isCurrentMonth && "bg-slate-50/50 text-slate-400",
                      isToday && "bg-indigo-50",
                      isDragOver && "bg-indigo-100 ring-2 ring-indigo-400"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium mb-1",
                      isToday && "text-indigo-600",
                      !isCurrentMonth && "text-slate-400"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5 w-full overflow-hidden">
                      {dayEvents.slice(0, 6).map(event => {
                        const category = eventCategories.find(c => c.name === event.event_type);
                        const colorClass = event.isPublicHoliday ? 'red' : (category?.color || 'gray');
                        const isDragging = draggedEvent?.id === event.id;
                        
                        const eventStart = startOfDay(parseISO(event.start_time));
                        const eventEnd = startOfDay(parseISO(event.end_time));
                        const isMultiDay = eventEnd > eventStart;
                        const isFirstDay = isSameDay(eventStart, day);
                        
                        // Find associated user for leave/holiday events (check participant_user_ids first)
                        const eventUser = event.participant_user_ids?.length === 1 
                          ? users.find(u => u.id === event.participant_user_ids[0]) 
                          : null;
                        
                        const isSelected = selectedEventId === event.id;
                        return (
                          <ContextMenu key={event.id}>
                            <ContextMenuTrigger>
                              <div
                                draggable={!event.isPublicHoliday}
                                onDragStart={(e) => !event.isPublicHoliday && handleDragStart(event, e)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => {
                                  if (!event.isPublicHoliday) {
                                    setSelectedEventId(event.id);
                                    handleEventClick(event, e);
                                  }
                                }}
                                onDoubleClick={(e) => !event.isPublicHoliday && handleEventDoubleClick(event, e)}
                                className={cn(
                                  "text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-all flex items-center gap-1 overflow-hidden",
                                  `bg-${colorClass}-100 text-${colorClass}-700`,
                                  isDragging && "opacity-50",
                                  isMultiDay && !isFirstDay && "border-l-2 border-l-slate-400",
                                  isSelected && "ring-2 ring-indigo-500 ring-offset-1"
                                )}
                                title={event.title}
                              >
                                <span className="truncate min-w-0">
                                  {isFirstDay || !isMultiDay ? event.title : '⋯ ' + event.title}
                                </span>
                                {eventUser && (
                                  <Avatar user={eventUser} size="xs" className="w-4 h-4 shrink-0" />
                                )}
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="bg-white border-slate-200 shadow-lg">
                              <ContextMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleViewEvent(event);
                              }}>
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                View Event
                              </ContextMenuItem>
                              <ContextMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleCopyEvent(event);
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                              </ContextMenuItem>
                              <ContextMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleCutEvent(event);
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Cut
                              </ContextMenuItem>
                              {copiedEvent && (
                                <ContextMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handlePasteEvent(day);
                                }}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Paste
                                </ContextMenuItem>
                              )}
                              <ContextMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateEvent(event);
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </ContextMenuItem>
                              <ContextMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event.id);
                                }}
                                className="text-red-600 focus:text-red-700 focus:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-slate-500">
                          +{dayEvents.length - 6} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {viewMode === 'year' && (
          <YearCalendarView
            currentDate={currentDate}
            events={filteredEvents}
            eventCategories={eventCategories}
            users={users}
            showWeekNumbers={true}
            onDateClick={(date) => {
              setCurrentDate(date);
              setViewMode('day');
            }}
            onMonthClick={(date) => {
              setCurrentDate(date);
              setViewMode('month');
            }}
          />
        )}

        {viewMode === 'week' && (
          <WeekCalendarView
            currentDate={currentDate}
            events={filteredEvents}
            eventCategories={eventCategories}
            onEventClick={handleEventClick}
            onEventDoubleClick={handleEventDoubleClick}
            onDateClick={handleDateClick}
            onDuplicateEvent={handleDuplicateEvent}
            onDeleteEvent={handleDeleteEvent}
            draggedEvent={draggedEvent}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            selectedEventId={selectedEventId}
            onEventSelect={setSelectedEventId}
            users={users}
          />
        )}

        {viewMode === 'day' && (
          <DayCalendarView
            currentDate={currentDate}
            events={filteredEvents}
            eventCategories={eventCategories}
            onEventClick={handleEventClick}
            onDuplicateEvent={handleDuplicateEvent}
            onDeleteEvent={handleDeleteEvent}
            onDateClick={(date) => setCurrentDate(date)}
            draggedEvent={draggedEvent}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onCreateEvent={(dateTime) => {
              setSelectedDate(dateTime);
              setSelectedEvent(null);
              setShowEventDialog(true);
            }}
            selectedEventId={selectedEventId}
            onEventSelect={setSelectedEventId}
            users={users}
          />
        )}
        </div>

        {/* Quick Tasks Section - Collapsible */}
        <div className={cn(
          "bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col transition-all",
          quickTasksCollapsed ? "w-[80px]" : "w-[420px]"
        )}>
          <div className="px-3 h-[60px] border-b flex items-center justify-between gap-4 flex-shrink-0">
            {!quickTasksCollapsed ? (
              <>
                <div className="flex items-center gap-3 flex-1">
                  <h3 className="font-semibold text-sm">Quick Tasks</h3>
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input
                      placeholder="Search tasks..."
                      className="pl-7 h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddTask} 
                    className="h-7 w-7 p-0 rounded-full bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setQuickTasksCollapsed(true)} 
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setQuickTasksCollapsed(false)} 
                className="h-8 w-8 p-0 mx-auto"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <QuickTasksList
              onEditTask={handleEditTask}
              settings={quickTaskSettings}
              visibleColumns={quickTaskVisibleColumns}
              currentUser={currentUser}
              allUsers={users}
              allCustomers={customers}
              allDepartments={departments}
              refreshKey={quickTasksRefreshKey}
              collapsed={quickTasksCollapsed}
              onToggleTask={async (taskId, currentStatus) => {
                const newStatus = currentStatus === 'completed' ? 'open' : 'completed';
                try {
                  await QuickTask.update(taskId, { status: newStatus });
                } catch (error) {
                  if (error?.response?.status === 503 || String(error?.message || '').includes('temporarily unavailable')) {
                    toast.warning('Writes are temporarily unavailable due to maintenance. Please try again later.');
                  } else {
                    toast.error('Failed to update task');
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {showEventDialog && (
        <Sheet open={showEventDialog} onOpenChange={(open) => {
          if (!open && !isSavingEvent) {
            setShowEventDialog(false);
            setSelectedEvent(null);
            setSelectedDate(null);
          }
        }}>
          <SheetContent side="right" className="w-full sm:w-[420px] sm:max-w-[420px] overflow-y-auto bg-white p-6" hideCloseButton={true}>
            <EventDialog
              isOpen={true}
              onClose={() => {
                setShowEventDialog(false);
                setSelectedEvent(null);
                setSelectedDate(null);
              }}
              onSuccess={handleEventSuccess}
              onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent.id) : null}
              event={selectedEvent}
              initialDate={selectedDate}
              eventType={eventType}
              users={users}
              teams={teams}
              customers={customers}
              eventCategories={eventCategories}
              isSheet={true}
              onLoadingChange={setIsSavingEvent}
            />
          </SheetContent>
        </Sheet>
      )}

      {showSettingsDialog && (
        <CalendarAndTasksSettingsDialog
          isOpen={showSettingsDialog}
          onClose={() => {
            setShowSettingsDialog(false);
            loadData();
          }}
          currentCompany={currentCompany}
          isGoogleConnected={isGoogleConnected}
          quickTaskSettings={quickTaskSettings}
          onUpdateQuickTaskPermissions={handleUpdateQuickTaskPermissions}
          quickTaskVisibleColumns={quickTaskVisibleColumns}
          onUpdateQuickTaskColumns={handleUpdateQuickTaskColumns}
        />
      )}

      {showTaskDetailsPanel && (
        <TaskDetailsSidePanel
          isOpen={showTaskDetailsPanel}
          onClose={() => {
            setShowTaskDetailsPanel(false);
            setSelectedTaskForDetails(null);
            setQuickTasksRefreshKey(prev => prev + 1);
          }}
          task={selectedTaskForDetails}
          departments={departments}
          users={users}
          teams={teams}
          customers={customers}
          currentUser={currentUser}
          onUpdate={handleTaskUpdate}
          initialTab="details"
        />
      )}

      {showEventDetailsDialog && (
        <EventDetailsDialog
          isOpen={showEventDetailsDialog}
          onClose={() => {
            setShowEventDetailsDialog(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEventFromDetails}
          users={users}
          teams={teams}
          customers={customers}
          eventCategories={eventCategories}
        />
      )}
    </div>
  );
}