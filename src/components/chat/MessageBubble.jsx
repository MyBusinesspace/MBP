import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Phone, Video, Copy } from 'lucide-react';
import { format } from 'date-fns';
import Avatar from '../Avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const getDynamicFullName = (user) => {
  if (!user) return 'Unknown User';
  
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const dynamicName = `${firstName} ${lastName}`.trim();
  
  if (dynamicName) return dynamicName;
  if (user.full_name) return user.full_name;
  if (user.email) return user.email.split('@')[0];
  
  return 'Unknown User';
};

export default function MessageBubble({ message, sender, isOwnMessage, onJoinCall }) {
  const senderName = getDynamicFullName(sender);
  
  const hasFiles = message.fileUrls && message.fileUrls.length > 0;
  
  // ✅ Detectar si es un mensaje de llamada
  const isCallMessage = message.content?.includes('call started') && 
                       (message.content?.includes('closecalls.daily.co') || 
                        message.content?.includes('daily.co'));
  
  const callUrl = isCallMessage ? message.content.match(/(https:\/\/[^\s]+)/)?.[1] : null;
  const isAudioCall = message.content?.includes('🎧 Audio');
  const isVideoCall = message.content?.includes('📹 Video');
  
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const dubaiTime = new Date(date.getTime() + (4 * 60 * 60 * 1000));
      return format(dubaiTime, 'h:mm a');
    } catch {
      return '';
    }
  };

  const handleCopyLink = async () => {
    if (callUrl) {
      try {
        await navigator.clipboard.writeText(callUrl);
        toast.success('Call link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-2 mb-3 w-full",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar - solo para mensajes de otros */}
      {!isOwnMessage && (
        <Avatar
          name={senderName}
          src={sender?.avatar_url}
          className="w-8 h-8 flex-shrink-0 mt-1"
        />
      )}

      <div className={cn(
        "flex flex-col min-w-0",
        isOwnMessage ? "items-end max-w-[70%]" : "items-start max-w-[70%]"
      )}>
        {/* Nombre del remitente - solo para mensajes de otros */}
        {!isOwnMessage && (
          <span className="text-xs font-medium text-slate-600 mb-1 px-1">
            {senderName}
          </span>
        )}

        {/* ✅ MENSAJE DE LLAMADA - DISEÑO ESPECIAL CON COPY LINK */}
        {isCallMessage && callUrl ? (
          <div className={cn(
            "rounded-2xl px-4 py-3 shadow-md border-2 max-w-full",
            isOwnMessage 
              ? "bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400" 
              : "bg-white border-slate-300"
          )}>
            <div className="flex items-center gap-3">
              {/* ✅ ICON CONTAINER WITH COPY BUTTON */}
              <div className="relative group">
                {isAudioCall ? (
                  <div className={cn(
                    "p-2 rounded-full",
                    isOwnMessage ? "bg-white/20" : "bg-green-100"
                  )}>
                    <Phone className={cn("w-5 h-5", isOwnMessage ? "text-white" : "text-green-600")} />
                  </div>
                ) : (
                  <div className={cn(
                    "p-2 rounded-full",
                    isOwnMessage ? "bg-white/20" : "bg-blue-100"
                  )}>
                    <Video className={cn("w-5 h-5", isOwnMessage ? "text-white" : "text-blue-600")} />
                  </div>
                )}
                
                {/* ✅ COPY LINK BUTTON - appears on hover */}
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    "absolute -top-1 -right-1 p-1 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100",
                    isOwnMessage ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  )}
                  title="Copy call link"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-semibold mb-1",
                  isOwnMessage ? "text-white" : "text-slate-900"
                )}>
                  {isAudioCall ? '🎧 Audio Call Started' : '📹 Video Call Started'}
                </p>
                <p className={cn(
                  "text-xs",
                  isOwnMessage ? "text-indigo-100" : "text-slate-500"
                )}>
                  {isOwnMessage ? 'Waiting for others to join...' : 'Click to join the call'}
                </p>
              </div>
            </div>
            
            {/* ✅ Botones de acción */}
            <div className="flex gap-2 mt-3">
              {/* Join Call Button */}
              {!isOwnMessage && onJoinCall && (
                <Button
                  onClick={() => onJoinCall(callUrl)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold"
                  size="sm"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Call
                </Button>
              )}
              
              {/* Copy Link Button - Always visible */}
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className={cn(
                  "flex items-center gap-2",
                  isOwnMessage ? "border-white/30 text-white hover:bg-white/10" : "border-slate-300"
                )}
                size="sm"
              >
                <Copy className="w-3 h-3" />
                Copy Link
              </Button>
            </div>
            
            {/* Hora del mensaje */}
            <div className={cn(
              "text-[10px] mt-2 text-right",
              isOwnMessage ? "text-indigo-200" : "text-slate-400"
            )}>
              {formatTime(message.created_date)}
            </div>
          </div>
        ) : (
          /* MENSAJE NORMAL */
          <div className={cn(
            "rounded-2xl px-3 py-2 shadow-sm w-auto inline-block max-w-full",
            isOwnMessage 
              ? "bg-indigo-600 text-white rounded-br-sm" 
              : "bg-white text-slate-900 border border-slate-200 rounded-bl-sm"
          )}>
            {/* Contenido del texto */}
            {message.content && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                {message.content}
              </p>
            )}

            {/* Archivos adjuntos */}
            {hasFiles && (
              <div className="mt-2 space-y-2">
                {message.fileUrls.map((url, idx) => {
                  const fileName = url.split('/').pop().split('?')[0];
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                  
                  return (
                    <div key={idx}>
                      {isImage ? (
                        <img 
                          src={url} 
                          alt={fileName}
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: '200px', maxWidth: '100%' }}
                          onClick={() => window.open(url, '_blank')}
                        />
                      ) : (
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg hover:bg-opacity-90 transition-colors",
                            isOwnMessage ? "bg-indigo-700" : "bg-slate-100"
                          )}
                        >
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs truncate max-w-[150px]">{fileName}</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Hora del mensaje */}
            <div className={cn(
              "text-[10px] mt-1",
              isOwnMessage ? "text-indigo-200" : "text-slate-400"
            )}>
              {formatTime(message.created_date)}
            </div>
          </div>
        )}

        {/* Indicador de leído (solo para mensajes propios) */}
        {isOwnMessage && message.read_by_user_ids && message.read_by_user_ids.length > 1 && (
          <span className="text-[10px] text-slate-400 mt-0.5 px-1">
            Read
          </span>
        )}
      </div>
    </motion.div>
  );
}