import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, X, File, Loader2, Plus, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadPrivateFile } from '@/integrations/Core';
import { EmployeeDocument } from '@/entities/all';
import { toast } from 'sonner';

export default function DocumentUploadDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  employees, 
  documentTypes, 
  existingDocuments,
  preselectedUserId = null,
  preselectedTypeId = null
}) {
  const [uploadRows, setUploadRows] = useState([
    { 
      id: 1, 
      file: null, 
      fileName: '', 
      employee_id: preselectedUserId || '', 
      document_type_id: preselectedTypeId || '', 
      folder_name: '', 
      uploading: false, 
      uploaded: false 
    }
  ]);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const fileInputRefs = useRef({});

  // Update preselected values if they change
  useEffect(() => {
    if (preselectedUserId || preselectedTypeId) {
      setUploadRows([{
        id: 1,
        file: null,
        fileName: '',
        employee_id: preselectedUserId || '',
        document_type_id: preselectedTypeId || '',
        folder_name: '',
        uploading: false,
        uploaded: false
      }]);
    }
  }, [preselectedUserId, preselectedTypeId]);

  const checkForDuplicates = () => {
    const warnings = [];
    const readyRows = uploadRows.filter(row => row.file && row.employee_id && row.document_type_id && !row.uploaded);

    readyRows.forEach(row => {
      const existing = existingDocuments.find(doc => 
        doc.employee_id === row.employee_id && doc.document_type_id === row.document_type_id
      );
      
      if (existing) {
        const employee = employees.find(e => e.id === row.employee_id);
        const docType = documentTypes.find(dt => dt.id === row.document_type_id);
        const employeeName = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.full_name;
        const existingFileCount = (existing.file_urls || [existing.file_url]).filter(Boolean).length;
        
        warnings.push({
          rowId: row.id,
          employee: employeeName,
          docType: docType?.name,
          fileName: row.fileName,
          existingCount: existingFileCount,
          action: 'add'
        });
      }
    });

    setDuplicateWarnings(warnings);
    return warnings;
  };

  const addNewRow = () => {
    const newId = Math.max(...uploadRows.map(r => r.id), 0) + 1;
    setUploadRows([...uploadRows, {
      id: newId,
      file: null,
      fileName: '',
      employee_id: preselectedUserId || '',
      document_type_id: preselectedTypeId || '',
      folder_name: '',
      uploading: false,
      uploaded: false
    }]);
  };

  const removeRow = (rowId) => {
    if (uploadRows.length === 1) {
      toast.error('At least one row is required');
      return;
    }
    setUploadRows(uploadRows.filter(r => r.id !== rowId));
  };

  const handleFileSelect = async (rowId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const updatedRows = uploadRows.map(row => {
      if (row.id === rowId) {
        return { ...row, file, fileName: file.name };
      }
      return row;
    });
    setUploadRows(updatedRows);
  };

  const handleFieldChange = (rowId, field, value) => {
    const updatedRows = uploadRows.map(row => {
      if (row.id === rowId) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setUploadRows(updatedRows);
  };

  const uploadDocument = async (row) => {
    if (!row.file || !row.employee_id || !row.document_type_id) {
      toast.error('Please select file, employee, and document type');
      return;
    }

    setUploadRows(prev => prev.map(r => r.id === row.id ? { ...r, uploading: true } : r));

    try {
      const { file_uri } = await UploadPrivateFile({ file: row.file });

      const existingDoc = existingDocuments.find(doc => 
        doc.employee_id === row.employee_id && doc.document_type_id === row.document_type_id
      );

      if (existingDoc) {
        const currentFileUrls = existingDoc.file_urls || [existingDoc.file_url].filter(Boolean);
        const currentFileNames = existingDoc.file_names || [existingDoc.file_name].filter(Boolean);
        
        await EmployeeDocument.update(existingDoc.id, {
          file_urls: [...currentFileUrls, file_uri],
          file_names: [...currentFileNames, row.fileName],
          last_updated_date: new Date().toISOString()
        });
      } else {
        await EmployeeDocument.create({
          employee_id: row.employee_id,
          document_type_id: row.document_type_id,
          file_urls: [file_uri],
          file_names: [row.fileName],
          upload_date: new Date().toISOString(),
          last_updated_date: new Date().toISOString()
        });
      }

      setUploadRows(prev => prev.map(r => 
        r.id === row.id ? { ...r, uploading: false, uploaded: true } : r
      ));

      toast.success(`Document "${row.fileName}" uploaded successfully!`);

      setTimeout(() => {
        setUploadRows(prev => prev.filter(r => r.id !== row.id));
        if (uploadRows.filter(r => r.id !== row.id).length === 0) {
          addNewRow();
        }
      }, 2000);

      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload document');
      setUploadRows(prev => prev.map(r => r.id === row.id ? { ...r, uploading: false } : r));
    }
  };

  const triggerFileInput = (rowId) => {
    fileInputRefs.current[rowId]?.click();
  };

  const canUpload = (row) => {
    return row.file && row.employee_id && row.document_type_id && !row.uploading && !row.uploaded;
  };

  const handleDone = () => {
    const warnings = checkForDuplicates();
    
    if (warnings.length > 0) {
      setShowWarningDialog(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setUploadRows([
      { 
        id: 1, 
        file: null, 
        fileName: '', 
        employee_id: preselectedUserId || '', 
        document_type_id: preselectedTypeId || '', 
        folder_name: '', 
        uploading: false, 
        uploaded: false 
      }
    ]);
    setDuplicateWarnings([]);
    setShowWarningDialog(false);
    onClose();
  };

  const handleConfirmWithWarnings = async () => {
    const readyRows = uploadRows.filter(row => canUpload(row));
    
    for (const row of readyRows) {
      await uploadDocument(row);
    }
    
    setTimeout(() => {
      handleClose();
    }, 1000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            Upload Documents
          </SheetTitle>
          <p className="text-sm text-slate-500 mt-1">
            Add multiple documents by filling the table below. Documents can have multiple files.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {showWarningDialog && duplicateWarnings.length > 0 && (
            <Alert className="mb-4 border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-800">
                <p className="font-semibold mb-2">Documents Already Exist</p>
                <ul className="space-y-1 ml-4 list-disc">
                  {duplicateWarnings.map((warning, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{warning.employee}</span> already has{' '}
                      <span className="font-medium">{warning.existingCount} file{warning.existingCount > 1 ? 's' : ''}</span> for{' '}
                      <span className="font-medium">{warning.docType}</span>.{' '}
                      <span className="text-orange-900">"{warning.fileName}" will be added as an additional file.</span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setShowWarningDialog(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleConfirmWithWarnings} className="bg-orange-600 hover:bg-orange-700">
                    Continue Anyway
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[250px]">File</TableHead>
                <TableHead className="w-[200px]">Employee</TableHead>
                <TableHead className="w-[200px]">Document Type</TableHead>
                <TableHead className="w-[150px]">Folder</TableHead>
                <TableHead className="w-[100px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadRows.map(row => {
                const isDuplicate = existingDocuments.some(doc => 
                  doc.employee_id === row.employee_id && doc.document_type_id === row.document_type_id
                );

                return (
                  <TableRow key={row.id} className={row.uploaded ? 'bg-green-50' : isDuplicate && row.file && row.employee_id && row.document_type_id ? 'bg-orange-50' : ''}>
                    <TableCell>
                      <input
                        type="file"
                        ref={el => fileInputRefs.current[row.id] = el}
                        onChange={(e) => handleFileSelect(row.id, e)}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerFileInput(row.id)}
                          disabled={row.uploading || row.uploaded}
                          className="h-8"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {row.file ? 'Change' : 'Select'}
                        </Button>
                        {row.fileName && (
                          <div className="flex items-center gap-1 text-xs text-slate-600 truncate flex-1">
                            <File className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate" title={row.fileName}>{row.fileName}</span>
                          </div>
                        )}
                      </div>
                      {isDuplicate && row.file && row.employee_id && row.document_type_id && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-700">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Will add to existing document</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Select
                        value={row.employee_id}
                        onValueChange={(val) => handleFieldChange(row.id, 'employee_id', val)}
                        disabled={row.uploading || row.uploaded || !!preselectedUserId}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.full_name || emp.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Select
                        value={row.document_type_id}
                        onValueChange={(val) => {
                          const docType = documentTypes.find(dt => dt.id === val);
                          handleFieldChange(row.id, 'document_type_id', val);
                          if (docType?.folder_name) {
                            handleFieldChange(row.id, 'folder_name', docType.folder_name);
                          }
                        }}
                        disabled={row.uploading || row.uploaded || !!preselectedTypeId}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map(dt => (
                            <SelectItem key={dt.id} value={dt.id}>
                              {dt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-500 px-2 py-1 bg-slate-50 rounded">
                        {row.folder_name || '-'}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {row.uploaded ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : row.uploading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        ) : canUpload(row) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => uploadDocument(row)}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        ) : null}
                        
                        {!row.uploaded && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => removeRow(row.id)}
                            disabled={row.uploading}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="px-6 py-4 border-t flex justify-between items-center bg-slate-50">
          <Button variant="outline" onClick={addNewRow} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </Button>
          <Button onClick={handleDone}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}