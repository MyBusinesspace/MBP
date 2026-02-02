import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, Loader2, Upload } from "lucide-react";
import DocumentViewer from "@/components/shared/DocumentViewer";

function fileNameFromUrl(url) {
  if (!url) return "Document";
  try {
    const clean = url.split("?")[0];
    const last = clean.split("/").pop();
    return decodeURIComponent(last || "Document");
  } catch { return "Document"; }
}

function normalize(str) { return (str || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

export default function OrderDocumentMatrixTab({ entry, formData, setFormData, onViewWorkingReport }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null); // {title, files}

  const categoryId = formData?.work_order_category_id || entry?.work_order_category_id || "";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await base44.entities.DocumentType.list("sort_order", 1000);
        const filtered = (list || []).filter(t => t.work_order_category_id === categoryId);
        setTypes(filtered);
      } finally { setLoading(false); }
    };
    if (categoryId) load(); else { setTypes([]); setLoading(false); }
  }, [categoryId]);

  const fileUrls = Array.isArray(formData?.file_urls) ? formData.file_urls : [];

  const mapped = useMemo(() => {
    const files = fileUrls.map(u => ({ url: u, name: fileNameFromUrl(u), norm: normalize(fileNameFromUrl(u)) }));
    return (types || []).map(t => {
      const n = normalize(t.name);
      const matches = files.filter(f => f.norm.includes(n) || (n.includes("working report") && f.norm.includes("report")));
      return { type: t, files: matches };
    });
  }, [types, fileUrls]);

  const handleUploadForType = async (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) {
        setFormData(prev => ({ ...prev, file_urls: [...(prev.file_urls || []), file_url] }));
      }
    };
    input.click();
  };

  const handleViewType = (row) => {
    if (row.files && row.files.length > 0) {
      const docs = row.files.map(f => ({ document_id: entry?.id, file_url: f.url, file_name: f.name }));
      setViewer({ title: row.type.name, files: docs });
      return;
    }
    // If no file and it is Working Report, try on-demand generation via parent dialog
    if (normalize(row.type.name).includes('working report') && onViewWorkingReport) {
      onViewWorkingReport();
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {types.length === 0 ? (
        <div className="text-sm text-slate-500 border rounded-lg p-4 bg-slate-50">No document types configured for this work order category.</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapped.map(row => (
                <TableRow key={row.type.id}>
                  <TableCell className="font-medium">{row.type.name}</TableCell>
                  <TableCell>
                    {row.files.length > 0 ? (
                      <span className="text-green-700 text-sm">Completed ({row.files.length})</span>
                    ) : (
                      <span className="text-slate-500 text-sm">Missing</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewType(row)}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleUploadForType(row.type)}>
                        <Upload className="w-4 h-4 mr-1" /> Upload
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!!viewer && (
        <DocumentViewer
          isOpen={!!viewer}
          onClose={() => setViewer(null)}
          title={viewer.title}
          documents={viewer.files}
          canEdit={false}
        />
      )}
    </div>
  );
}