
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, X } from 'lucide-react';
// The 'toast' import is removed as toasts are being removed from the functionality
// import { toast } from 'sonner'; 

export default function ClockOutPhotoDialog({ isOpen, onClose, onComplete, actionType, workOrder }) {
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { UploadFile } = await import('@/integrations/Core');
      const { file_url } = await UploadFile({ file });
      setPhoto(file_url);
      // toast.success('Photo uploaded'); // Removed toast
    } catch (error) {
      console.error('Failed to upload photo:', error);
      // toast.error('Failed to upload photo'); // Removed toast
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCapturing(true);
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      // toast.error('Failed to access camera'); // Removed toast
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // Ensure drawing covers canvas

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      
      setUploading(true);
      try {
        const { UploadFile } = await import('@/integrations/Core');
        const { file_url } = await UploadFile({ file });
        setPhoto(file_url);
        stopCamera();
        // toast.success('Photo captured'); // Removed toast
      } catch (error) {
        console.error('Failed to upload photo:', error);
        // toast.error('Failed to upload photo'); // Removed toast
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg');
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCapturing(false);
  };

  const handleComplete = () => {
    stopCamera();
    onComplete(photo);
  };

  const handleSkip = () => {
    stopCamera();
    onComplete(null);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const getActionText = () => {
    switch (actionType) {
      case 'clockin': return 'Clock In';
      case 'clockout': return 'Clock Out';
      case 'switch': return 'Switch';
      default: return 'Continue';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Photo (Optional)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Take a photo or upload one for your work report
          </p>

          {capturing ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <Button onClick={capturePhoto} disabled={uploading} className="flex-1">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Capture
                    </>
                  )}
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : photo ? (
            <div className="space-y-3">
              <img src={photo} alt="Captured" className="w-full rounded-lg" />
              <Button onClick={() => setPhoto(null)} variant="outline" className="w-full">
                <X className="w-4 h-4 mr-2" />
                Remove Photo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={startCamera} variant="outline" className="h-24 flex-col">
                <Camera className="w-6 h-6 mb-2" />
                <span className="text-sm">Take Photo</span>
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="h-24 flex-col"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-6 h-6 mb-2 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-2" />
                    <span className="text-sm">Upload Photo</span>
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSkip} variant="outline">
            Skip
          </Button>
          <Button onClick={handleComplete} disabled={uploading}>
            {getActionText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
