import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export const Slider = React.forwardRef(({ 
  className, 
  value = [1], 
  onValueChange, 
  min = 0, 
  max = 100, 
  step = 1,
  disabled = false,
  ...props 
}, ref) => {
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const currentValue = value[0];

  const updateValue = (clientX) => {
    if (!sliderRef.current || disabled) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    if (onValueChange && clampedValue !== currentValue) {
      onValueChange([clampedValue]);
    }
  };

  const handleMouseDown = (e) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || disabled) return;
    updateValue(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || disabled) return;
    updateValue(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, currentValue]);

  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div
      ref={(node) => {
        sliderRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {/* Track */}
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-100">
        {/* Range */}
        <div 
          className="absolute h-full bg-blue-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Thumb */}
      <div 
        className={cn(
          "absolute block h-5 w-5 rounded-full border-2 border-blue-600 bg-white transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
          disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
        )}
        style={{ 
          left: `calc(${percentage}% - 10px)`,
          transform: isDragging ? 'scale(1.1)' : 'scale(1)'
        }}
      />
    </div>
  );
});

Slider.displayName = 'Slider';

export default Slider;