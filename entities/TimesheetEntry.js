{
  "name": "TimesheetEntry",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "ID of the employee who created this timesheet"
    },
    "timesheet_type": {
      "type": "string",
      "enum": [
        "field_work",
        "office_work"
      ],
      "default": "field_work",
      "description": "Type of work: field work (with work orders) or office work"
    },
    "department_id": {
      "type": "string",
      "description": "ID of the department (required for office_work)"
    },
    "clock_in_time": {
      "type": "string",
      "format": "date-time",
      "description": "When the employee clocked in"
    },
    "clock_out_time": {
      "type": "string",
      "format": "date-time",
      "description": "When the employee clocked out"
    },
    "clock_in_coords": {
      "type": "object",
      "properties": {
        "lat": {
          "type": "number"
        },
        "lon": {
          "type": "number"
        }
      },
      "description": "GPS coordinates at clock-in"
    },
    "clock_out_coords": {
      "type": "object",
      "properties": {
        "lat": {
          "type": "number"
        },
        "lon": {
          "type": "number"
        }
      },
      "description": "GPS coordinates at clock-out"
    },
    "clock_in_photo_url": {
      "type": "string",
      "description": "Photo taken at clock-in"
    },
    "clock_out_photo_url": {
      "type": "string",
      "description": "Photo taken at clock-out"
    },
    "switch_photo_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Photos taken when switching work orders"
    },
    "clock_in_address": {
      "type": "string",
      "description": "Human-readable address at clock-in"
    },
    "clock_out_address": {
      "type": "string",
      "description": "Human-readable address at clock-out"
    },
    "total_duration_minutes": {
      "type": "number",
      "description": "Total duration of the timesheet in minutes"
    },
    "regular_hours_calculated": {
      "type": "number",
      "description": "Calculated regular hours for this timesheet (up to daily threshold)"
    },
    "overtime_hours_paid_calculated": {
      "type": "number",
      "description": "Calculated paid overtime hours for this timesheet"
    },
    "overtime_hours_non_paid_calculated": {
      "type": "number",
      "description": "Calculated non-paid overtime hours for this timesheet"
    },
    "work_order_segments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "work_order_id": {
            "type": "string"
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
          }
        }
      },
      "description": "Array of work order segments tracked during this timesheet (only for field_work)"
    },
    "live_tracking_points": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "lat": {
            "type": "number"
          },
          "lon": {
            "type": "number"
          }
        }
      },
      "description": "GPS tracking points recorded during the timesheet"
    },
    "notes": {
      "type": "string",
      "description": "User notes about the timesheet"
    },
    "is_active": {
      "type": "boolean",
      "default": false,
      "description": "Whether this timesheet is currently active"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "completed",
        "pending_approval",
        "approved",
        "rejected"
      ],
      "default": "active",
      "description": "Status of the timesheet"
    },
    "was_edited": {
      "type": "boolean",
      "default": false,
      "description": "Whether the timesheet times were manually edited"
    },
    "approval_notes": {
      "type": "string",
      "description": "Admin notes about approval/rejection"
    }
  },
  "required": [
    "employee_id",
    "clock_in_time",
    "timesheet_type"
  ]
}