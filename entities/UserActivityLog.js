{
  "name": "UserActivityLog",
  "type": "object",
  "properties": {
    "user_id": {
      "type": "string",
      "description": "ID of the user this activity belongs to"
    },
    "activity_type": {
      "type": "string",
      "enum": [
        "document_uploaded",
        "document_deleted",
        "payroll_processed",
        "profile_updated",
        "manual_entry"
      ],
      "description": "Type of activity that occurred"
    },
    "title": {
      "type": "string",
      "description": "Brief title of the activity"
    },
    "description": {
      "type": "string",
      "description": "Detailed description of what happened"
    },
    "metadata": {
      "type": "object",
      "additionalProperties": true,
      "description": "Additional data related to the activity (document info, payroll details, etc.)"
    },
    "activity_date": {
      "type": "string",
      "format": "date-time",
      "description": "When this activity occurred"
    },
    "created_by_user_id": {
      "type": "string",
      "description": "ID of the user who performed this action"
    }
  },
  "required": [
    "user_id",
    "activity_type",
    "title",
    "activity_date"
  ]
}