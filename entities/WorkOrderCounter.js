{
  "name": "WorkOrderCounter",
  "type": "object",
  "properties": {
    "branch_id": {
      "type": "string"
    },
    "year": {
      "type": "string",
      "description": "4-digit year, e.g., 2026"
    },
    "last_number": {
      "type": "number",
      "default": 0
    }
  },
  "required": [
    "branch_id",
    "year"
  ]
}