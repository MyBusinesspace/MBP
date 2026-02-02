import React, { useState, useEffect } from 'react';
import { CalendarEventInvitation, CalendarEvent } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react'; // Added Loader2
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function PendingInvitations({ currentUserId, onUpdate }) {
  const [invitations, setInvitations] = useState([]);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (currentUserId) {
      loadInvitations();
    }
  }, [currentUserId]);

  const loadInvitations = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      console.log('📧 Loading invitations for user:', currentUserId);
      const allInvitations = await CalendarEventInvitation.list('-created_date');
      console.log('📧 All invitations:', allInvitations.length);
      
      const myPendingInvitations = allInvitations.filter(
        inv => inv.invitee_user_id === currentUserId && inv.status === 'pending'
      );
      console.log('📧 My pending invitations:', myPendingInvitations.length);

      setInvitations(myPendingInvitations);

      const eventIds = [...new Set(myPendingInvitations.map(inv => inv.event_id))];
      const eventsData = {};
      
      for (const eventId of eventIds) {
        try {
          const eventList = await CalendarEvent.filter({ id: eventId });
          if (eventList && eventList.length > 0) {
            eventsData[eventId] = eventList[0];
          }
        } catch (error) {
          console.error(`Failed to load event ${eventId}:`, error);
        }
      }
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitation) => {
    try {
      await CalendarEventInvitation.update(invitation.id, {
        status: 'accepted',
        responded_at: new Date().toISOString()
      });
      await loadInvitations();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDecline = async (invitation) => {
    try {
      await CalendarEventInvitation.update(invitation.id, {
        status: 'declined',
        responded_at: new Date().toISOString()
      });
      await loadInvitations();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  };

  const handleAddNote = (invitation) => {
    setSelectedInvitation(invitation);
    setNote(invitation.invitee_note || '');
    setShowNoteDialog(true);
  };

  const handleSaveNote = async () => {
    if (!selectedInvitation) return;

    try {
      await CalendarEventInvitation.update(selectedInvitation.id, {
        invitee_note: note
      });
      setShowNoteDialog(false);
      setSelectedInvitation(null);
      setNote('');
      await loadInvitations();
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const [showInvitationsDialog, setShowInvitationsDialog] = useState(false);

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
  }

  return (
    <>
      {/* Badge only - clickable to show invitations */}
      <button
        onClick={() => setShowInvitationsDialog(true)}
        className={`flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full transition-colors ${
          invitations.length > 0 
            ? 'text-white bg-blue-600 hover:bg-blue-700' 
            : 'text-slate-500 bg-slate-200 hover:bg-slate-300'
        }`}
        title="Pending Invitations"
      >
        {invitations.length}
      </button>

      {/* Dialog with invitations list */}
      <Dialog open={showInvitationsDialog} onOpenChange={setShowInvitationsDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Pending Invitations ({invitations.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {invitations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No pending invitations</p>
            ) : invitations.map(invitation => {
              const event = events[invitation.event_id];
              if (!event) return null;

              return (
                <div key={invitation.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-medium text-sm text-slate-900 mb-1">{event.title}</div>
                  <div className="text-slate-500 text-xs mb-3">
                    {format(parseISO(event.start_time), 'MMM d, h:mm a')}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAccept(invitation)}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                      onClick={() => handleDecline(invitation)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleAddNote(invitation)}
                      title="Add note"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveNote();
                }
              }}
              placeholder="Your note about this event..."
              rows={3}
              className="resize-none text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNoteDialog(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveNote} className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}