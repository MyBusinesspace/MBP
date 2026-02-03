{
  "name": "Department",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the department (e.g., 'HR', 'Sales', 'Technical', 'Admin')"
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
      "default": "blue",
      "description": "Color theme for the department"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the department"
    },
    "employee_number_prefix": {
      "type": "string",
      "description": "Prefix for employee numbers in this department (e.g., 'OP', 'HR', 'FIN')",
      "maxLength": 10
    },
    "next_serial": {
      "type": "number",
      "default": 1,
      "description": "Next available serial number for this department"
    },
    "serial_digits": {
      "type": "number",
      "default": 4,
      "description": "Number of digits for serial numbers (e.g., 4 = 0001)"
    },
    "sub_header": {
      "type": "string",
      "description": "Optional sub-header for employee numbers (e.g., year, branch code)"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this department should appear"
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
    "parent_department_id": {
      "type": "string",
      "description": "ID of parent department for hierarchical structure"
    },
    "work_location_type": {
      "type": "string",
      "enum": [
        "field",
        "office",
        "mixed"
      ],
      "default": "mixed",
      "description": "Primary work location type for this department: field (on-site), office, or mixed"
    }
  },
  "required": [
    "name"
  ]
}