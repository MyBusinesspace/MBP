{
  "name": "ProjectDocumentType",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the project document type"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the document type"
    },
    "is_required": {
      "type": "boolean",
      "default": false,
      "description": "Whether this document type is required for all projects"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Ordering for display in the matrix"
    },
    "folder_id": {
      "type": "string",
      "description": "ID of the ProjectDocumentFolder where files should be stored (optional)"
    }
  },
  "required": [
    "name"
  ]
}