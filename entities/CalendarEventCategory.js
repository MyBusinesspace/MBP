{
  "name": "CalendarEventCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the event category (e.g., 'Meeting', 'Day Off', 'Call')"
    },
    "color": {
      "type": "string",
      "enum": [
        "blue",
        "green",
        "red",
        "yellow",
        "purple",
        "pink",
        "orange",
        "gray",
        "indigo",
        "teal"
      ],
      "default": "blue",
      "description": "Color for events of this category"
    },
    "icon": {
      "type": "string",
      "description": "Icon name for this category (lucide-react icon name)"
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