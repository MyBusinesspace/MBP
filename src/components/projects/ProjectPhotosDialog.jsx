
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Camera, Clock, Check, Eye, Trash2, X } from 'lucide-react';
import { TimeEntry } from '@/entities/all';
import { cn } from "@/lib/utils";

export default function ProjectPhotosDialog({ project, customers, isOpen, onClose, onUpdate }) {
  const [viewingImage, setViewingImage] = useState(null);
  const [allPhotos, setAllPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  const loadData = useCallback(async () => {
    if (!project) return;
    try {
      const entries = await TimeEntry.filter({ project_id: project.id });
      const timesheetPhotos = [];
      (entries || []).forEach(entry => {
        if (entry.file_urls && entry.file_urls.length > 0) {
          entry.file_urls.forEach(url => {
            timesheetPhotos.push({
              url,
              source: 'timesheet',
              type: 'Work Photo',
              entryId: entry.id,
              task: entry.task,
              date: entry.start_time, // Store the full ISO string for accurate dating
            });
          });
        }
      });
      setAllPhotos(timesheetPhotos);
    } catch (error) {
      console.error('Error loading photos from time entries:', error);
      setAllPhotos([]);
    }
  }, [project]);

  useEffect(() => {
    if (isOpen) {
        loadData();
        setSelectedPhotos([]); // Reset selection when dialog opens/changes
    }
  }, [isOpen, loadData]);

  const toggleSelection = (photo) => {
    setSelectedPhotos(prev => 
      prev.some(p => p.url === photo.url) 
        ? prev.filter(p => p.url !== photo.url) 
        : [...prev, photo]
    );
  };

  const forceDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename || url.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Download failed for:", url, error);
      window.open(url, '_blank'); // Fallback to opening in new tab
    }
  };

  const handleDownloadSelected = async () => {
    const customer = customers.find(c => c.id === project.customer_id);

    for (const photo of selectedPhotos) {
      // Helper to create a safe filename
      const sanitize = (str) => 
        str?.toLowerCase().replace(/[^a-z0-9-]/g, ' ').trim().replace(/\s+/g, '-') || '';

      const customerName = sanitize(customer?.name || 'cliente');
      const projectName = sanitize(project.name || 'proyecto');
      
      // Format date as YYYY-MM-DD, or use a placeholder
      const datePart = photo.date ? new Date(photo.date).toISOString().split('T')[0] : 'fecha-desconocida';
      
      // Get file extension from URL
      const urlParts = photo.url.split('?')[0].split('.');
      const extension = urlParts.length > 1 ? urlParts.pop() : 'jpg';

      const newFilename = `${customerName}-${projectName}-${datePart}.${extension}`;
      
      await forceDownload(photo.url, newFilename);
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
    }
  };
  
  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPhotos.length} photo(s)? This action cannot be undone.`)) return;

    const updates = selectedPhotos.reduce((acc, photo) => {
        if (!acc[photo.entryId]) {
            acc[photo.entryId] = [];
        }
        acc[photo.entryId].push(photo.url);
        return acc;
    }, {});

    try {
        const allEntries = await TimeEntry.filter({ project_id: project.id });
        const updatePromises = Object.keys(updates).map(entryId => {
            const entryToUpdate = allEntries.find(e => e.id === entryId);
            const urlsToDelete = updates[entryId];
            if (entryToUpdate) {
                const newUrls = (entryToUpdate.file_urls || []).filter(url => !urlsToDelete.includes(url));
                return TimeEntry.update(entryId, { file_urls: newUrls });
            }
            return Promise.resolve();
        });

        await Promise.all(updatePromises);
        setSelectedPhotos([]);
        await loadData(); // Reload photos
        onUpdate(); // Reload project page data (for the count)
    } catch (error) {
        console.error("Failed to delete photos:", error);
        alert("An error occurred while deleting photos. Please try again.");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Photos for: {project.name}</DialogTitle>
          </DialogHeader>

          {selectedPhotos.length > 0 && (
            <div className="flex-shrink-0 flex items-center justify-between p-3 bg-gray-100 rounded-lg my-2">
                <span className="text-sm font-medium">{selectedPhotos.length} photo(s) selected</span>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDownloadSelected}><Download className="w-4 h-4 mr-2" />Download</Button>
                    <Button size="sm" variant="destructive" onClick={handleDeleteSelected}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedPhotos([])}><X className="w-4 h-4 mr-2" />Clear</Button>
                </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2">
            {allPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allPhotos.map((photo, index) => {
                  const isSelected = selectedPhotos.some(p => p.url === photo.url);
                  return (
                    <div
                      key={`${photo.source}-${index}`}
                      className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => toggleSelection(photo)}
                    >
                      <img src={photo.url} alt={`${photo.type} ${index + 1}`} className="w-full h-full object-cover" />
                      
                      <div className={cn("absolute inset-0 transition-all", 
                        isSelected ? "bg-blue-500 bg-opacity-30" : "bg-black bg-opacity-0 group-hover:bg-opacity-40"
                      )}></div>
                      
                      <div
                        onClick={(e) => { e.stopPropagation(); setViewingImage(photo); }}
                        className="absolute top-2 right-2 h-7 w-7 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-75"
                      >
                        <Eye className="w-4 h-4" />
                      </div>

                      <div
                        className={cn("absolute top-2 left-2 h-6 w-6 border-2 rounded-full bg-white bg-opacity-50 flex items-center justify-center transition-all",
                          isSelected ? "border-blue-600" : "border-gray-400 group-hover:border-gray-200"
                        )}
                      >
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Camera className="w-16 h-16 mb-4" />
                <p>No photos have been uploaded for this project yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {viewingImage && (
        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-2">
            <div className="flex-1 relative bg-black rounded-lg flex items-center justify-center">
              <img src={viewingImage.url} alt="Enlarged project photo" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex justify-between items-center p-2 mt-2">
              <div className="flex items-center gap-2">
                <div className='px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800'>
                  <Clock className="w-4 h-4 inline mr-1" />
                  Work Photo
                </div>
                <div className="text-sm text-gray-600">
                  {viewingImage.task} - {viewingImage.date ? new Date(viewingImage.date).toLocaleDateString() : 'Unknown date'}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={viewingImage.url} download target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
