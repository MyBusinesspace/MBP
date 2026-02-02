import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Loader2, Trash2, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { UploadFile } from '@/integrations/Core';
import { EmployeeDocument } from '@/entities/all';

export default function BulkDocumentUploadDialog({ isOpen, onClose, userId, userName, documentTypes, onUploadComplete }) {
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleAddFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newUploads = files.map(file => ({
      id: Math.random().toString(36),
      file,
      fileName: file.name,
      documentTypeId: '',
      expiryDate: '',
      status: 'pending'
    }));

    setUploads(prev => [...prev, ...newUploads]);
    event.target.value = '';
  };

  const handleRemoveUpload = (id) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const handleUpdateUpload = (id, field, value) => {
    setUploads(prev => prev.map(u => 
      u.id === id ? { ...u, [field]: value } : u
    ));
  };

  const handleUploadAll = async () => {
    // Validar que todos tengan tipo de documento
    const invalid = uploads.filter(u => !u.documentTypeId);
    if (invalid.length > 0) {
      toast.error('All documents must have a document type selected');
      return;
    }

    setUploading(true);

    try {
      // Agrupar por tipo de documento
      const grouped = {};
      uploads.forEach(upload => {
        if (!grouped[upload.documentTypeId]) {
          grouped[upload.documentTypeId] = [];
        }
        grouped[upload.documentTypeId].push(upload);
      });

      // Subir cada grupo
      for (const [typeId, typeUploads] of Object.entries(grouped)) {
        const uploadPromises = typeUploads.map(u => UploadFile({ file: u.file }));
        const results = await Promise.all(uploadPromises);
        
        const fileUrls = results.map(r => r.file_url);
        const fileNames = typeUploads.map(u => u.fileName);
        const expiryDate = typeUploads.find(u => u.expiryDate)?.expiryDate;

        await EmployeeDocument.create({
          employee_id: userId,
          document_type_id: typeId,
          file_urls: fileUrls,
          file_names: fileNames,
          expiry_date: expiryDate || null,
          upload_date: new Date().toISOString(),
          last_updated_date: new Date().toISOString()
        });
      }

      toast.success(`${uploads.length} documents uploaded successfully!`);
      setUploads([]);
      onUploadComplete();
      onClose();

    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Failed to upload some documents');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl">
            Upload Multiple Documents - {userName}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Upload up to 5 documents at once and assign them to document types
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Files Button */}
          <div className="mb-6">
            <label className="cursor-pointer">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">
                  Click to select files or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF, JPG, PNG, DOC, XLS
                </p>
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleAddFiles}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
            </label>
          </div>

          {/* Uploads Table */}
          {uploads.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-48">File Name</TableHead>
                    <TableHead className="w-48">Title (Optional)</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead className="w-40">Expiry Date</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((upload, index) => (
                    <TableRow key={upload.id}>
                      <TableCell className="font-medium text-slate-500">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-sm truncate" title={upload.file.name}>
                            {upload.file.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={upload.fileName}
                          onChange={(e) => handleUpdateUpload(upload.id, 'fileName', e.target.value)}
                          placeholder="Custom title..."
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={upload.documentTypeId}
                          onValueChange={(value) => handleUpdateUpload(upload.id, 'documentTypeId', value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            type="date"
                            value={upload.expiryDate}
                            onChange={(e) => handleUpdateUpload(upload.id, 'expiryDate', e.target.value)}
                            className="h-8 text-sm"
                          />
                          <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveUpload(upload.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {uploads.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No files selected yet</p>
            </div>
          )}
        </div>

        <div className="border-t p-6 flex justify-between items-center bg-slate-50">
          <p className="text-sm text-slate-600">
            {uploads.length} file{uploads.length !== 1 ? 's' : ''} ready to upload
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUploadAll} 
              disabled={uploads.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload All
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}