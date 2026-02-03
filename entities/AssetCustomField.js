{
  "name": "AssetCustomField",
  "type": "object",
  "properties": {
    "label": {
      "type": "string",
      "description": "Label of the custom field (e.g., 'Color', 'Size', 'Last Inspection Date')"
    },
    "field_type": {
      "type": "string",
      "enum": [
        "text",
        "number",
        "date",
        "select"
      ],
      "default": "text",
      "description": "Type of the field"
    },
    "options": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Options for select type fields (e.g., ['Red', 'Blue', 'Green'])"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this field should appear"
    }
  },
  "required": [
    "label",
    "field_type"
  ]
}