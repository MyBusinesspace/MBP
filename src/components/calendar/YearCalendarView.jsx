import React, { useState } from 'react';
import { format, startOfYear, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO, startOfDay, getWeek } from 'date-fns';
import { cn } from '@/lib/utils';

export default function YearCalendarView({
  currentDate,
  events,
  eventCategories,
  onDateClick,
  onMonthClick,
  users = [],
  showWeekNumbers = false
}) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const yearStart = startOfYear(currentDate);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

  // Helper to get events for a specific day
  const getEventsForDay = (day) => {
    const dayStart = startOfDay(day);
    return events.filter(event => {
      if (!event.start_time || !event.end_time) return false;
      const eventStart = startOfDay(parseISO(event.start_time));
      const eventEnd = startOfDay(parseISO(event.end_time));
      return dayStart >= eventStart && dayStart <= eventEnd;
    }).slice(0, 3); // Max 3 events to show
  };

  const formatEventTime = (event) => {
    try {
      if (event.all_day) return '';
      const startTime = parseISO(event.start_time);
      return format(startTime, 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="grid grid-cols-4 gap-8">
        {months.map((month, monthIndex) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
          const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
          const days = eachDayOfInterval({ start: startDate, end: endDate });

          return (
            <div key={monthIndex} className="flex flex-col">
              <div 
                className="text-base font-semibold text-red-500 mb-3 hover:text-red-600 cursor-pointer transition-colors"
                onClick={() => onMonthClick && onMonthClick(month)}
              >
                {format(month, 'MMMM')}
              </div>
              <div className={cn("grid gap-1 text-center text-[10px] mb-2", showWeekNumbers ? "grid-cols-8" : "grid-cols-7")}>
                {showWeekNumbers && <div className="text-slate-400 font-medium"></div>}
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-slate-400 font-medium">{d}</div>
                ))}
              </div>
              <div className={cn("grid gap-1", showWeekNumbers ? "grid-cols-8" : "grid-cols-7")}>
                {days.map((day, dayIndex) => {
                  // Add week number at the start of each week
                  if (showWeekNumbers && dayIndex % 7 === 0) {
                    const weekNum = getWeek(day, { weekStartsOn: 1 });
                    return (
                      <React.Fragment key={`week-${dayIndex}`}>
                        <div className="w-7 h-7 flex items-center justify-center text-[9px] text-slate-400 font-medium">
                          {weekNum}
                        </div>
                        {(() => {
                          const currentDay = day;
                          const isCurrentMonth = isSameMonth(currentDay, month);
                          const isCurrentDay = isToday(currentDay);
                          const dayEvents = isCurrentMonth ? getEventsForDay(currentDay) : [];
                          const hasEvents = dayEvents.length > 0;
                          const dayKey = format(currentDay, 'yyyy-MM-dd');
                          const isHovered = hoveredDay === dayKey;

                          return (
                            <div key={dayIndex} className="relative">
                              <div
                                onClick={() => isCurrentMonth && onDateClick && onDateClick(currentDay)}
                                onMouseEnter={() => hasEvents && setHoveredDay(dayKey)}
                                onMouseLeave={() => setHoveredDay(null)}
                                className={cn(
                                  "relative w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-all text-xs",
                                  !isCurrentMonth && "invisible",
                                  isCurrentMonth && "hover:bg-slate-100",
                                  isCurrentDay && "bg-red-500 text-white font-semibold",
                                  !isCurrentDay && hasEvents && "font-medium"
                                )}
                              >
                                {format(currentDay, 'd')}
                                {hasEvents && !isCurrentDay && (
                                  <div className="absolute bottom-0.5 w-1 h-1 bg-slate-400 rounded-full"></div>
                                )}
                              </div>

                              {/* Event Bubble - Apple Calendar Style */}
                              {isHovered && hasEvents && (
                                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in duration-200">
                                  <div className="bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 px-2 min-w-[160px] max-w-[200px]">
                                    {dayEvents.length === 0 ? (
                                      <div className="text-xs text-slate-500 text-center py-1">No Events</div>
                                    ) : (
                                      <div className="space-y-1">
                                        {dayEvents.map((event, idx) => (
                                          <div key={idx} className="text-xs">
                                            <div className="flex items-center gap-2">
                                              <div className={cn(
                                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                event.isPublicHoliday ? "bg-red-500" : "bg-blue-500"
                                              )}></div>
                                              <div className="flex-1 truncate font-medium text-slate-700">
                                                {event.title}
                                              </div>
                                            </div>
                                            {formatEventTime(event) && (
                                              <div className="text-[10px] text-slate-500 ml-3.5">
                                                {formatEventTime(event)}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {/* Arrow pointer */}
                                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45"></div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </React.Fragment>
                    );
                  }
                  
                  // Regular day rendering for non-week-start days
                  const isCurrentMonth = isSameMonth(day, month);
                  const isCurrentDay = isToday(day);
                  const dayEvents = isCurrentMonth ? getEventsForDay(day) : [];
                  const hasEvents = dayEvents.length > 0;
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const isHovered = hoveredDay === dayKey;
                  
                  return (
                    <div key={dayIndex} className="relative">
                      <div
                        onClick={() => isCurrentMonth && onDateClick && onDateClick(day)}
                        onMouseEnter={() => hasEvents && setHoveredDay(dayKey)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={cn(
                          "relative w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-all text-xs",
                          !isCurrentMonth && "invisible",
                          isCurrentMonth && "hover:bg-slate-100",
                          isCurrentDay && "bg-red-500 text-white font-semibold",
                          !isCurrentDay && hasEvents && "font-medium"
                        )}
                      >
                        {format(day, 'd')}
                        {hasEvents && !isCurrentDay && (
                          <div className="absolute bottom-0.5 w-1 h-1 bg-slate-400 rounded-full"></div>
                        )}
                      </div>
                      
                      {/* Event Bubble - Apple Calendar Style */}
                      {isHovered && hasEvents && (
                        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in duration-200">
                          <div className="bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 px-2 min-w-[160px] max-w-[200px]">
                            {dayEvents.length === 0 ? (
                              <div className="text-xs text-slate-500 text-center py-1">No Events</div>
                            ) : (
                              <div className="space-y-1">
                                {dayEvents.map((event, idx) => (
                                  <div key={idx} className="text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                        event.isPublicHoliday ? "bg-red-500" : "bg-blue-500"
                                      )}></div>
                                      <div className="flex-1 truncate font-medium text-slate-700">
                                        {event.title}
                                      </div>
                                    </div>
                                    {formatEventTime(event) && (
                                      <div className="text-[10px] text-slate-500 ml-3.5">
                                        {formatEventTime(event)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Arrow pointer */}
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-slate-200 rotate-45"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}