
import React, { useState, useRef } from 'react';
import { QuickTaskComment } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Reply, Send, Loader2, FileText, Trash2, X, Upload } from 'lucide-react'; 
import { format } from 'date-fns';
import Avatar from '../Avatar';
import { toast } from 'sonner';
import { UploadFile } from '@/integrations/Core';
import { cn } from '@/lib/utils';
import ActivityIcon from '../icons/ActivityIcon';

export default function TaskActivityFeed({ taskId, comments, users, currentUser, onRefresh }) {
  const [replyingTo, setReplyingTo] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [selectedComments, setSelectedComments] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [deletingComments, setDeletingComments] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const getDynamicFullName = (user) => {
    if (!user) return 'Unknown User';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || user.full_name || 'Unknown User';
  };

  // Auto-scroll to bottom when new comments arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await handleFilesUpload(files);
  };

  const handleFileInputChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    await handleFilesUpload(files);
  };

  const handleFilesUpload = async (files) => {
    setUploadingFiles(true);
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      
      setAttachedFiles(prev => [...prev, ...urls]);
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
      
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() && attachedFiles.length === 0) return;

    setIsSubmitting(true);
    try {
      const newCommentData = await QuickTaskComment.create({
        task_id: taskId,
        content: newComment.trim() || '(File attached)',
        comment_type: replyingTo ? 'reply' : 'feedback',
        parent_comment_id: replyingTo?.id || null,
        file_urls: attachedFiles.length > 0 ? attachedFiles : null
      });

      setNewComment('');
      setReplyingTo(null);
      setAttachedFiles([]);
      
      // NO llamar a onRefresh() - solo actualizar localmente
      toast.success('Comment posted');
      
      // Recargar solo los comentarios sin refresh completo
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedComments.size === 0) return;
    
    if (!confirm(`Delete ${selectedComments.size} comment${selectedComments.size > 1 ? 's' : ''}?`)) return;

    setDeletingComments(true);
    try {
      const deletePromises = Array.from(selectedComments).map(id => QuickTaskComment.delete(id));
      await Promise.all(deletePromises);
      
      setSelectedComments(new Set());
      if (onRefresh) await onRefresh();
      toast.success(`Deleted ${deletePromises.length} comment${deletePromises.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to delete comments:', error);
      toast.error('Failed to delete comments');
    } finally {
      setDeletingComments(false);
    }
  };

  // Group comments by parent (for threading)
  const rootComments = comments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId) => comments.filter(c => c.parent_comment_id === commentId);

  const CommentItem = ({ comment, isReply = false }) => {
    const author = users.find(u => u.id === comment.created_by) || 
                   users.find(u => u.email === comment.created_by);
    const replies = getReplies(comment.id);
    const isSelected = selectedComments.has(comment.id);
    const canDelete = comment.created_by === currentUser?.id || currentUser?.role === 'admin';
    
    const formatTime = (dateString) => {
      try {
        let date = new Date(dateString);
        if (!dateString.endsWith('Z') && !dateString.includes('+')) {
          date = new Date(dateString + 'Z');
        }
        return format(date, 'MMM d, h:mm a');
      } catch {
        return '';
      }
    };

    return (
      <div className={`${isReply ? 'ml-8 border-l-2 border-slate-200 pl-3' : ''}`}>
        <div className="flex gap-2 mb-2 group">
          {canDelete && (
            <div className="flex-shrink-0 pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                  const newSelected = new Set(selectedComments);
                  if (checked) {
                    newSelected.add(comment.id);
                  } else {
                    newSelected.delete(comment.id);
                  }
                  setSelectedComments(newSelected);
                }}
                className="h-4 w-4"
              />
            </div>
          )}
          <Avatar 
            name={getDynamicFullName(author)} 
            src={author?.avatar_url}
            className="w-7 h-7 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-xs text-slate-900">
                  {getDynamicFullName(author)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {formatTime(comment.created_date)}
                </p>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
              
              {comment.file_urls && comment.file_urls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {comment.file_urls.map((url, idx) => {
                    const fileName = url.split('/').pop().split('?')[0];
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                    
                    return (
                      <div key={idx}>
                        {isImage ? (
                          <img 
                            src={url} 
                            alt={fileName}
                            className="max-w-[200px] rounded cursor-pointer hover:opacity-90 border border-slate-200"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ) : (
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{fileName}</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setReplyingTo(comment)}
              className="text-xs text-slate-500 hover:text-slate-700 mt-1 flex items-center gap-1"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          </div>
        </div>
        
        {replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Delete Selected Bar */}
      {selectedComments.size > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedComments.size} comment{selectedComments.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedComments(new Set())}
              >
                Clear
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deletingComments}
              >
                {deletingComments ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <div className="w-48 h-48 flex items-center justify-center mb-3">
              <ActivityIcon className="w-full h-full" />
            </div>
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs mt-1">Start the conversation below</p>
          </div>
        ) : (
          <>
            {rootComments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* New Comment Input - AT THE BOTTOM */}
      <div className="flex-shrink-0 border-t border-slate-200 p-3 bg-white">
        {replyingTo && (
          <div className="mb-2 p-2 bg-blue-50 rounded text-xs flex items-center justify-between border border-blue-200">
            <span className="text-blue-700">
              Replying to {getDynamicFullName(users.find(u => u.id === replyingTo.created_by))}
            </span>
            <button onClick={() => setReplyingTo(null)} className="text-blue-700 hover:text-blue-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 p-2 bg-slate-50 rounded border border-slate-200">
            {attachedFiles.map((url, idx) => {
              const fileName = url.split('/').pop().split('?')[0];
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
              
              return (
                <div key={idx} className="relative group">
                  {isImage ? (
                    <div className="relative">
                      <img 
                        src={url} 
                        alt={fileName}
                        className="h-16 w-16 object-cover rounded border border-slate-300"
                      />
                      <button
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-300">
                      <FileText className="w-3 h-3 text-slate-600" />
                      <span className="text-xs truncate max-w-[100px]">{fileName}</span>
                      <button
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <div 
          className={cn(
            "flex gap-2 relative",
            isDragging && "ring-2 ring-blue-500 rounded-lg"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center z-10 rounded-lg border-2 border-dashed border-blue-500">
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium text-blue-700">Drop files here</p>
              </div>
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? "Write a reply..." : "Add a comment or drag & drop files..."}
            rows={2}
            className="resize-none text-sm"
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles || isSubmitting}
            >
              {uploadingFiles ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
            </Button>
          </div>
          
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={isSubmitting || (!newComment.trim() && attachedFiles.length === 0)}
          >
            {isSubmitting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Send className="w-3 h-3 mr-1" />
                Send
              </>
            )}
          </Button>
        </div>
        
        <p className="text-[10px] text-slate-400 mt-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
