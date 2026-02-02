import { useEffect } from 'react';

export default function PerformanceMonitor({ pageName }) {
  useEffect(() => {
    const startTime = performance.now();
    console.log(`🚀 [${pageName}] Page started loading at:`, startTime);

    const measureNetworkRequests = () => {
      const entries = performance.getEntriesByType('resource');
      const recentEntries = entries.filter(entry => 
        entry.startTime > startTime && 
        entry.name.includes('api') || entry.name.includes('base44')
      );
      
      if (recentEntries.length > 0) {
        console.log(`📊 [${pageName}] API Requests:`, recentEntries.map(entry => ({
          url: entry.name,
          duration: `${Math.round(entry.duration)}ms`,
          size: entry.transferSize ? `${Math.round(entry.transferSize/1024)}KB` : 'unknown'
        })));
      }
    };

    const measureRenderTime = () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      console.log(`✅ [${pageName}] Page fully rendered in: ${Math.round(renderTime)}ms`);
      
      if (renderTime > 2000) {
        console.warn(`⚠️ [${pageName}] SLOW LOADING DETECTED: ${Math.round(renderTime)}ms`);
      } else if (renderTime > 1000) {
        console.log(`⏳ [${pageName}] Moderate loading time: ${Math.round(renderTime)}ms`);
      } else {
        console.log(`⚡ [${pageName}] Fast loading: ${Math.round(renderTime)}ms`);
      }
    };

    // Measure after component mounts
    setTimeout(measureNetworkRequests, 100);
    setTimeout(measureRenderTime, 100);

    return () => {
      const cleanupTime = performance.now();
      console.log(`🧹 [${pageName}] Page cleanup at: ${Math.round(cleanupTime - startTime)}ms after load`);
    };
  }, [pageName]);

  return null; // This component doesn't render anything
}