{
  "name": "Customer",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "category_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of the customer categories this customer belongs to (can have multiple)"
    },
    "contact_person": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "phone": {
      "type": "string"
    },
    "address": {
      "type": "string",
      "description": "Physical address of the customer"
    },
    "latitude": {
      "type": "number",
      "description": "Latitude coordinate of the office location"
    },
    "longitude": {
      "type": "number",
      "description": "Longitude coordinate of the office location"
    },
    "location_name": {
      "type": "string",
      "description": "Descriptive name for the office location"
    },
    "tax_number": {
      "type": "string",
      "description": "Customer's tax identification number"
    },
    "license_number": {
      "type": "string",
      "description": "Customer's business license or registration number"
    },
    "document_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for private documents/files attached to this customer (Legacy)"
    },
    "document_titles": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of titles for each document (Legacy)"
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
    "archived": {
      "type": "boolean",
      "default": false,
      "description": "Whether this customer is archived"
    },
    "custom_fields": {
      "type": "object",
      "additionalProperties": true,
      "description": "Custom fields defined by the user with labels and values"
    },
    "branch_id": {
      "type": "string",
      "description": "ID of the branch (company) this customer belongs to"
    }
  },
  "required": [
    "name"
  ]
}