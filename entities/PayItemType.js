{
  "name": "PayItemType",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the pay item type (e.g., 'Salary', 'Overtime', 'Health Insurance')"
    },
    "category": {
      "type": "string",
      "enum": [
        "Earnings",
        "Deductions",
        "Employer Contributions",
        "Reimbursements"
      ],
      "default": "Earnings",
      "description": "Main category of the pay item type"
    },
    "sub_category": {
      "type": "string",
      "description": "Sub-category within the main category (e.g., 'Base Pay', 'Variable Pay', 'Allowances')"
    },
    "accounting_code": {
      "type": "string",
      "description": "Accounting code or account for this pay item type"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the pay item type"
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
        "pink",
        "orange",
        "teal"
      ],
      "default": "blue",
      "description": "Color theme for the pay item type"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this pay item type should appear"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "Whether this pay item type is currently active"
    },
    "is_default": {
      "type": "boolean",
      "default": false,
      "description": "Whether this is a default system pay item type"
    }
  },
  "required": [
    "name",
    "category"
  ]
}