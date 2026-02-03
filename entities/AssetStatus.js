{
  "name": "AssetStatus",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the asset status"
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
      "default": "green",
      "description": "Color theme for the status"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the status"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this status should appear"
    }
  },
  "required": [
    "name"
  ]
}