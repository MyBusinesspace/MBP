import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  File, Download, Trash2, Upload, Loader2, Eye, X, Edit2, Check, AlertCircle,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';

// Cache global para signed URLs
const signedUrlCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000;

export default function DocumentViewer({ 
  isOpen, 
  onClose, 
  title, 
  documents = [], 
  onUpload, 
  onRemove, 
  onUpdate,
  canEdit = false,
  isUploading = false,
  departmentName = "",
  showOpenInNewTab = true
}) {
  const [viewingDocument, setViewingDocument] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const canvasRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const pdfDocRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // New states for editing
  const [editingDoc, setEditingDoc] = useState(null);
  const [editForm, setEditForm] = useState({ file_name: '', expiry_date: '' });

  // ✅ Auto-seleccionar el primer documento cuando se abre el viewer
  useEffect(() => {
    if (isOpen && documents.length > 0 && !viewingDocument) {
      handleViewDocument(documents[0]);
    }
  }, [isOpen, documents]);

  useEffect(() => {
    if (!isOpen) {
      const now = Date.now();
      for (const [key, value] of Array.from(signedUrlCache.entries())) {
        if (now - value.timestamp > CACHE_DURATION) {
          signedUrlCache.delete(key);
        }
      }
      setViewingDocument(null);
      setScale(1.0);
      setCurrentPage(1);
      setPdfLoaded(false);
      pdfDocRef.current = null;
      setEditingDoc(null);
      setEditForm({ file_name: '', expiry_date: '' });
    }
  }, [isOpen]);

  // Cargar PDF.js desde CDN
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.body.appendChild(script);
    }
  }, []);

  const getFileName = (fileUri) => {
    if (!fileUri) return 'Document';
    const parts = fileUri.split('/');
    const fullFileNameWithQuery = parts[parts.length - 1];
    const fileName = fullFileNameWithQuery.split('?')[0];
    try {
      return decodeURIComponent(fileName) || 'Document';
    } catch (e) {
      return fileName || 'Document';
    }
  };

  const getFileExtension = (filename) => {
    if (!filename) return '';
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const isPDF = (filename) => {
    return getFileExtension(filename) === 'pdf';
  };

  const isImage = (filename) => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  };

  const getFileIcon = (filename) => {
    const ext = getFileExtension(filename);
    switch (ext) {
      case 'pdf':
        return <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold">PDF</div>;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">IMG</div>;
      case 'doc':
      case 'docx':
        return <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">DOC</div>;
      case 'xls':
      case 'xlsx':
        return <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">XLS</div>;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const isPublicUrl = (url) => {
    if (!url) return false;
    return url.includes('/storage/v1/object/public/') || url.startsWith('http://') || url.startsWith('https://');
  };

  const getSignedUrl = async (fileUri) => {
    if (!fileUri) {
      console.error('❌ No fileUri provided');
      return null;
    }
    
    console.log('🔐 Getting signed URL for:', fileUri);
    
    if (isPublicUrl(fileUri)) {
      console.log('✅ Public URL, returning as-is');
      return fileUri;
    }

    const cached = signedUrlCache.get(fileUri);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Using cached signed URL');
      return cached.url;
    }

    try {
      console.log('📡 Requesting new signed URL...');
      const response = await base44.functions.invoke('createPreviewUrl', {
        file_uri: fileUri,
        expires_in: 3600
      });

      console.log('📡 Response:', response);

      if (response.data?.signed_url) {
        signedUrlCache.set(fileUri, {
          url: response.data.signed_url,
          timestamp: Date.now()
        });
        console.log('✅ Signed URL cached');
        return response.data.signed_url;
      }

      console.warn('⚠️ No signed_url in response, returning original URI');
      return fileUri;
    } catch (error) {
      console.error('❌ Error getting signed URL:', error);
      return fileUri;
    }
  };

  const renderPDFPage = async (pdfDoc, pageNum) => {
    if (!canvasRef.current || !pdfDoc) return;
    
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scale * 1.5 });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      setPdfLoaded(true);
    } catch (error) {
      console.error('Error rendering PDF page:', error);
      setPreviewError('Failed to render PDF page');
    }
  };

  const loadPDF = async (url) => {
    if (!window.pdfjsLib) {
      setPreviewError('PDF viewer is loading...');
      return;
    }

    try {
      setPdfLoaded(false);
      console.log('📄 Loading PDF from:', url);
      const loadingTask = window.pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      await renderPDFPage(pdf, 1);
      console.log('✅ PDF loaded successfully');
    } catch (error) {
      console.error('❌ Error loading PDF:', error);
      setPreviewError('Failed to load PDF. Click "Open in New Tab" to view.');
    }
  };

  useEffect(() => {
    if (viewingDocument && isPDF(viewingDocument.file_name) && viewingDocument.signed_url) {
      loadPDF(viewingDocument.signed_url);
    }
  }, [viewingDocument?.signed_url, scale]);

  useEffect(() => {
    if (pdfDocRef.current && currentPage) {
      renderPDFPage(pdfDocRef.current, currentPage);
    }
  }, [currentPage]);

  const handleViewDocument = async (doc) => {
    console.log('👁️ Viewing document:', doc);
    setLoadingPreview(true);
    setPreviewError(null);
    setScale(1.0);
    setCurrentPage(1);

    try {
      const signedUrl = await getSignedUrl(doc.file_url);
      console.log('🔗 Signed URL obtained:', signedUrl);
      setViewingDocument({ ...doc, signed_url: signedUrl });
    } catch (error) {
      console.error('❌ Error viewing document:', error);
      setPreviewError('Failed to load document preview');
      toast.error('Failed to view document');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const signedUrl = await getSignedUrl(doc.file_url);
      if (!signedUrl) {
        toast.error('Failed to generate download URL');
        return;
      }

      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = doc.file_name || 'document';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleStartEdit = (doc) => {
    setEditingDoc(doc);
    setEditForm({
      file_name: doc.file_name || '',
      expiry_date: doc.expiry_date ? format(parseISO(doc.expiry_date), 'yyyy-MM-dd') : ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDoc || !editForm.file_name.trim()) {
      toast.error('File name cannot be empty');
      return;
    }

    if (!onUpdate) {
      toast.error('Update function not provided');
      return;
    }

    try {
      await onUpdate(editingDoc.document_id, {
        file_names: [editForm.file_name],
        expiry_date: editForm.expiry_date || null
      });
      
      setEditingDoc(null);
      setEditForm({ file_name: '', expiry_date: '' });
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to update document');
    }
  };

  const handleCancelEdit = () => {
    setEditingDoc(null);
    setEditForm({ file_name: '', expiry_date: '' });
  };

  const handleRemoveClick = async (doc) => {
    if (!confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;

    try {
      await onRemove(doc.file_url);
      if (viewingDocument?.file_url === doc.file_url) {
        // Si hay más documentos, mostrar el primero
        const remaining = documents.filter(d => d.file_url !== doc.file_url);
        if (remaining.length > 0) {
          handleViewDocument(remaining[0]);
        } else {
          setViewingDocument(null);
        }
      }
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove document');
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);

  const nextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const openInNewTab = () => {
    if (viewingDocument?.signed_url) {
      window.open(viewingDocument.signed_url, '_blank');
    }
  };

  const renderDocumentPreview = () => {
    if (!viewingDocument) {
      return (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <File className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select a document to preview</p>
          </div>
        </div>
      );
    }

    if (loadingPreview) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      );
    }

    const isPdf = isPDF(viewingDocument.file_name);
    const isImg = isImage(viewingDocument.file_name);

    if (isPdf) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage <= 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[100px] text-center">
                {pdfLoaded ? `Page ${currentPage} of ${numPages}` : 'Loading...'}
              </span>
              <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage >= numPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-slate-300 mx-2" />
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetZoom}>
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload(viewingDocument)} disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
              {showOpenInNewTab && (
                <Button variant="outline" size="sm" onClick={openInNewTab}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
            {previewError ? (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">{previewError}</p>
                {showOpenInNewTab && (
                  <Button onClick={openInNewTab}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                )}
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="max-w-full shadow-lg"
                style={{ display: pdfLoaded ? 'block' : 'none' }}
              />
            )}
            {!pdfLoaded && !previewError && (
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            )}
          </div>
        </div>
      );
    }

    if (isImg) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetZoom}>
                Reset
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={openInNewTab}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
            <img
              src={viewingDocument.signed_url}
              alt={viewingDocument.file_name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              style={{ transform: `scale(${scale})` }}
              onError={(e) => {
                console.error('❌ Image failed to load:', viewingDocument.signed_url);
                setPreviewError('Failed to load image');
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <File className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Preview not available</p>
          <p className="text-sm text-slate-500 mt-2">
            This file type cannot be previewed in the browser
          </p>
          <Button 
            onClick={() => handleDownload(viewingDocument)}
            className="mt-4"
            disabled={downloading}
          >
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {downloading ? 'Downloading...' : 'Download to View'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>{title}</span>
              {departmentName && (
                <Badge variant="outline" className="ml-3">
                  {departmentName}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {canEdit && onUpload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Document List Sidebar */}
          <div className="w-80 border-r bg-slate-50 overflow-y-auto">
            <div className="p-4 space-y-2">
              {documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No documents yet</p>
                  {canEdit && (
                    <p className="text-sm mt-2">Click "Upload" to add documents</p>
                  )}
                </div>
              ) : (
                documents.map((doc, index) => (
                  <div
                    key={index}
                    className={`group p-3 rounded-lg border transition-all ${
                      viewingDocument?.file_url === doc.file_url
                        ? 'bg-indigo-50 border-indigo-300'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getFileIcon(doc.file_name)}
                      <div className="flex-1 min-w-0">
                        {editingDoc?.file_url === doc.file_url ? (
                          <div className="space-y-2">
                            <Input
                              value={editForm.file_name}
                              onChange={(e) => setEditForm({...editForm, file_name: e.target.value})}
                              placeholder="File name"
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Input
                              type="date"
                              value={editForm.expiry_date}
                              onChange={(e) => setEditForm({...editForm, expiry_date: e.target.value})}
                              className="h-7 text-sm"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                className="h-6 px-2 text-xs"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-6 px-2 text-xs"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-sm truncate">
                              {doc.file_name}
                            </p>
                            {doc.upload_date && (
                              <p className="text-xs text-slate-500">
                                {format(parseISO(doc.upload_date), 'MMM d, yyyy')}
                              </p>
                            )}
                            {doc.expiry_date && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Expires: {format(parseISO(doc.expiry_date), 'MMM d, yyyy')}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {editingDoc?.file_url !== doc.file_url && (
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDocument(doc)}
                          className="h-7 text-xs flex-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(doc)}
                          className="h-7 text-xs flex-1"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                        {canEdit && onUpdate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(doc)}
                            className="h-7 px-2"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                        {canEdit && onRemove && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveClick(doc)}
                            className="h-7 px-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview Pane */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {renderDocumentPreview()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}