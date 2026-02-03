{
  "name": "PublicHoliday",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the public holiday"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Date of the public holiday"
    },
    "description": {
      "type": "string",
      "description": "Optional description or notes"
    },
    "is_recurring": {
      "type": "boolean",
      "default": false,
      "description": "If true, this holiday repeats every year on the same date"
    }
  },
  "required": [
    "name",
    "date"
  ]
}