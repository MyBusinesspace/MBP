{
  "name": "ProjectDocumentFolder",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Folder name for grouping project documents"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the folder"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Ordering for display"
    }
  },
  "required": [
    "name"
  ]
}