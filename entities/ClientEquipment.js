{
  "name": "ClientEquipment",
  "type": "object",
  "properties": {
    "customer_id": {
      "type": "string",
      "description": "ID of the client this equipment belongs to"
    },
    "client_name": {
      "type": "string",
      "description": "Name of the client (denormalized for easier access)"
    },
    "project_id": {
      "type": "string",
      "description": "ID of the project this equipment is assigned to"
    },
    "name": {
      "type": "string",
      "description": "Name of the equipment"
    },
    "brand": {
      "type": "string",
      "description": "Brand/manufacturer of the equipment"
    },
    "serial_number": {
      "type": "string",
      "description": "Serial number of the equipment"
    },
    "plate_number": {
      "type": "string",
      "description": "License plate number for vehicles"
    },
    "year_of_manufacture": {
      "type": "string",
      "description": "Year of manufacture (YOM)"
    },
    "mast_type": {
      "type": "string",
      "description": "Type of mast (e.g., MonoB, Telescopic)"
    },
    "height": {
      "type": "string",
      "description": "Height specification (e.g., 1.8m, 2.5m)"
    },
    "category": {
      "type": "string",
      "description": "Category of the equipment (e.g. Tower Crane, Hoist)"
    },
    "status": {
      "type": "string",
      "description": "Current status (e.g. Active, Maintenance, On Rent)"
    },
    "last_status_change_date": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of the last status change, editable for manual entries"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes about the equipment"
    },
    "document_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for documents attached to this equipment (Legacy support)"
    },
    "attached_documents": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "upload_date": {
            "type": "string"
          },
          "notes": {
            "type": "string"
          }
        }
      },
      "description": "Detailed list of attached documents with metadata"
    },
    "custom_fields": {
      "type": "object",
      "additionalProperties": true,
      "description": "Custom fields defined by the company with labels and values"
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
              "Status Changed"
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
          },
          "changes": {
            "type": "object",
            "additionalProperties": true
          }
        }
      },
      "description": "Activity log tracking all changes to this equipment"
    },
    "status_history": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string"
          },
          "start_date": {
            "type": "string",
            "format": "date-time"
          },
          "end_date": {
            "type": "string",
            "format": "date-time"
          },
          "duration_days": {
            "type": "number"
          },
          "project_id": {
            "type": "string"
          },
          "project_name": {
            "type": "string"
          },
          "notes": {
            "type": "string"
          },
          "user_email": {
            "type": "string"
          },
          "user_name": {
            "type": "string"
          }
        }
      },
      "description": "Historical record of status changes with duration tracking"
    }
  },
  "required": [
    "name"
  ]
}