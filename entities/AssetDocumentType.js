{
  "name": "AssetDocumentType",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "folder_id": {
      "type": "string",
      "description": "ID de la carpeta a la que pertenece este tipo (opcional)"
    },
    "description": {
      "type": "string"
    },
    "is_required": {
      "type": "boolean",
      "default": false
    },
    "sort_order": {
      "type": "number",
      "default": 0
    }
  },
  "required": [
    "name"
  ]
}