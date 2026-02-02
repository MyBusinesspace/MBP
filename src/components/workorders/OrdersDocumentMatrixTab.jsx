import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fileNameFromUrl(url) {
  try {
    const clean = (url || '').split('?')[0];
    const last = clean.split('/').pop();
    return decodeURIComponent(last || 'Document');
  } catch {
    return 'Document';
  }
}

export default function OrdersDocumentMatrixTab({ entries = [], categories = [] }) {
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await base44.entities.DocumentType.list('sort_order', 1000);
        if (mounted) setDocTypes(Array.isArray(list) ? list : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const catById = useMemo(() => {
    const map = {};
    (categories || []).forEach(c => { if (c?.id) map[c.id] = c; });
    return map;
  }, [categories]);

  const filteredEntries = useMemo(() => {
    const q = normalize(search);
    return (entries || []).filter(e => {
      if (selectedCategory !== 'all' && e.work_order_category_id !== selectedCategory) return false;
      if (!q) return true;
      const text = normalize([e.title, e.work_order_number].filter(Boolean).join(' '));
      return text.includes(q);
    });
  }, [entries, search, selectedCategory]);

  // Columns = unique doc types used by visible categories
  const visibleTypeIds = useMemo(() => {
    const catIds = new Set(filteredEntries.map(e => e.work_order_category_id).filter(Boolean));
    const ids = new Set();
    (docTypes || []).forEach(t => { if (t.work_order_category_id && catIds.has(t.work_order_category_id)) ids.add(t.id); });
    return Array.from(ids);
  }, [filteredEntries, docTypes]);

  const columns = useMemo(() => {
    const idToType = {};
    (docTypes || []).forEach(t => { idToType[t.id] = t; });
    return visibleTypeIds.map(id => idToType[id]).filter(Boolean);
  }, [visibleTypeIds, docTypes]);

  const rows = useMemo(() => {
    return filteredEntries.map(e => {
      const files = Array.isArray(e.file_urls) ? e.file_urls : [];
      const fileObjs = files.map(u => ({ url: u, name: fileNameFromUrl(u), norm: normalize(fileNameFromUrl(u)) }));
      const cells = columns.map(t => {
        const n = normalize(t.name);
        const matched = fileObjs.filter(f => f.norm.includes(n) || (n.includes('working report') && f.norm.includes('report')));
        return { typeId: t.id, files: matched };
      });
      return { entry: e, cells };
    });
  }, [filteredEntries, columns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Category</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white text-sm px-2"
          >
            <option value="all">All</option>
            {(categories || []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Input placeholder="Search orders..." value={search} onChange={(e)=>setSearch(e.target.value)} className="h-9 w-72" />
        </div>
        <Badge variant="outline" className="ml-auto">{rows.length} orders</Badge>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="min-w-[220px]">Order</TableHead>
              <TableHead className="min-w-[140px]">Category</TableHead>
              {columns.map(col => (
                <TableHead key={col.id} className="text-center min-w-[160px]">{col.name}</TableHead>
              ))}
              <TableHead className="text-center min-w-[100px]">Files</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => {
              const e = row.entry;
              const cat = catById[e.work_order_category_id];
              const filesCount = (e.file_urls || []).length;
              return (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{e.title || 'Untitled'}</div>
                    <div className="text-xs text-slate-500">{e.work_order_number || e.id}</div>
                  </TableCell>
                  <TableCell>
                    {cat ? (
                      <Badge variant="outline" className="text-xs">{cat.name}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  {row.cells.map((cell, idx) => (
                    <TableCell key={idx} className="text-center">
                      {cell.files.length > 0 ? (
                        <div className="flex items-center justify-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-700">{cell.files.length}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => window.open(cell.files[0].url, '_blank')}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Missing</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs bg-white">{filesCount}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}