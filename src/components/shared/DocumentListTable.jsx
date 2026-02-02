import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Pencil } from "lucide-react";

export default function DocumentListTable({ title = "All Documents", rows = [], onView, onDelete, onEdit, showHeader = true }) {
  return (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <span className="text-xs text-slate-500">{rows.length} file(s)</span>
        </div>
      )}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead className="w-40">Uploaded</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-6">No documents</TableCell>
              </TableRow>
            ) : (
              rows.map((r, idx) => (
                <TableRow key={`${r.url}-${idx}`}>
                  <TableCell className="truncate max-w-[360px]" title={r.title}>{r.title || '-'} </TableCell>
                  <TableCell className="truncate max-w-[240px]">{r.type || '-'}</TableCell>
                  <TableCell>{r.date ? new Date(r.date).toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => onView?.(r)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    {onEdit && r.documentId && (
                      <Button size="sm" variant="outline" onClick={() => onEdit(r)}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onDelete?.(r)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}