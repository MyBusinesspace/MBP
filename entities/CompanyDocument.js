{
  "name": "CompanyDocument",
  "type": "object",
  "properties": {
    "company_id": {
      "type": "string",
      "description": "ID of the company this document belongs to"
    },
    "document_type": {
      "type": "string",
      "description": "Type of document (e.g., 'License', 'Insurance', 'Contract', 'Registration')"
    },
    "document_name": {
      "type": "string",
      "description": "Name/title of the document"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of file URLs for this document"
    },
    "file_names": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of file names corresponding to file_urls"
    },
    "issue_date": {
      "type": "string",
      "format": "date",
      "description": "Date when the document was issued"
    },
    "expiry_date": {
      "type": "string",
      "format": "date",
      "description": "Date when the document expires"
    },
    "renewal_year": {
      "type": "number",
      "description": "Year when this document was last renewed"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes about this document"
    },
    "upload_date": {
      "type": "string",
      "format": "date-time",
      "description": "When the document was first uploaded"
    },
    "last_updated_date": {
      "type": "string",
      "format": "date-time",
      "description": "When the document was last updated"
    }
  },
  "required": [
    "company_id",
    "document_type",
    "document_name"
  ]
}