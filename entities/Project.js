{
  "name": "Project",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string",
      "description": "Brief description of the project"
    },
    "customer_id": {
      "type": "string"
    },
    "branch_id": {
      "type": "string",
      "description": "Branch this project belongs to"
    },
    "client_equipment_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of the client equipment associated with this project (from ClientEquipment entity)"
    },
    "category_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of the project categories this project belongs to"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "on_hold",
        "closed",
        "archived"
      ],
      "default": "active",
      "description": "Current status of the project"
    },
    "contact_person": {
      "type": "string",
      "description": "Primary contact person (backward compatibility)"
    },
    "contact_persons": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of contact persons for this project"
    },
    "phone": {
      "type": "string",
      "description": "Primary phone (backward compatibility)"
    },
    "phones": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of phone numbers corresponding to contact persons"
    },
    "last_visit": {
      "type": "string",
      "format": "date",
      "description": "Date of last visit to the project"
    },
    "address": {
      "type": "string",
      "description": "Full address for geocoding purposes"
    },
    "location_name": {
      "type": "string",
      "description": "Descriptive location name (e.g. North Area Dubai, Main Office)"
    },
    "latitude": {
      "type": "number",
      "description": "Project's latitude coordinate"
    },
    "longitude": {
      "type": "number",
      "description": "Project's longitude coordinate"
    },
    "google_maps_link": {
      "type": "string",
      "description": "Google Maps link for this project location"
    },
    "notes": {
      "type": "string",
      "description": "Project notes, special instructions, or observations"
    },
    "document_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for private documents attached to this project (Legacy)"
    },
    "document_titles": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of titles for each document (Legacy)"
    },
    "document_upload_dates": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of upload dates for each document (Legacy)"
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
    "document_notes": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of notes for each document (Legacy)"
    }
  },
  "required": [
    "name"
  ]
}