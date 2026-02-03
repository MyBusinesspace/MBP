{
  "name": "EmployeeDocument",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "ID of the employee this document belongs to"
    },
    "document_type_id": {
      "type": "string",
      "description": "ID of the document type"
    },
    "file_url": {
      "type": "string",
      "description": "Primary URL of the uploaded document file (deprecated, use file_urls)"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of file URLs for this document (supports multiple files)"
    },
    "file_name": {
      "type": "string",
      "description": "Original name of the uploaded file"
    },
    "file_names": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of file names corresponding to file_urls"
    },
    "upload_date": {
      "type": "string",
      "format": "date-time",
      "description": "When the document was first uploaded"
    },
    "last_updated_date": {
      "type": "string",
      "format": "date-time",
      "description": "When the document was last updated with new files"
    },
    "expiry_date": {
      "type": "string",
      "format": "date",
      "description": "Date when the document expires"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes about this document"
    },
    "is_not_applicable": {
      "type": "boolean",
      "default": false,
      "description": "Whether this document type is not applicable for the user"
    }
  },
  "required": [
    "employee_id",
    "document_type_id"
  ]
}