import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function QuickReportPreview() {
  const [tpl, setTpl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await base44.entities.QuickReportSettings.list('-updated_date', 50);
        const arr = Array.isArray(data) ? data : [];
        const def = arr.find(t => t.is_default) || arr[0] || null;
        if (mounted) setTpl(def);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const unsubscribe = base44.entities.QuickReportSettings.subscribe(() => {
      setLoading(true);
      load();
    });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="w-[320px] rounded-md border bg-white p-3 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
        </div>
        <div className="h-4 bg-slate-100 rounded mt-3" />
      </div>
    );
  }

  if (!tpl) return null;

  const metrics = Array.isArray(tpl.metrics) ? tpl.metrics.slice(0, 4) : [];
  const details = Array.isArray(tpl.details) ? tpl.details.slice(0, 2) : [];
  const columns = Array.isArray(tpl.list_columns) ? tpl.list_columns.slice(0, 4) : [];

  return (
    <div className="w-[360px] rounded-md border bg-white p-3 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">Data</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {metrics.slice(0, 2).map((m, idx) => (
          <div key={idx} className="p-2 rounded border bg-slate-50">
            <div className="text-[10px] text-slate-500">{m.label}</div>
            <div className="text-sm font-semibold">123</div>
          </div>
        ))}
        {details.slice(0, 2).map((d, idx) => (
          <div key={'d'+idx} className="p-2 rounded border bg-slate-50 col-span-1">
            <div className="text-[10px] text-slate-500">{d.label}</div>
            <div className="text-sm text-slate-600">—</div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t text-xs font-semibold text-slate-600">Table</div>
      <div className="mt-2 overflow-hidden rounded border">
        <div className="flex gap-2 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-700">
          {columns.map((c, i) => (
            <div key={i} style={{width: Math.min(c.width || 120, 140) + 'px'}} className="truncate">
              {c.label}
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-2 py-1.5 text-[11px] text-slate-600">
          {columns.map((c, i) => (
            <div key={i} style={{width: Math.min(c.width || 120, 140) + 'px'}} className="truncate">
              —
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}