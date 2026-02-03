{
  "name": "WorkOrderCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the work order category (e.g., 'Installation', 'Maintenance', 'Inspection', 'Emergency Repair')"
    },
    "color": {
      "type": "string",
      "enum": [
        "white",
        "gray",
        "red",
        "yellow",
        "green",
        "blue",
        "indigo",
        "purple",
        "pink",
        "orange",
        "teal"
      ],
      "default": "white",
      "description": "Background color for work orders in this category"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the work order category"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this category should appear"
    },
    "branch_id": {
      "type": "string",
      "description": "ID of the branch (company) this category belongs to"
    }
  },
  "required": [
    "name"
  ]
}