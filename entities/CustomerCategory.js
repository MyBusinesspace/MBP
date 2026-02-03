{
  "name": "CustomerCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the customer category (e.g., 'General Contractor', 'Residential Client', 'Commercial Client')"
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
      "default": "gray",
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