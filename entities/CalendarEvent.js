{
  "name": "CalendarEvent",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Title of the event"
    },
    "description": {
      "type": "string",
      "description": "Detailed description of the event"
    },
    "event_type": {
      "type": "string",
      "enum": [
        "meeting",
        "company_event",
        "holiday",
        "deadline",
        "personal",
        "other"
      ],
      "default": "meeting",
      "description": "Type of calendar event"
    },
    "start_time": {
      "type": "string",
      "format": "date-time",
      "description": "Start date and time of the event"
    },
    "end_time": {
      "type": "string",
      "format": "date-time",
      "description": "End date and time of the event"
    },
    "all_day": {
      "type": "boolean",
      "default": false,
      "description": "Whether this is an all-day event"
    },
    "location": {
      "type": "string",
      "description": "Physical location of the event"
    },
    "meeting_link": {
      "type": "string",
      "description": "Link for online meeting (Google Meet, Zoom, etc.)"
    },
    "visibility": {
      "type": "string",
      "enum": [
        "private",
        "shared",
        "selected"
      ],
      "default": "shared",
      "description": "Event visibility: private (only creator), shared (everyone), selected (specific users)"
    },
    "customer_id": {
      "type": "string",
      "description": "ID of the customer this event is related to"
    },
    "participant_user_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of user IDs invited to this event"
    },
    "participant_team_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of team IDs invited to this event"
    },
    "participant_customer_emails": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of customer emails invited to this event"
    },
    "participant_customer_whatsapp": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of customer WhatsApp phone numbers invited to this event (format: +971501234567)"
    },
    "color": {
      "type": "string",
      "enum": [
        "blue",
        "green",
        "red",
        "yellow",
        "purple",
        "pink",
        "orange",
        "gray"
      ],
      "default": "blue",
      "description": "Color for the event in the calendar"
    },
    "reminder_minutes": {
      "type": "number",
      "description": "Minutes before event to send reminder (e.g., 15, 30, 60)"
    },
    "is_recurring": {
      "type": "boolean",
      "default": false,
      "description": "Whether this event repeats"
    },
    "recurrence_type": {
      "type": "string",
      "enum": [
        "daily",
        "weekly",
        "monthly",
        "yearly"
      ],
      "description": "Type of recurrence pattern"
    },
    "recurrence_interval": {
      "type": "number",
      "default": 1,
      "description": "Interval for recurrence (e.g., every 2 weeks)"
    },
    "recurrence_end_date": {
      "type": "string",
      "format": "date",
      "description": "When the recurrence should end"
    },
    "recurrence_days_of_week": {
      "type": "array",
      "items": {
        "type": "number"
      },
      "description": "Days of week for weekly recurrence (0=Sunday, 6=Saturday)"
    },
    "google_calendar_sync": {
      "type": "boolean",
      "default": false,
      "description": "Whether this event is synced with Google Calendar"
    },
    "google_event_id": {
      "type": "string",
      "description": "Google Calendar event ID for synced events"
    },
    "document_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for documents attached to this event"
    },
    "document_titles": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of titles for each document (corresponds to document_urls by index)"
    },
    "document_upload_dates": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of upload dates for each document"
    }
  },
  "required": [
    "title",
    "start_time",
    "end_time"
  ]
}