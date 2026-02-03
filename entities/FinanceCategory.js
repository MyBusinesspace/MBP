{
  "name": "FinanceCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the finance category"
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
      "description": "Color for the category badge"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the finance category"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which the category appears"
    }
  },
  "required": [
    "name"
  ]
}