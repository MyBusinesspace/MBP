import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoCallFrame({ roomUrl, onClose }) {
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [iframeError, setIframeError] = React.useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // Suppress WebSocket errors from iframe
    const originalError = console.error;
    console.error = (...args) => {
      const errorMsg = args.join(' ');
      if (errorMsg.includes('WebSocket') || errorMsg.includes('websocket')) {
        return; // Suppress WebSocket errors from Daily.co iframe
      }
      originalError.apply(console, args);
    };

    return () => {
      document.body.style.overflow = 'auto';
      console.error = originalError;
    };
  }, []);

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-indigo-600 hover:bg-indigo-700 shadow-lg"
        >
          <Maximize2 className="w-4 h-4 mr-2" />
          Restore Call
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-slate-700">Video Call in Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Video Frame */}
          <div className="flex-1 bg-slate-900 rounded-b-xl overflow-hidden">
            {!iframeError ? (
              <iframe
                src={roomUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full border-0"
                title="Video Call"
                onError={() => setIframeError(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">Failed to load video call</p>
                  <p className="text-sm text-slate-400">Please try again later</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}