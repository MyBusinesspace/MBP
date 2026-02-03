{
  "name": "DocumentType",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the document type (e.g., 'Driver License', 'ID Card', 'Contract')"
    },
    "folder_name": {
      "type": "string",
      "description": "Target folder name for future cloud integrations (e.g., Google Drive)."
    },
    "description": {
      "type": "string",
      "description": "Optional description of the document type"
    },
    "is_required": {
      "type": "boolean",
      "default": false,
      "description": "Whether this document type is mandatory for all employees"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this document type should appear in the table"
    },
    "work_order_category_id": {
      "type": "string",
      "description": "Optional: link to a WorkOrderCategory to scope this type for Orders Document Matrix"
    }
  },
  "required": [
    "name"
  ]
}