import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Archive, Trash2, Plus, Loader2, File, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import { CreateFileSignedUrl, UploadPrivateFile } from '@/integrations/Core';
import { toast } from 'sonner';

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return <ImageIcon className="w-8 h-8 text-blue-500" />;
  } else if (['pdf'].includes(ext)) {
    return <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold">PDF</div>;
  } else if (['doc', 'docx'].includes(ext)) {
    return <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">DOC</div>;
  } else if (['xls', 'xlsx'].includes(ext)) {
    return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
  }
  return <File className="w-8 h-8 text-gray-500" />;
};

const getFileName = (url) => {
  const parts = url.split('/');
  return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
};

export default function ProjectDocumentsManager({ project, isOpen, onClose, onUpdate }) {
  const [documents, setDocuments] = useState(
    (project.document_urls || []).map((url, idx) => ({
      url,
      title: (project.document_titles && project.document_titles[idx]) || `Document ${idx + 1}`,
      id: `doc-${idx}`
    }))
  );
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const handleAddRow = () => {
    const newId = `new-${Date.now()}`;
    const newDoc = {
      url: null,
      title: '',
      id: newId,
      isNew: true
    };
    setDocuments([...documents, newDoc]);
    setEditingRow(newDoc.id);
  };

  const handleTitleChange = (id, newTitle) => {
    setDocuments(docs => 
      docs.map(doc => doc.id === id ? { ...doc, title: newTitle } : doc)
    );
  };

  const handleFileSelect = async (id, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_uri } = await UploadPrivateFile({ file });
      
      setDocuments(docs => 
        docs.map(doc => {
          if (doc.id === id) {
            return {
              ...doc,
              url: file_uri,
              title: doc.title || file.name,
              isNew: false
            };
          }
          return doc;
        })
      );
      
      toast.success('File uploaded successfully');
      setEditingRow(null);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const validDocs = documents.filter(doc => doc.url && doc.title);
    const urls = validDocs.map(d => d.url);
    const titles = validDocs.map(d => d.title);
    
    await onUpdate(project.id, {
      document_urls: urls,
      document_titles: titles
    });
    
    setDocuments(validDocs.map((doc, idx) => ({ ...doc, id: `doc-${idx}` })));
    setEditingRow(null);
    toast.success('Documents saved');
  };

  const handleDownloadSelected = async () => {
    const selected = documents.filter(doc => selectedDocs.has(doc.id));
    for (const doc of selected) {
      try {
        const { signed_url } = await CreateFileSignedUrl({ file_uri: doc.url });
        const link = document.createElement('a');
        link.href = signed_url;
        link.download = doc.title || getFileName(doc.url);
        link.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
    toast.success(`Downloaded ${selected.length} file(s)`);
  };

  const handleArchiveSelected = async () => {
    if (!confirm(`Archive ${selectedDocs.size} document(s)?`)) return;
    
    const newDocs = documents.filter(doc => !selectedDocs.has(doc.id));
    setDocuments(newDocs);
    setSelectedDocs(new Set());
    
    await saveToProject(newDocs);
    toast.success('Documents archived');
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedDocs.size} document(s) permanently?`)) return;
    
    const newDocs = documents.filter(doc => !selectedDocs.has(doc.id));
    setDocuments(newDocs);
    setSelectedDocs(new Set());
    
    await saveToProject(newDocs);
    toast.success('Documents deleted');
  };

  const saveToProject = async (docs) => {
    const validDocs = docs.filter(doc => doc.url && doc.title);
    const urls = validDocs.map(d => d.url);
    const titles = validDocs.map(d => d.title);
    await onUpdate(project.id, {
      document_urls: urls,
      document_titles: titles
    });
  };

  const toggleSelectDoc = (docId) => {
    setSelectedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.id)));
    }
  };

  const hasUnsavedChanges = documents.some(doc => 
    doc.isNew || (doc.url && !project.document_urls?.includes(doc.url))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Documents: {project.name}</DialogTitle>
            <div className="flex gap-2">
              {selectedDocs.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSelected}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download ({selectedDocs.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchiveSelected}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive ({selectedDocs.size})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedDocs.size})
                  </Button>
                </>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleAddRow}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
              {hasUnsavedChanges && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
              <FileText className="w-16 h-16 mb-4 text-gray-300" />
              <p>No documents yet</p>
              <p className="text-sm mt-1">Click "Add Document" to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDocs.size === documents.length && documents.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[45%]">Document Name</TableHead>
                  <TableHead className="w-[35%]">File</TableHead>
                  <TableHead className="w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className={doc.isNew ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDocs.has(doc.id)}
                        onCheckedChange={() => toggleSelectDoc(doc.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={doc.title}
                        onChange={(e) => handleTitleChange(doc.id, e.target.value)}
                        placeholder="Enter document name..."
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      {doc.url ? (
                        <div className="flex items-center gap-3">
                          {getFileIcon(getFileName(doc.url))}
                          <span className="text-xs text-gray-600 truncate">
                            {getFileName(doc.url)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No file selected</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => document.getElementById(`file-${doc.id}`)?.click()}
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Select'
                          )}
                        </Button>
                        <input
                          id={`file-${doc.id}`}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileSelect(doc.id, e)}
                          accept="*/*"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}