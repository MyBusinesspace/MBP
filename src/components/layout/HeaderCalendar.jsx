import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function HeaderCalendar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const gmtOffset = -currentTime.getTimezoneOffset() / 60;
  const gmtString = `GMT${gmtOffset >= 0 ? '+' : ''}${gmtOffset}`;
  
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
      <CalendarIcon className="w-4 h-4 text-slate-500" />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-700">
          {format(currentTime, 'EEEE, MMMM d, yyyy')}
        </span>
      </div>
      <div className="h-4 w-px bg-slate-300" />
      <Clock className="w-4 h-4 text-slate-500" />
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-900">
          {format(currentTime, 'HH:mm:ss')}
        </span>
        <span className="text-[10px] text-slate-500">
          {gmtString}
        </span>
      </div>
    </div>
  );
}