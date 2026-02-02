{
  "name": "TimeEntry",
  "type": "object",
  "properties": {
    "employee_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of employee IDs assigned to this work order"
    },
    "team_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of team IDs assigned to this work order"
    },
    "employee_id": {
      "type": "string",
      "description": "Legacy single employee ID (deprecated, use employee_ids)"
    },
    "team_id": {
      "type": "string",
      "description": "Legacy single team ID (deprecated, use team_ids)"
    },
    "project_id": {
      "type": "string"
    },
    "branch_id": {
      "type": "string",
      "description": "Branch this work order belongs to"
    },
    "equipment_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of equipment (asset) IDs this work order is associated with"
    },
    "equipment_id": {
      "type": "string",
      "description": "Legacy single equipment ID (deprecated, use equipment_ids)"
    },
    "work_order_number": {
      "type": "string",
      "description": "Unique work order number (e.g., N1, N2, N100)"
    },
    "title": {
      "type": "string",
      "description": "Short title for the work order"
    },
    "task": {
      "type": "string",
      "description": "Task description for quick work orders"
    },
    "status": {
      "type": "string",
      "enum": [
        "open",
        "closed"
      ],
      "default": "open",
      "description": "Current status of the work order"
    },
    "task_start_date": {
      "type": "string",
      "format": "date",
      "description": "Start date for the task assignment"
    },
    "task_expected_end_date": {
      "type": "string",
      "format": "date",
      "description": "Expected completion date for the task"
    },
    "task_document_url": {
      "type": "string",
      "description": "URL of document attached to the task"
    },
    "work_notes": {
      "type": "string",
      "description": "Work notes for the work order (separate from task description)"
    },
    "work_description_items": {
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
      "default": [],
      "description": "List of work description items (Management Instructions)"
    },
    "work_done_items": {
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
      "default": [],
      "description": "List of work done items"
    },
    "spare_parts_items": {
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
          },
          "qty": {
            "type": "string"
          }
        }
      },
      "default": [],
      "description": "List of spare parts installed items"
    },
    "work_pending_items": {
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
      "default": [],
      "description": "List of work pending to do items"
    },
    "spare_parts_pending_items": {
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
          },
          "qty": {
            "type": "string"
          }
        }
      },
      "default": [],
      "description": "List of spare parts pending to install items"
    },
    "job_completion_status": {
      "type": "string",
      "enum": [
        "All done",
        "Pending more work",
        "Safe to use",
        "Unsafe to use",
        "Others"
      ],
      "description": "Status of the job after work is done"
    },
    "client_feedback_comments": {
      "type": "string",
      "description": "Comments from the client"
    },
    "client_representative_name": {
      "type": "string",
      "description": "Name/Signature of the client responsible"
    },
    "client_representative_phone": {
      "type": "string",
      "description": "Mobile number of the client responsible"
    },
    "client_signature_url": {
      "type": "string",
      "description": "URL for customer's signature image (PNG/JPG)"
    },
    "note_1": {
      "type": "string",
      "description": "Additional note 1 (Deprecated)"
    },
    "note_2": {
      "type": "string",
      "description": "Additional note 2 (Deprecated)"
    },
    "note_3": {
      "type": "string",
      "description": "Additional note 3 (Deprecated)"
    },
    "note_4": {
      "type": "string",
      "description": "Additional note 4 (Deprecated)"
    },
    "work_done_description": {
      "type": "string",
      "description": "Detailed description of the work done (Deprecated)"
    },
    "spare_parts": {
      "type": "string",
      "description": "Spare parts installed/released (Deprecated)"
    },
    "task_status": {
      "type": "string",
      "enum": [
        "open",
        "closed",
        "cancelled"
      ],
      "description": "Status of the task when completing work"
    },
    "work_order_category_id": {
      "type": "string",
      "description": "ID of the work order category this time entry belongs to"
    },
    "shift_type_id": {
      "type": "string",
      "description": "ID of the shift type assigned to this work order"
    },
    "archived": {
      "type": "boolean",
      "default": false,
      "description": "Whether this task is archived"
    },
    "start_time": {
      "type": "string",
      "format": "date-time"
    },
    "end_time": {
      "type": "string",
      "format": "date-time"
    },
    "planned_start_time": {
      "type": "string",
      "format": "date-time",
      "description": "Planned start time for the work order"
    },
    "planned_end_time": {
      "type": "string",
      "format": "date-time",
      "description": "Planned end time for the work order"
    },
    "duration_minutes": {
      "type": "number"
    },
    "start_coords": {
      "type": "object",
      "properties": {
        "lat": {
          "type": "number"
        },
        "lon": {
          "type": "number"
        }
      }
    },
    "end_coords": {
      "type": "object",
      "properties": {
        "lat": {
          "type": "number"
        },
        "lon": {
          "type": "number"
        }
      }
    },
    "start_address": {
      "type": "string",
      "description": "Human-readable address obtained from start coordinates via Google Places"
    },
    "end_address": {
      "type": "string",
      "description": "Human-readable address obtained from end coordinates via Google Places"
    },
    "is_active": {
      "type": "boolean",
      "default": false
    },
    "is_urgent": {
      "type": "boolean",
      "default": false,
      "description": "Urgent ticket without schedule"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for working reports/forms attached to this work order."
    },
    "other_file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for other photos/documents attached to this work order."
    },
    "breaks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "start_time": {
            "type": "string"
          },
          "end_time": {
            "type": "string"
          },
          "is_payable": {
            "type": "boolean",
            "default": false
          }
        }
      },
      "description": "Array of breaks with start/end times and payable status"
    },
    "updated_by": {
      "type": "string",
      "description": "Email of the user who last updated this work order"
    },
    "activity_log": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "action": {
            "type": "string",
            "enum": [
              "Created",
              "Edited",
              "Copied",
              "Pasted",
              "Dropped",
              "Archived"
            ]
          },
          "user_email": {
            "type": "string"
          },
          "user_name": {
            "type": "string"
          },
          "details": {
            "type": "string"
          }
        }
      },
      "description": "Activity log tracking all changes to this work order"
    },
    "is_repeating": {
      "type": "boolean",
      "default": false,
      "description": "Whether this work order repeats"
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
      "format": "date-time",
      "description": "When the recurrence should end"
    },
    "skip_weekends": {
      "type": "boolean",
      "default": false,
      "description": "Skip Sundays and move to Saturday"
    },
    "moved_from_sunday": {
      "type": "boolean",
      "default": false,
      "description": "Flag to indicate this work order was moved from Sunday to Saturday"
    }
  },
  "required": [
    "project_id"
  ]
}