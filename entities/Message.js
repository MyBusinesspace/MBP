{
  "name": "Message",
  "type": "object",
  "properties": {
    "chatId": {
      "type": "string",
      "description": "ID of the Chat entity this message belongs to"
    },
    "content": {
      "type": "string",
      "description": "The actual text content of the message"
    },
    "fileUrls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for files/photos attached to this message"
    },
    "type": {
      "type": "string",
      "enum": [
        "text",
        "image",
        "file"
      ],
      "default": "text"
    },
    "message_category": {
      "type": "string",
      "enum": [
        "text",
        "image",
        "file",
        "video_call",
        "voice_call"
      ],
      "default": "text",
      "description": "Category of the message: normal text/file/image, or call"
    },
    "call_status": {
      "type": "string",
      "enum": [
        "pending",
        "ringing",
        "connected",
        "ended",
        "missed",
        "failed"
      ],
      "description": "Current status of the call, only relevant for video/voice calls"
    },
    "read_by_user_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of user IDs who have read this message"
    },
    "scheduled_send_time": {
      "type": "string",
      "format": "date-time",
      "description": "Optional: scheduled time to send this message"
    },
    "sender_user_id": {
      "type": "string",
      "description": ""
    }
  },
  "required": [
    "chatId",
    "content"
  ]
}