{
  "name": "QuickTaskSettings",
  "type": "object",
  "properties": {
    "permission_mode": {
      "type": "string",
      "enum": [
        "restricted",
        "all"
      ],
      "default": "restricted",
      "description": "restricted: users only see tasks assigned to them or their groups, all: all users can see all tasks"
    }
  },
  "required": [
    "permission_mode"
  ]
}