{
  "name": "ProjectDocument",
  "type": "object",
  "properties": {
    "project_id": {
      "type": "string",
      "description": "ID of the Project this document belongs to"
    },
    "document_type_id": {
      "type": "string",
      "description": "ID of the ProjectDocumentType"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of file URIs (private storage)"
    },
    "file_names": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of original file names"
    },
    "upload_date": {
      "type": "string",
      "format": "date-time",
      "description": "When the first file was uploaded"
    },
    "last_updated_date": {
      "type": "string",
      "format": "date-time",
      "description": "When files were last updated"
    },
    "expiry_date": {
      "type": "string",
      "format": "date",
      "description": "Optional expiry date for the document"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes"
    },
    "is_not_applicable": {
      "type": "boolean",
      "default": false,
      "description": "Whether this type is not applicable for this project"
    }
  },
  "required": [
    "project_id",
    "document_type_id"
  ]
}