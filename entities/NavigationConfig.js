{
  "name": "NavigationConfig",
  "type": "object",
  "properties": {
    "sections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string"
          },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "icon": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                },
                "adminOnly": {
                  "type": "boolean",
                  "default": false
                }
              }
            }
          }
        }
      },
      "description": "Array of navigation sections with their items"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "Whether this configuration is currently active"
    },
    "version": {
      "type": "number",
      "default": 1,
      "description": "Version number for tracking configuration changes"
    }
  },
  "required": [
    "sections"
  ]
}