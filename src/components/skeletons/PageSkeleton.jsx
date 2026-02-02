import React from 'react';

export function TableSkeleton({ rows = 8, columns = 6 }) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header Skeleton más realista */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-500 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-300 rounded animate-pulse"></div>
              <div className="h-3 w-48 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-9 w-32 bg-indigo-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Search and Filters más visibles */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex gap-3">
          <div className="h-9 w-24 bg-slate-300 rounded animate-pulse"></div>
          <div className="h-9 flex-1 max-w-md bg-slate-200 rounded animate-pulse"></div>
          <div className="h-9 w-28 bg-slate-300 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Table con contenido más visible */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <div className="h-3 w-20 bg-slate-400 rounded"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-4">
                    {colIndex === 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-300 to-blue-400 animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-36 bg-slate-300 rounded animate-pulse"></div>
                          <div className="h-3 w-28 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    ) : colIndex === 1 ? (
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-slate-300 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-slate-200 rounded animate-pulse"></div>
                      </div>
                    ) : colIndex === 2 ? (
                      <div className="flex gap-2">
                        <div className="h-6 w-20 bg-green-200 rounded-full animate-pulse"></div>
                      </div>
                    ) : colIndex === 3 ? (
                      <div className="flex gap-1">
                        <div className="h-6 w-16 bg-indigo-200 rounded-full animate-pulse"></div>
                        <div className="h-6 w-16 bg-purple-200 rounded-full animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="h-4 w-28 bg-slate-300 rounded animate-pulse"></div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer con contenido */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-center gap-2">
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <span className="text-sm text-slate-500 ml-2 font-medium">Loading data...</span>
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="h-6 w-32 bg-slate-300 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-indigo-200 rounded animate-pulse"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-300 rounded animate-pulse"></div>
            <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div>
            <div className="flex gap-2 mt-4">
              <div className="h-6 w-16 bg-indigo-200 rounded animate-pulse"></div>
              <div className="h-6 w-20 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 bg-slate-300 rounded animate-pulse"></div>
                <div className="h-8 w-16 bg-indigo-300 rounded animate-pulse"></div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-indigo-300 to-indigo-400 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="h-6 w-32 bg-slate-300 rounded mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-300 to-blue-400 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full bg-slate-300 rounded animate-pulse"></div>
                  <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="h-6 w-32 bg-slate-300 rounded mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-8 w-8 bg-green-300 rounded animate-pulse"></div>
                  <div className="h-4 w-full max-w-xs bg-slate-300 rounded animate-pulse"></div>
                </div>
                <div className="h-6 w-16 bg-indigo-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-500 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-300 rounded animate-pulse"></div>
              <div className="h-3 w-56 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-9 w-32 bg-indigo-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-8 w-20 bg-slate-300 rounded animate-pulse"></div>
          <div className="flex items-center gap-1">
            <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-8 w-28 bg-slate-300 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <div className="h-7 w-16 bg-slate-300 rounded animate-pulse"></div>
            <div className="h-7 w-16 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-7 w-16 bg-slate-200 rounded animate-pulse"></div>
          </div>
          <div className="h-8 flex-1 max-w-xs bg-slate-200 rounded animate-pulse"></div>
          <div className="h-8 w-8 bg-indigo-300 rounded animate-pulse"></div>
          <div className="h-8 w-24 bg-green-300 rounded animate-pulse"></div>
        </div>

        {/* Summary banner */}
        <div className="mt-3 py-2 px-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="h-4 w-64 bg-indigo-300 rounded animate-pulse"></div>
            <div className="h-3 w-32 bg-indigo-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-2">
              {Array.from({ length: 7 }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1 h-24 bg-slate-100 rounded-lg border border-slate-200">
                  <div className="p-2 space-y-2">
                    <div className="h-3 w-6 bg-slate-400 rounded animate-pulse"></div>
                    <div className="h-2 w-full bg-indigo-300 rounded animate-pulse"></div>
                    <div className="h-2 w-3/4 bg-green-300 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-center gap-2">
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <span className="text-sm text-slate-500 ml-2 font-medium">Loading calendar...</span>
        </div>
      </div>
    </div>
  );
}