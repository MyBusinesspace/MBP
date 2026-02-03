{
  "name": "Contact",
  "type": "object",
  "properties": {
    "avatar_url": {
      "type": "string",
      "description": "URL for the contact's avatar image"
    },
    "name": {
      "type": "string",
      "description": "Name of the contact person"
    },
    "company": {
      "type": "string",
      "description": "Company or organization name"
    },
    "job_title": {
      "type": "string",
      "description": "Job title or position of the contact"
    },
    "description": {
      "type": "string",
      "description": "Description or notes about this contact (e.g., 'Building security guard', 'Emergency electrician')"
    },
    "phone": {
      "type": "string",
      "description": "Primary phone number"
    },
    "phone_secondary": {
      "type": "string",
      "description": "Secondary phone number"
    },
    "email": {
      "type": "string",
      "description": "Email address"
    },
    "address": {
      "type": "string",
      "description": "Physical address"
    },
    "latitude": {
      "type": "number",
      "description": "Latitude coordinate"
    },
    "longitude": {
      "type": "number",
      "description": "Longitude coordinate"
    },
    "location_name": {
      "type": "string",
      "description": "Descriptive location name"
    },
    "category_id": {
      "type": "string",
      "description": "ID of the contact category"
    },
    "is_shared": {
      "type": "boolean",
      "default": true,
      "description": "Whether this contact is shared with all employees"
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
            "type": "string"
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
      "description": "Activity log tracking all changes to this contact"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes or observations"
    }
  },
  "required": [
    "name"
  ]
}