{
  "name": "PayStub",
  "type": "object",
  "properties": {
    "payroll_run_id": {
      "type": "string"
    },
    "employee_id": {
      "type": "string"
    },
    "gross_pay": {
      "type": "number"
    },
    "deductions": {
      "type": "number"
    },
    "net_pay": {
      "type": "number"
    },
    "pay_method": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "Pending",
        "Paid",
        "Failed"
      ],
      "default": "Pending"
    },
    "data_snapshot": {
      "type": "object",
      "additionalProperties": true,
      "description": "JSON object with detailed breakdown of earnings, deductions, etc."
    }
  },
  "required": [
    "payroll_run_id",
    "employee_id",
    "gross_pay",
    "net_pay"
  ]
}