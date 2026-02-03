{
  "name": "PettyCashCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the petty cash category (e.g., 'Transportation', 'Meals', 'Supplies')"
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
    "icon": {
      "type": "string",
      "description": "Optional icon name for this category (lucide-react icon name)"
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