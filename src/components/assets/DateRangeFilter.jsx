import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DateRangeFilter({
  dateRange = null,
  onDateRangeChange
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStartDate, setTempStartDate] = useState(dateRange?.start || null);
  const [tempEndDate, setTempEndDate] = useState(dateRange?.end || null);
  const [isOpen, setIsOpen] = useState(false);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const startDayOffset = startOfMonth(currentMonth).getDay();

  const handleDayClick = (day) => {
    if (!onDateRangeChange) return;
    
    if (selectingStart || (tempStartDate && day < tempStartDate)) {
      setTempStartDate(day);
      setTempEndDate(null);
      setSelectingStart(false);
    } else {
      setTempEndDate(day);
      onDateRangeChange({ start: tempStartDate, end: day });
      setSelectingStart(true);
    }
  };

  const isInRange = (day) => {
    if (!tempStartDate) return false;
    if (!tempEndDate) return isSameDay(day, tempStartDate);
    return day >= tempStartDate && day <= tempEndDate;
  };

  const clearDateFilter = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    if (onDateRangeChange) onDateRangeChange(null);
  };

  const selectThisMonth = () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    setTempStartDate(start);
    setTempEndDate(end);
    setCurrentMonth(new Date());
    if (onDateRangeChange) onDateRangeChange({ start, end });
  };

  const hasDateFilter = dateRange?.start && dateRange?.end;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "gap-2 border-slate-300 hover:bg-slate-50",
            hasDateFilter && "border-indigo-300 bg-indigo-50"
          )}
        >
          <CalendarIcon className="w-4 h-4 text-slate-600" />
          {hasDateFilter ? (
            <span className="text-xs">
              {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}
            </span>
          ) : (
            'Date'
          )}
          {hasDateFilter && (
            <X 
              className="w-3 h-3 text-slate-400 hover:text-slate-600" 
              onClick={(e) => {
                e.stopPropagation();
                clearDateFilter();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-slate-900">Date Range</h4>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectThisMonth}
                className="h-6 text-[10px] px-2 text-indigo-600 hover:bg-indigo-50"
              >
                This Month
              </Button>
              {(tempStartDate || tempEndDate) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearDateFilter}
                  className="h-6 text-[10px] px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-3">
          {/* Selected Range Display */}
          {tempStartDate && (
            <div className="text-xs text-slate-600 bg-indigo-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-medium text-indigo-700">
                {format(tempStartDate, 'MMM d, yyyy')}
                {tempEndDate && ` → ${format(tempEndDate, 'MMM d, yyyy')}`}
              </span>
            </div>
          )}
          
          {/* Mini Calendar */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-2">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-[10px] font-medium text-slate-400 py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-7" />
                ))}
                {daysInMonth.map(day => {
                  const isSelected = isInRange(day);
                  const isStart = tempStartDate && isSameDay(day, tempStartDate);
                  const isEnd = tempEndDate && isSameDay(day, tempEndDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "h-7 w-full text-xs rounded transition-all",
                        isSelected ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100",
                        (isStart || isEnd) && "bg-indigo-500 text-white hover:bg-indigo-600",
                        isToday && !isSelected && "ring-1 ring-indigo-400",
                        !isSameMonth(day, currentMonth) && "text-slate-300"
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 text-center mt-2">
            {selectingStart ? 'Click to select start date' : 'Click to select end date'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}