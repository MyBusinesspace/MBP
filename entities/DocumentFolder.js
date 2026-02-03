{
  "name": "DocumentFolder",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the folder"
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
      "description": "Color theme for the folder"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the folder"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this folder should appear"
    }
  },
  "required": [
    "name"
  ]
}