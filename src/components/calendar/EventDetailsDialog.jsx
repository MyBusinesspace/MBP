import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Trash2, Calendar, Bell, Video, FileText, Edit, User, Phone, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EventDetailsDialog({ event, open, onClose, onDelete, onEdit, currentUser, users = [] }) {
  if (!event) return null;

  // Get organizer name from users list
  const getOrganizerName = () => {
    if (!event.created_by) return 'Unknown';
    const organizer = users.find(u => u.email === event.created_by);
    if (organizer) {
      return `${organizer.first_name || ''} ${organizer.last_name || ''}`.trim() || organizer.email;
    }
    return event.created_by;
  };

  const handleDelete = async () => {
    if (!event.id) {
      toast.error('Event ID not found for deletion.');
      return;
    }
    try {
      await onDelete(event.id);
      toast.success('Event deleted successfully.');
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event.');
    }
  };

  // ✅ Función para enviar invitación por WhatsApp
  const handleSendWhatsApp = (phoneNumber) => {
    if (!event.meeting_link) {
      toast.error('No meeting link available');
      return;
    }

    // Formatear fecha y hora
    const startDate = new Date(event.start_time);
    const formattedDate = format(startDate, 'dd/MM/yyyy');
    const formattedTime = format(startDate, 'HH:mm');

    // ✅ Mensaje en inglés, sin emojis problemáticos
    const message = `Hello!

You are invited to a meeting:

TITLE: ${event.title}
DATE: ${formattedDate}
TIME: ${formattedTime}
${event.location ? `LOCATION: ${event.location}` : ''}

TO JOIN THE MEETING:
Click here: ${event.meeting_link}

See you there!`;

    // Limpiar número de teléfono (remover + y espacios para la URL)
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    
    // Abrir WhatsApp Web con el mensaje
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('Opening WhatsApp...');
  };

  const getParticipantNames = () => {
    if (!event.participant_user_ids || event.participant_user_ids.length === 0) {
      return 'No internal participants';
    }

    const participantNames = event.participant_user_ids
      .map(userId => {
        const user = users.find(u => u.id === userId);
        return user ? `${user.first_name} ${user.last_name}`.trim() : null;
      })
      .filter(Boolean);

    return participantNames.length > 0 ? participantNames.join(', ') : 'No internal participants';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-indigo-50 border-2 border-indigo-200">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-1">{event?.title}</DialogTitle>
              <p className="text-sm text-slate-500 capitalize">
                {event?.event_type?.replace('_', ' ')}
              </p>
            </div>
            {/* Hide edit/delete for Holiday events created from LeaveRequest */}
            {!(event?.event_type?.toLowerCase().includes('holiday') || 
               event?.event_type?.toLowerCase().includes('vacation') ||
               event?.event_type?.toLowerCase().includes('leave') ||
               event?.description?.includes('Leave Request')) ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(event)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                Managed via Payroll → Absences
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* ✅ MEETING LINK PROMINENTE */}
          {event?.meeting_link && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 rounded-lg">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900">Video Call Available</p>
                    <p className="text-sm text-indigo-700">Click to join the meeting room</p>
                  </div>
                </div>
                <Button
                  onClick={() => window.open(event.meeting_link, '_blank')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6"
                  size="lg"
                >
                  <Video className="w-5 h-5 mr-2" />
                  Join Call
                </Button>
              </div>
            </div>
          )}

          {/* Date & Time */}
          {(event?.start_time && event?.end_time) && (
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
              <div>
                <p className="font-medium">
                  {format(new Date(event?.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-slate-600">
                  {format(new Date(event?.start_time), 'h:mm a')} - {format(new Date(event?.end_time), 'h:mm a')}
                </p>
              </div>
            </div>
          )}

          {/* Location */}
          {event?.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-sm text-slate-600">{event.location}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event?.description && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium mb-1">Description</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-2">Participants</p>
              
              {/* Internal Users */}
              {event?.participant_user_ids && event.participant_user_ids.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Internal Team</p>
                  <p className="text-sm text-slate-600">{getParticipantNames()}</p>
                </div>
              )}

              {/* External Customers - Email */}
              {event?.participant_customer_emails && event.participant_customer_emails.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">External Clients (Email)</p>
                  <div className="flex flex-wrap gap-2">
                    {event.participant_customer_emails.map((email, idx) => (
                      <div
                        key={idx}
                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs"
                      >
                        {email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ External Customers - WhatsApp */}
              {event?.participant_customer_whatsapp && event.participant_customer_whatsapp.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">External Clients (WhatsApp)</p>
                  <div className="space-y-2">
                    {event.participant_customer_whatsapp.map((phone, idx) => (
                      <div
                        key={idx}
                        className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">{phone}</span>
                        </div>
                        {event.meeting_link && (
                          <Button
                            onClick={() => handleSendWhatsApp(phone)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Send invitation
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!event?.participant_user_ids || event.participant_user_ids.length === 0) &&
               (!event?.participant_customer_emails || event.participant_customer_emails.length === 0) &&
               (!event?.participant_customer_whatsapp || event.participant_customer_whatsapp.length === 0) && (
                <p className="text-sm text-slate-500">No participants invited</p>
              )}
            </div>
          </div>

          {/* Organizer */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-slate-500 mt-0.5" />
            <div>
              <p className="font-medium">Organizer</p>
              <p className="text-sm text-slate-600">{getOrganizerName()}</p>
            </div>
          </div>

          {/* Reminder */}
          {event?.reminder_minutes && (
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-slate-500 mt-0.5" />
              <div>
                <p className="font-medium">Reminder</p>
                <p className="text-sm text-slate-600">{event.reminder_minutes} minutes before</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}