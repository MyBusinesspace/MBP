import React from 'react';

export default function QuickReportA4Preview({ form }) {
  const w = 320; // preview width in px
  const h = Math.round(w * Math.SQRT2); // A4 aspect ratio (1:1.414)

  const metrics = Array.isArray(form?.metrics) ? form.metrics.slice(0, 4) : [];
  const details = Array.isArray(form?.details) ? form.details.slice(0, 3) : [];
  const columns = Array.isArray(form?.list_columns) ? form.list_columns.slice(0, 5) : [];

  return (
    <div className="inline-block rounded-lg border bg-white shadow-sm" style={{ width: w, height: h }}>
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate max-w-[220px]">
              {form?.header_title || 'Untitled report'}
            </div>
            {form?.header_subtitle && (
              <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{form.header_subtitle}</div>
            )}
          </div>
          {form?.header_logo_url && (
            <img src={form.header_logo_url} alt="logo" className="h-6 object-contain" />
          )}
        </div>

        {/* Datos (top) */}
        <div className="px-4">
          <div className="text-[11px] font-semibold text-slate-600">Data</div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {metrics.map((m, idx) => (
              <div key={idx} className="p-2 rounded border bg-slate-50">
                <div className="text-[10px] text-slate-500">{m.label}</div>
                <div className="text-sm font-semibold">123</div>
              </div>
            ))}
            {details.map((d, idx) => (
              <div key={'d'+idx} className="p-2 rounded border bg-slate-50 col-span-1">
                <div className="text-[10px] text-slate-500">{d.label}</div>
                <div className="text-sm text-slate-600">—</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla (bottom) */}
        <div className="px-4 mt-3">
          <div className="text-[11px] font-semibold text-slate-600">Table</div>
          <div className="mt-2 overflow-hidden rounded border">
            <div className="flex gap-2 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-700">
              {columns.map((c, i) => (
                <div key={i} style={{ width: Math.min(c.width || 120, 140) }} className="truncate">
                  {c.label}
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-2 py-1.5 text-[11px] text-slate-600">
              {columns.map((c, i) => (
                <div key={i} style={{ width: Math.min(c.width || 120, 140) }} className="truncate">
                  —
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto" />
      </div>
    </div>
  );
}