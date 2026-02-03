{
  "name": "AssetCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the asset category"
    },
    "icon": {
      "type": "string",
      "description": "Lucide icon name for the category (e.g., 'Car', 'Wrench', 'Package')"
    },
    "icon_url": {
      "type": "string",
      "description": "Optional custom icon image URL (takes priority over icon name)"
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