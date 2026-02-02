import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function OptimizedTableSkeleton({ rows = 10, columns = 6, showData = null }) {
  // Si tenemos data previa, mostrarla con overlay de loading
  if (showData && Array.isArray(showData) && showData.length > 0) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {/* Mostrar data anterior mientras carga */}
          {showData.map((item, idx) => (
            <div key={idx} className="border-b p-2">
              {JSON.stringify(item).substring(0, 100)}...
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Skeleton tradicional si no hay data previa
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}