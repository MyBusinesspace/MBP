{
  "name": "Team",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "avatar_code": {
      "type": "string",
      "description": "Short code or initials for team avatar (e.g., 'S1', 'OP', 'MNT')",
      "maxLength": 3
    },
    "avatar_url": {
      "type": "string",
      "description": "URL for the team's avatar image"
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
        "pink"
      ],
      "default": "gray"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which teams should be displayed"
    },
    "chart_position_x": {
      "type": "number",
      "default": 0,
      "description": "Horizontal position in organization chart (0-based grid)"
    },
    "chart_position_y": {
      "type": "number",
      "default": 0,
      "description": "Vertical position in organization chart (0-based grid)"
    },
    "parent_team_id": {
      "type": "string",
      "description": "ID of parent team for hierarchical structure"
    },
    "default_project_id": {
      "type": "string",
      "description": "Default project ID for this team (optional, for display purposes)"
    },
    "work_location_type": {
      "type": "string",
      "enum": [
        "field",
        "office"
      ],
      "default": "field",
      "description": "Work location type: field team (on-site) or office team"
    },
    "team_leader_id": {
      "type": "string",
      "description": "ID of the user who is the team leader"
    }
  },
  "required": [
    "name"
  ]
}