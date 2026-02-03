{
  "name": "TimesheetsSettings",
  "type": "object",
  "properties": {
    "categories": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Custom categories for timesheets classification"
    },
    "statuses": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Custom status options for timesheets approval workflow"
    },
    "document_types": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Document types relevant to timesheets reports"
    },
    "tab_icons": {
      "type": "object",
      "properties": {
        "timesheets_icon_url": {
          "type": "string"
        },
        "timesheets_settings_icon_url": {
          "type": "string"
        }
      },
      "description": "Custom icons for Timesheets tabs"
    },
    "fields": {
      "type": "array",
      "description": "Additional columns available for Timesheets table header",
      "items": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string"
          },
          "label": {
            "type": "string"
          },
          "default_visible": {
            "type": "boolean",
            "default": true
          }
        },
        "required": [
          "key",
          "label"
        ]
      }
    }
  },
  "required": []
}