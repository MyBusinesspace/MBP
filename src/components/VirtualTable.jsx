import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function VirtualTable({
  items = [],
  rowHeight = 32,
  containerHeight = 600,
  overscan = 10,
  renderRow,
  renderHeader,
  className
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = items.length * rowHeight;

  const visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleEnd = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const offsetY = visibleStart * rowHeight;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {renderHeader && (
          <div className="sticky top-0 z-20 bg-white">
            {renderHeader()}
          </div>
        )}
        
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => renderRow(item, visibleStart + index))}
        </div>
      </div>
    </div>
  );
}