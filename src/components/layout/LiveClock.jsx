import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function LiveClock({ className = "" }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`flex flex-col items-end ${className}`}>
      <div className="text-sm font-semibold text-slate-800">
        {format(time, 'HH:mm:ss')}
      </div>
      <div className="text-[10px] text-slate-500">
        {format(time, 'EEE, MMM d, yyyy')}
      </div>
    </div>
  );
}