{
  "name": "QuickTask",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Title of the quick task"
    },
    "description": {
      "type": "string",
      "description": "Detailed description of the task"
    },
    "customer_id": {
      "type": "string",
      "description": "ID of the customer this task is associated with"
    },
    "status": {
      "type": "string",
      "enum": [
        "open",
        "done",
        "closed",
        "postponed"
      ],
      "default": "open",
      "description": "Current status of the task"
    },
    "is_draft": {
      "type": "boolean",
      "default": false,
      "description": "Whether this task is a draft"
    },
    "department_id": {
      "type": "string",
      "description": "ID of the department this task belongs to"
    },
    "assigned_to_user_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of user IDs this task is assigned to"
    },
    "working_on_by_user_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of user IDs who marked as working on this task"
    },
    "assigned_to_team_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of team IDs this task is assigned to"
    },
    "due_date": {
      "type": "string",
      "format": "date",
      "description": "Due date for the task"
    },
    "completed_date": {
      "type": "string",
      "format": "date-time",
      "description": "When the task was completed"
    },
    "location": {
      "type": "string",
      "description": "Location associated with the task"
    },
    "subtasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string"
          },
          "completed": {
            "type": "boolean",
            "default": false
          }
        }
      },
      "description": "List of subtasks"
    },
    "archived": {
      "type": "boolean",
      "default": false,
      "description": "Whether this task is archived"
    },
    "document_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for documents attached to this task"
    }
  },
  "required": [
    "title"
  ]
}