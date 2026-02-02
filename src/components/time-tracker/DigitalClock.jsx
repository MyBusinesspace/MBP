import React, { useState, useEffect } from 'react';

export default function DigitalClock({ 
  isActive, 
  startTime, 
  currentSegmentStartTime,
  onClockIn, 
  onClockOut, 
  onSwitch,
  onSelectWO,
  onClearWO,
  actionLoading, 
  activeWorkOrderInfo,
  selectedWorkOrderInfo,
  plannedStartTime,
  plannedEndTime,
  compact = false
}) {
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [segmentElapsed, setSegmentElapsed] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const dateTimer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(dateTimer);
  }, []);

  // Total time since clock in - synced to exact second
  useEffect(() => {
    if (!isActive || !startTime) {
      setTotalElapsed(0);
      return;
    }

    const updateTotalTime = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const diff = now - start;
      setTotalElapsed(diff);
    };

    updateTotalTime();

    const now = new Date();
    const msUntilNextSecond = 1000 - now.getMilliseconds();
    
    let intervalId;
    const timeoutId = setTimeout(() => {
      updateTotalTime();
      intervalId = setInterval(updateTotalTime, 1000);
    }, msUntilNextSecond);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, startTime]);

  // Current WO segment time - synced to exact second
  useEffect(() => {
    if (!isActive || !currentSegmentStartTime) {
      setSegmentElapsed(0);
      return;
    }

    const updateSegmentTime = () => {
      const now = new Date().getTime();
      const start = new Date(currentSegmentStartTime).getTime();
      const diff = now - start;
      setSegmentElapsed(diff);
    };

    updateSegmentTime();

    const now = new Date();
    const msUntilNextSecond = 1000 - now.getMilliseconds();
    
    let intervalId;
    const timeoutId = setTimeout(() => {
      updateSegmentTime();
      intervalId = setInterval(updateSegmentTime, 1000);
    }, msUntilNextSecond);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, currentSegmentStartTime]);

  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return { hours, minutes, seconds };
  };

  const pad = (num) => String(num).padStart(2, '0');

  const totalTime = formatTime(totalElapsed);
  const segmentTime = formatTime(segmentElapsed);

  const bgColor = isActive 
    ? 'bg-green-100' 
    : selectedWorkOrderInfo 
      ? 'bg-blue-100' 
      : 'bg-gradient-to-br from-purple-100 to-pink-100';
  
  const textColor = isActive 
    ? 'text-green-900' 
    : selectedWorkOrderInfo 
      ? 'text-blue-900' 
      : 'text-purple-900';
  
  const dotColor = isActive 
    ? 'bg-green-900' 
    : selectedWorkOrderInfo 
      ? 'bg-blue-900' 
      : 'bg-purple-900';

  // Compact mode renders smaller horizontal clock, 30% less high
  if (compact) {
    return (
      <div className={`${bgColor} rounded-lg px-3 py-1.5 transition-colors duration-300 h-full flex flex-col justify-center`} style={{ minHeight: '80px' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@300;400;500;600;700&display=swap');`}</style>
        
        <div className="text-center">
          <div className={`${textColor} mb-0.5`} style={{ fontFamily: 'Orbitron, monospace', fontSize: '32px', fontWeight: '300', letterSpacing: '-1px', lineHeight: '1' }}>
            {pad(totalTime.hours)}:{pad(totalTime.minutes)}:{pad(totalTime.seconds)}
          </div>
          <div className={`text-[8px] tracking-widest opacity-50 ${textColor}`}>
            {isActive ? 'TOTAL TIME' : 'READY'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${bgColor} rounded-2xl p-6 shadow-2xl transition-colors duration-300 flex flex-col justify-center`} style={{ width: '380px', height: '140px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@300;400;500;600;700;800;900&display=swap');
      `}</style>

      {/* Main Timer Display - Total Time */}
      <div className="flex items-center justify-center">
        <div className="flex items-center" style={{ gap: '12px' }}>
          <span 
            className={`font-light ${textColor}`}
            style={{ 
              fontFamily: 'Orbitron, monospace',
              fontSize: '48px',
              fontWeight: '400',
              lineHeight: '48px',
              letterSpacing: '2px',
              textAlign: 'center',
              display: 'inline-block',
              textShadow: isActive 
                ? '0 0 20px rgba(21, 128, 61, 0.3)' 
                : selectedWorkOrderInfo 
                  ? '0 0 20px rgba(59, 130, 246, 0.3)'
                  : '0 0 20px rgba(147, 51, 234, 0.3)'
            }}
          >
            {pad(totalTime.hours)}
          </span>

          <div className="flex flex-col" style={{ gap: '10px', height: '48px', justifyContent: 'center', alignItems: 'center', width: '12px' }}>
            <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${dotColor}`} style={{ opacity: 0.9 }}></div>
            <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${dotColor}`} style={{ opacity: 0.9 }}></div>
          </div>

          <span 
            className={`font-light ${textColor}`}
            style={{ 
              fontFamily: 'Orbitron, monospace',
              fontSize: '48px',
              fontWeight: '400',
              lineHeight: '48px',
              letterSpacing: '2px',
              textAlign: 'center',
              display: 'inline-block',
              textShadow: isActive 
                ? '0 0 20px rgba(21, 128, 61, 0.3)' 
                : selectedWorkOrderInfo 
                  ? '0 0 20px rgba(59, 130, 246, 0.3)'
                  : '0 0 20px rgba(147, 51, 234, 0.3)'
            }}
          >
            {pad(totalTime.minutes)}
          </span>

          <div className="flex flex-col" style={{ gap: '10px', height: '48px', justifyContent: 'center', alignItems: 'center', width: '12px' }}>
            <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${dotColor}`} style={{ opacity: 0.9 }}></div>
            <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${dotColor}`} style={{ opacity: 0.9 }}></div>
          </div>

          <span 
            className={`font-light ${textColor}`}
            style={{ 
              fontFamily: 'Orbitron, monospace',
              fontSize: '34px',
              fontWeight: '400',
              lineHeight: '48px',
              letterSpacing: '1px',
              textAlign: 'center',
              display: 'inline-block',
              textShadow: isActive 
                ? '0 0 20px rgba(21, 128, 61, 0.3)' 
                : selectedWorkOrderInfo 
                  ? '0 0 20px rgba(59, 130, 246, 0.3)'
                  : '0 0 20px rgba(147, 51, 234, 0.3)'
            }}
          >
            {pad(totalTime.seconds)}
          </span>
        </div>
      </div>

      {/* Label for Main Timer */}
      <div className="text-center mt-1">
        <div className={`text-[9px] tracking-widest opacity-60 ${textColor}`}>
          TOTAL TIME
        </div>
      </div>
    </div>
  );
}