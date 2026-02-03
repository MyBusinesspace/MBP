{
  "name": "QuickTaskComment",
  "type": "object",
  "properties": {
    "task_id": {
      "type": "string",
      "description": "ID of the quick task this comment belongs to"
    },
    "content": {
      "type": "string",
      "description": "Content of the comment"
    },
    "comment_type": {
      "type": "string",
      "enum": [
        "feedback",
        "reply",
        "status_change",
        "system"
      ],
      "default": "feedback",
      "description": "Type of comment"
    },
    "parent_comment_id": {
      "type": "string",
      "description": "ID of parent comment if this is a reply"
    },
    "mentioned_user_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of users mentioned in this comment"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "URLs of files attached to this comment"
    }
  },
  "required": [
    "task_id",
    "content"
  ]
}