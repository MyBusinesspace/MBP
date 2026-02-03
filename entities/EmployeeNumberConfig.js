{
  "name": "EmployeeNumberConfig",
  "type": "object",
  "properties": {
    "header": {
      "type": "string",
      "description": "Main header for employee number (e.g., 'EMP', 'USR')"
    },
    "sub_header": {
      "type": "string",
      "description": "Sub-header for employee number (e.g., department code, year)"
    },
    "next_serial": {
      "type": "number",
      "default": 1,
      "description": "Next available serial number"
    },
    "serial_digits": {
      "type": "number",
      "default": 4,
      "description": "Number of digits for serial (e.g., 4 = 0001)"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "Whether this configuration is currently active"
    }
  },
  "required": [
    "header"
  ]
}