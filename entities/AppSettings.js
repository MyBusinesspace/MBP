{
  "name": "AppSettings",
  "type": "object",
  "properties": {
    "setting_key": {
      "type": "string",
      "description": "Unique key for the setting (e.g., 'gps_tracking_enabled', 'photo_required_clock_out', 'work_orders_timezone')"
    },
    "setting_value": {
      "type": "string",
      "description": "Value of the setting (stored as string, parse as needed)"
    },
    "setting_type": {
      "type": "string",
      "enum": [
        "boolean",
        "number",
        "string"
      ],
      "default": "boolean",
      "description": "Type of the setting value"
    },
    "description": {
      "type": "string",
      "description": "Human-readable description of what this setting does"
    }
  },
  "required": [
    "setting_key",
    "setting_value"
  ]
}