import { useState, useRef, useMemo } from 'react';

export function useVirtualList({
  itemCount,
  itemHeight = 40,
  overscan = 5,
  containerHeight = 600
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = itemCount * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight);
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(itemCount, end + overscan)
    };
  }, [scrollTop, itemCount, itemHeight, containerHeight, overscan]);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return {
    containerRef,
    visibleRange,
    totalHeight,
    handleScroll,
    offsetY: visibleRange.start * itemHeight
  };
}