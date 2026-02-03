{
  "name": "AssetMaintenance",
  "type": "object",
  "properties": {
    "asset_id": {
      "type": "string",
      "description": "ID of the Asset this maintenance record belongs to"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Date of the maintenance/revision"
    },
    "kilometers": {
      "type": "number",
      "description": "Kilometer reading at the time of maintenance (for vehicles)"
    },
    "hours": {
      "type": "number",
      "description": "Hour reading at the time of maintenance (for equipment)"
    },
    "notes": {
      "type": "string",
      "description": "Details about the work performed during maintenance"
    }
  },
  "required": [
    "asset_id",
    "date"
  ]
}