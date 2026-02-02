import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { QuickTaskComment } from '@/entities/all';
import { toast } from 'sonner';

export default function WorkingOnDialog({ isOpen, onClose, task, currentUser, onCommentAdded }) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Please add a comment about what you\'re working on');
      return;
    }

    setIsSubmitting(true);
    try {
      await QuickTaskComment.create({
        task_id: task.id,
        content: comment.trim(),
        comment_type: 'feedback'
      });

      toast.success('Started working on task!');
      setComment('');
      if (onCommentAdded) await onCommentAdded();
      onClose();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🚀 Starting work on this task
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            Let the team know what you're working on or any initial thoughts about the task.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Task Feedback</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Example: Starting on this now, will check the requirements first..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleSkip} disabled={isSubmitting}>
              Skip
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !comment.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}