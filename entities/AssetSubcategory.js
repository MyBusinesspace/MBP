{
  "name": "AssetSubcategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the subcategory (e.g., 'Sedan car', 'Power Tools', 'Hand Tools')"
    },
    "category_id": {
      "type": "string",
      "description": "ID of the parent AssetCategory"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the subcategory"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this subcategory should appear"
    }
  },
  "required": [
    "name",
    "category_id"
  ]
}