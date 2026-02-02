import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export const TooltipProvider = ({ children }) => {
  return <>{children}</>;
};

export const Tooltip = ({ children, delayDuration = 200 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block"
    >
      {React.Children.map(children, (child) => {
        if (child.type === TooltipTrigger) {
          return child;
        }
        if (child.type === TooltipContent) {
          return isOpen ? child : null;
        }
        return child;
      })}
    </div>
  );
};

export const TooltipTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  if (asChild) {
    return React.cloneElement(children, { ref, ...props });
  }
  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
});
TooltipTrigger.displayName = 'TooltipTrigger';

export const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, children, side = 'top', ...props }, ref) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const contentRef = useRef(null);

    useEffect(() => {
      if (contentRef.current) {
        const trigger = contentRef.current.parentElement;
        if (trigger) {
          const triggerRect = trigger.getBoundingClientRect();
          const contentRect = contentRef.current.getBoundingClientRect();

          let top = 0;
          let left = 0;

          switch (side) {
            case 'top':
              top = triggerRect.top - contentRect.height - sideOffset;
              left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
              break;
            case 'bottom':
              top = triggerRect.bottom + sideOffset;
              left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
              break;
            case 'left':
              top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
              left = triggerRect.left - contentRect.width - sideOffset;
              break;
            case 'right':
              top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
              left = triggerRect.right + sideOffset;
              break;
          }

          setPosition({ top, left });
        }
      }
    }, [side, sideOffset]);

    const tooltipContent = (
      <div
        ref={(el) => {
          contentRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        className={cn(
          'fixed z-50 overflow-hidden rounded-md border bg-white px-3 py-1.5 text-sm text-slate-950 shadow-md',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        {...props}
      >
        {children}
      </div>
    );

    return typeof document !== 'undefined'
      ? createPortal(tooltipContent, document.body)
      : null;
  }
);
TooltipContent.displayName = 'TooltipContent';