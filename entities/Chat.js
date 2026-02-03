{
  "name": "Chat",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the chat (e.g., 'Group Chat' or concatenated names for private chats)"
    },
    "type": {
      "type": "string",
      "enum": [
        "private",
        "group"
      ],
      "default": "private"
    },
    "memberUserIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of User IDs participating in the chat"
    },
    "lastMessageText": {
      "type": "string",
      "description": "Content of the last message for quick display in chat list"
    },
    "lastMessageTimestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of the last message"
    },
    "groupImageUrl": {
      "type": "string",
      "description": "URL for the group chat's image (optional, for group chats)"
    },
    "adminUserIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of User IDs with admin privileges in the group (optional, for group chats)"
    }
  },
  "required": [
    "name",
    "type",
    "memberUserIds"
  ]
}