{
  "name": "OrganizationChartConfig",
  "type": "object",
  "properties": {
    "config_name": {
      "type": "string",
      "description": "Optional name for this configuration version"
    },
    "view_mode": {
      "type": "string",
      "enum": [
        "team",
        "department"
      ],
      "description": "Whether this config is for teams or departments"
    },
    "grid_cols": {
      "type": "number",
      "default": 6,
      "description": "Number of columns in the grid"
    },
    "grid_rows": {
      "type": "number",
      "default": 5,
      "description": "Number of rows in the grid"
    },
    "positions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "group_id": {
            "type": "string"
          },
          "group_name": {
            "type": "string"
          },
          "position_x": {
            "type": "number"
          },
          "position_y": {
            "type": "number"
          }
        }
      },
      "description": "Array of group positions in the chart"
    },
    "is_active": {
      "type": "boolean",
      "default": false,
      "description": "Whether this is the currently active configuration"
    },
    "saved_at": {
      "type": "string",
      "format": "date-time",
      "description": "When this configuration was saved"
    }
  },
  "required": [
    "view_mode",
    "positions"
  ]
}