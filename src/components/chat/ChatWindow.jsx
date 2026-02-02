import React, { useState, useEffect, useRef } from 'react';
import { Message, Chat as ChatEntity } from '@/entities/all';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Loader2, MessageSquare, X, Image as ImageIcon, Smile, MoreVertical, Search, Phone, Video } from 'lucide-react';
import { toast } from "sonner";
import { UploadFile } from '@/integrations/Core';
import Avatar from '../Avatar';
import MessageBubble from './MessageBubble';
import { base44 } from '@/api/base44Client';
import VideoCallFrame from './VideoCallFrame';

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

export default function ChatWindow({ chat, currentUser, users }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef(0);
  const previousMessageCountRef = useRef(0);

  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const [activeCallUrl, setActiveCallUrl] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);

  // ✅ Reset cuando cambia el chat
  useEffect(() => {
    if (chat?.id) {
      previousMessageCountRef.current = 0;
      setMessages([]);
    }
  }, [chat?.id]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (!chat?.id || !currentUser) return;

    const markMessagesAsRead = async () => {
      try {
        const chatMessages = await Message.filter({ chatId: chat.id });
        
        for (const msg of chatMessages) {
          if (msg.created_by_id === currentUser.id) continue;
          
          const readByIds = msg.read_by_user_ids || [];
          if (readByIds.includes(currentUser.id)) continue;

          await Message.update(msg.id, {
            read_by_user_ids: [...readByIds, currentUser.id]
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [chat?.id, currentUser]);

  // ✅ SIMPLIFIED: Solo cargar mensajes, sin detectar llamadas
  useEffect(() => {
    if (!chat?.id) {
      setMessages([]);
      previousMessageCountRef.current = 0;
      return;
    }

    const fetchMessages = async (isInitialLoad = false) => {
      if (isFetchingRef.current) return;
      
      const now = Date.now();
      if (now - lastFetchRef.current < 5000 && !isInitialLoad) return;
      
      isFetchingRef.current = true;
      lastFetchRef.current = now;
      
      if (isInitialLoad) setLoading(true);
      
      try {
        const fetchedMessages = await Message.filter({ chatId: chat.id }, '-created_date', 100);
        const sortedMessages = fetchedMessages.reverse();
        
        setMessages(sortedMessages);
        
        if (isInitialLoad || sortedMessages.length > previousMessageCountRef.current) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        
        previousMessageCountRef.current = sortedMessages.length;
        
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        if (isInitialLoad) setLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchMessages(true);
    
    const intervalId = setInterval(() => fetchMessages(false), 5000);

    return () => {
      clearInterval(intervalId);
      isFetchingRef.current = false;
    };

  }, [chat?.id, currentUser?.id]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        const { file_url } = await UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      
      setAttachedFiles(prev => [...prev, ...uploadedUrls]);
      toast.success(`${files.length} file(s) attached`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (urlToRemove) => {
    setAttachedFiles(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachedFiles.length === 0) return;
    if (!chat) return;

    const messageContent = newMessage;
    const filesToSend = [...attachedFiles];
    
    setNewMessage('');
    setAttachedFiles([]);

    try {
      const createdMessage = await Message.create({
        chatId: chat.id,
        content: messageContent || '(File attached)',
        read_by_user_ids: [currentUser.id],
        fileUrls: filesToSend,
      });

      ChatEntity.update(chat.id, {
        lastMessageText: messageContent || '(File attached)',
        lastMessageTimestamp: new Date().toISOString(),
      }).catch(err => console.error('Failed to update chat metadata:', err));
      
      setTimeout(async () => {
        const freshMessages = await Message.filter({ chatId: chat.id }, '-created_date', 100);
        const sorted = freshMessages.reverse();
        setMessages(sorted);
        previousMessageCountRef.current = sorted.length;
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }, 500);
      
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message.");
    }
  };

  // ✅ Función para abrir llamada desde el mensaje
  const handleJoinCall = (roomUrl) => {
    setActiveCallUrl(roomUrl);
    setShowVideoCall(true);
  };

  const handleStartVideoCall = async () => {
    if (!chat || !chat.id) {
      toast.error('No chat selected');
      return;
    }

    setIsCreatingCall(true);
    try {
      const response = await base44.functions.invoke('createDailyRoom', {
        chatId: chat.id,
        chatName: chatDetails.name,
        roomType: 'video'
      });

      if (response.data?.room?.url) {
        setActiveCallUrl(response.data.room.url);
        setShowVideoCall(true);
        toast.success('Video call started!');
      } else {
        toast.error('Failed to start video call');
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      toast.error('Failed to start video call');
    } finally {
      setIsCreatingCall(false);
    }
  };

  const handleStartAudioCall = async () => {
    if (!chat || !chat.id) {
      toast.error('No chat selected');
      return;
    }

    setIsCreatingCall(true);
    try {
      const response = await base44.functions.invoke('createDailyRoom', {
        chatId: chat.id,
        chatName: chatDetails.name,
        roomType: 'audio'
      });

      if (response.data?.room?.url) {
        setActiveCallUrl(response.data.room.url);
        setShowVideoCall(true);
        toast.success('Audio call started!');
      } else {
        toast.error('Failed to start audio call');
      }
    } catch (error) {
      console.error('Error starting audio call:', error);
      toast.error('Failed to start audio call');
    } finally {
      setIsCreatingCall(false);
    }
  };

  const getSender = (message) => {
    const senderId = message.sender_user_id || message.created_by_id || message.created_by;
    if (!senderId) return currentUser;
    
    let sender = users.find(u => u.id === senderId);
    if (sender) return sender;
    
    sender = users.find(u => u.email === senderId);
    if (sender) return sender;
    
    if (senderId === currentUser.id || senderId === currentUser.email) {
      return currentUser;
    }
    
    return currentUser;
  };
  
  const chatDetails = React.useMemo(() => {
    if (!chat) return null;

    if (chat.type === 'private') {
      const otherUserId = chat.memberUserIds.find(id => id !== currentUser.id);
      const otherUser = users.find(u => u.id === otherUserId);
      return {
        name: getDynamicFullName(otherUser),
        avatar: otherUser?.avatar_url,
        jobRole: otherUser?.job_role,
        city: otherUser?.city,
        isOnline: true,
      };
    }
    return {
      name: chat.name,
      avatar: chat.groupImageUrl,
      jobRole: `${chat.memberUserIds?.length || 0} members`,
      isOnline: false,
    };
  }, [chat, currentUser, users]);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 h-full p-8">
        <div className="text-center max-w-md">
          <MessageSquare className="w-20 h-20 text-slate-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-700 header-express mb-2">Welcome to Chat</h2>
          <p className="text-slate-500 content-lexend">Select a conversation from the sidebar to start messaging, or create a new chat to connect with your team.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-slate-100">
        {/* Professional Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar
                  name={chatDetails.name}
                  src={chatDetails.avatar}
                  className="w-11 h-11"
                />
                {chatDetails.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900 header-express">{chatDetails.name}</h2>
                <p className="text-xs text-slate-500 capitalize truncate font-light">
                  {chatDetails.jobRole} {chatDetails.city && `• ${chatDetails.city}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-slate-600 hover:text-slate-900"
              >
                <Search className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleStartAudioCall}
                disabled={isCreatingCall}
                className="h-9 w-9 text-slate-600 hover:text-green-600 hover:bg-green-50"
                title="Start audio call"
              >
                {isCreatingCall ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Phone className="w-5 h-5" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleStartVideoCall}
                disabled={isCreatingCall}
                className="h-9 w-9 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                title="Start video call"
              >
                {isCreatingCall ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Video className="w-5 h-5" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-slate-900">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gradient-to-b from-slate-50 to-slate-100">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : (
            messages.map(message => {
              const sender = getSender(message);
              const isOwnMessage = (message.sender_user_id || message.created_by_id) === currentUser.id;
              
              return (
                <MessageBubble 
                  key={message.id} 
                  message={message}
                  sender={sender}
                  isOwnMessage={isOwnMessage}
                  onJoinCall={handleJoinCall}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Modern Input Area */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex-shrink-0">
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((url, idx) => {
                const fileName = url.split('/').pop().split('?')[0];
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                
                return (
                  <div key={idx} className="relative bg-slate-100 rounded-lg p-2 flex items-center gap-2 pr-8 border border-slate-200">
                    {isImage ? (
                      <>
                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs text-slate-700 font-medium">{fileName.substring(0, 20)}...</span>
                      </>
                    ) : (
                      <>
                        <Paperclip className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs text-slate-700 font-medium">{fileName.substring(0, 20)}...</span>
                      </>
                    )}
                    <button
                      onClick={() => handleRemoveFile(url)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          
          <div className="flex items-end gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
              className="h-10 w-10 rounded-full hover:bg-slate-100"
            >
              {uploadingFiles ? (
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5 text-slate-600" />
              )}
            </Button>
            
            <div className="flex-1 relative">
              <Input
                placeholder="Type your message..."
                className="pr-12 py-6 rounded-2xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={uploadingFiles}
              />
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-slate-200"
              >
                <Smile className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
            
            <Button 
              size="icon"
              onClick={handleSendMessage}
              disabled={uploadingFiles || (!newMessage.trim() && attachedFiles.length === 0)}
              className="h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {showVideoCall && activeCallUrl && (
        <VideoCallFrame
          roomUrl={activeCallUrl}
          onClose={() => {
            setShowVideoCall(false);
            setActiveCallUrl(null);
          }}
        />
      )}
    </>
  );
}