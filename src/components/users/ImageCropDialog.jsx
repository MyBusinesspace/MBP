import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';

export default function ImageCropDialog({ isOpen, onClose, imageUrl, onSave, isSaving }) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const outputSize = 512;
      
      canvas.width = outputSize;
      canvas.height = outputSize;
      
      const img = imageRef.current;
      if (!img) {
        console.error('Image ref not found');
        return;
      }

      // Wait for image to load if needed
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
        });
      }
      
      const containerSize = 300;
      const imgNaturalWidth = img.naturalWidth;
      const imgNaturalHeight = img.naturalHeight;
      
      const containerAspect = 1;
      const imgAspect = imgNaturalWidth / imgNaturalHeight;
      
      let displayWidth, displayHeight;
      if (imgAspect > containerAspect) {
        displayHeight = containerSize;
        displayWidth = containerSize * imgAspect;
      } else {
        displayWidth = containerSize;
        displayHeight = containerSize / imgAspect;
      }
      
      const scaledWidth = displayWidth * zoom;
      const scaledHeight = displayHeight * zoom;
      
      const scaleX = imgNaturalWidth / scaledWidth;
      const scaleY = imgNaturalHeight / scaledHeight;
      
      const sourceX = -position.x * scaleX;
      const sourceY = -position.y * scaleY;
      const sourceWidth = containerSize * scaleX;
      const sourceHeight = containerSize * scaleY;
      
      ctx.drawImage(
        img,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceWidth, imgNaturalWidth - sourceX),
        Math.min(sourceHeight, imgNaturalHeight - sourceY),
        0,
        0,
        outputSize,
        outputSize
      );
      
      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });
      
      if (blob && onSave) {
        await onSave(blob);
      }
    } catch (error) {
      console.error('Error saving image:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Your Photo</DialogTitle>
          <p className="text-sm text-slate-600">Drag to reposition, use zoom to adjust size</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Container - Rounded square */}
          <div 
            ref={containerRef}
            className="relative w-[300px] h-[300px] mx-auto rounded-3xl overflow-hidden border-4 border-slate-200"
            style={{ 
              cursor: isDragging ? 'grabbing' : 'grab',
              backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              backgroundColor: '#f1f5f9'
            }}
          >
            <div
              className="absolute inset-0"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                className="absolute select-none pointer-events-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'top left',
                  maxWidth: 'none',
                  width: '300px',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Zoom</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600 w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Reset Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Position
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Photo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}