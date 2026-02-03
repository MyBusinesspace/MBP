{
  "name": "ProjectCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the project category (e.g., 'New Construction', 'Renovation', 'Maintenance')"
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
      "description": "Color theme for the category"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the category"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this category should appear"
    }
  },
  "required": [
    "name"
  ]
}