{
  "name": "EmployeeDocumentType",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the employee document type (e.g., Passport, Visa, ID Card)"
    },
    "folder_name": {
      "type": "string",
      "description": "Target folder name for storage providers (optional)"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the employee document type"
    },
    "is_required": {
      "type": "boolean",
      "default": false,
      "description": "Whether this document type is mandatory for employees"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this type appears in the matrix"
    }
  },
  "required": [
    "name"
  ]
}