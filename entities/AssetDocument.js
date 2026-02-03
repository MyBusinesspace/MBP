{
  "name": "AssetDocument",
  "type": "object",
  "properties": {
    "owner_type": {
      "type": "string",
      "enum": [
        "asset",
        "client_equipment"
      ]
    },
    "owner_id": {
      "type": "string"
    },
    "document_type_id": {
      "type": "string"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "URLs (privadas) de archivos"
    },
    "file_names": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "upload_date": {
      "type": "string",
      "format": "date-time"
    },
    "last_updated_date": {
      "type": "string",
      "format": "date-time"
    },
    "expiry_date": {
      "type": "string",
      "format": "date",
      "description": "Fecha de vencimiento opcional"
    },
    "notes": {
      "type": "string"
    },
    "is_not_applicable": {
      "type": "boolean",
      "default": false
    }
  },
  "required": [
    "owner_type",
    "owner_id",
    "document_type_id"
  ]
}