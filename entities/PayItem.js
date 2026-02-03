{
  "name": "PayItem",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the pay item (e.g., 'Basic Salary', 'Housing Allowance', 'Health Insurance')"
    },
    "pay_item_type_id": {
      "type": "string",
      "description": "ID of the PayItemType this item belongs to"
    },
    "paid_to": {
      "type": "string",
      "enum": [
        "Employee",
        "Employer",
        "Tax Authority",
        "Pension Fund",
        "Insurance Provider",
        "Other"
      ],
      "default": "Employee",
      "description": "Who receives this payment"
    },
    "description": {
      "type": "string",
      "description": "Detailed description of the pay item"
    },
    "default_amount": {
      "type": "number",
      "default": 0,
      "description": "Default amount for this pay item (0 if calculated)"
    },
    "is_taxable": {
      "type": "boolean",
      "default": true,
      "description": "Whether this pay item is taxable"
    },
    "show_on_payslip": {
      "type": "boolean",
      "default": true,
      "description": "Whether to show this item on the payslip"
    },
    "calculation_type": {
      "type": "string",
      "enum": [
        "fixed",
        "percentage",
        "hourly_rate",
        "calculated"
      ],
      "default": "fixed",
      "description": "How this pay item is calculated"
    },
    "calculation_base": {
      "type": "string",
      "description": "What this percentage/calculation is based on (e.g., 'gross_pay', 'basic_salary')"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "Whether this pay item is currently active"
    },
    "sort_order": {
      "type": "number",
      "default": 0,
      "description": "Order in which this pay item should appear"
    }
  },
  "required": [
    "name",
    "pay_item_type_id"
  ]
}