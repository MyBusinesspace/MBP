{
  "name": "CalendarEventInvitation",
  "type": "object",
  "properties": {
    "event_id": {
      "type": "string",
      "description": "ID of the calendar event"
    },
    "invitee_user_id": {
      "type": "string",
      "description": "ID of the invited user"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "accepted",
        "declined"
      ],
      "default": "pending",
      "description": "Status of the invitation"
    },
    "invitee_note": {
      "type": "string",
      "description": "Note from the invitee about the event"
    },
    "responded_at": {
      "type": "string",
      "format": "date-time",
      "description": "When the invitee responded"
    }
  },
  "required": [
    "event_id",
    "invitee_user_id"
  ]
}