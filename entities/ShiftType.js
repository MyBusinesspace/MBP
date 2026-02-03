{
  "name": "ShiftType",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the shift type (e.g., 'Morning Shift', 'Night Shift', 'Flexible')"
    },
    "color": {
      "type": "string",
      "enum": [
        "gray",
        "red",
        "yellow",
        "green",
        "blue",
        "indigo",
        "purple",
        "pink",
        "orange",
        "teal"
      ],
      "default": "blue",
      "description": "Color theme for the shift type"
    },
    "start_time": {
      "type": "string",
      "description": "Default start time for this shift (HH:MM format)"
    },
    "end_time": {
      "type": "string",
      "description": "Default end time for this shift (HH:MM format)"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the shift type"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this shift type should appear"
    },
    "branch_id": {
      "type": "string",
      "description": "ID of the branch (company) this shift type belongs to"
    }
  },
  "required": [
    "name"
  ]
}