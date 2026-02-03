{
  "name": "QuickReportSettings",
  "type": "object",
  "properties": {
    "template_name": {
      "type": "string",
      "description": "Name of the quick report template"
    },
    "description": {
      "type": "string",
      "description": "Optional description for this template"
    },
    "is_default": {
      "type": "boolean",
      "default": false,
      "description": "Whether this template is the default one"
    },
    "branch_id": {
      "type": "string",
      "description": "Optional company/branch scope"
    },
    "header_title": {
      "type": "string",
      "description": "Header title shown at the top of the report"
    },
    "header_subtitle": {
      "type": "string",
      "description": "Header subtitle below the title"
    },
    "header_logo_url": {
      "type": "string",
      "description": "Logo URL to show at the header (optional)"
    },
    "metrics": {
      "type": "array",
      "description": "Top metrics (quantities)",
      "items": {
        "type": "object",
        "properties": {
          "label": {
            "type": "string"
          },
          "key": {
            "type": "string",
            "description": "Data key placeholder (e.g., total_work_orders)"
          }
        },
        "required": [
          "label",
          "key"
        ]
      },
      "default": []
    },
    "details": {
      "type": "array",
      "description": "Header details (key/value placeholders)",
      "items": {
        "type": "object",
        "properties": {
          "label": {
            "type": "string"
          },
          "key": {
            "type": "string",
            "description": "Data key placeholder (e.g., date_range)"
          }
        },
        "required": [
          "label",
          "key"
        ]
      },
      "default": []
    },
    "list_columns": {
      "type": "array",
      "description": "Columns for bottom list section",
      "items": {
        "type": "object",
        "properties": {
          "label": {
            "type": "string"
          },
          "key": {
            "type": "string",
            "description": "Data field key"
          },
          "width": {
            "type": "number",
            "default": 120,
            "description": "Column width suggestion (px)"
          }
        },
        "required": [
          "label",
          "key"
        ]
      },
      "default": []
    }
  },
  "required": [
    "template_name"
  ]
}