{
  "name": "WorkingReport",
  "type": "object",
  "properties": {
    "time_entry_id": {
      "type": "string",
      "description": "ID of the Working Order (TimeEntry)"
    },
    "branch_id": {
      "type": "string",
      "description": "Branch/company scope"
    },
    "report_number": {
      "type": "string",
      "description": "Serial number WR-001/yy"
    },
    "session_id": {
      "type": "string",
      "description": "Timer session id (if available)"
    },
    "team_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Teams involved"
    },
    "employee_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Employees involved"
    },
    "site_report_notes": {
      "type": "string"
    },
    "site_report_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "text": {
            "type": "string"
          },
          "checked": {
            "type": "boolean"
          }
        }
      },
      "default": []
    },
    "start_time": {
      "type": "string",
      "format": "date-time"
    },
    "end_time": {
      "type": "string",
      "format": "date-time"
    },
    "duration_minutes": {
      "type": "number"
    },
    "client_approval_name": {
      "type": "string"
    },
    "client_approval_phone": {
      "type": "string"
    },
    "client_approval_comments": {
      "type": "string"
    },
    "client_approval_signature_url": {
      "type": "string"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "other_file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "status": {
      "type": "string",
      "enum": [
        "draft",
        "submitted",
        "approved"
      ],
      "default": "draft"
    }
  },
  "required": [
    "time_entry_id"
  ]
}