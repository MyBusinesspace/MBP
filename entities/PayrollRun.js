{
  "name": "PayrollRun",
  "type": "object",
  "properties": {
    "payrun_number": {
      "type": "string",
      "description": "Unique payrun number (e.g., PR-01, PR-02)"
    },
    "title": {
      "type": "string",
      "description": "Custom title for the payroll run"
    },
    "period_start_date": {
      "type": "string",
      "format": "date"
    },
    "period_end_date": {
      "type": "string",
      "format": "date"
    },
    "pay_date": {
      "type": "string",
      "format": "date"
    },
    "status": {
      "type": "string",
      "enum": [
        "Draft",
        "Processing",
        "Needs Attention",
        "Paid"
      ],
      "default": "Draft"
    },
    "branch_id": {
      "type": "string",
      "description": "ID of the branch (company) this payroll run belongs to"
    },
    "total_payroll_cost": {
      "type": "number",
      "description": "Total net payroll cost (after deductions)"
    },
    "total_gross_pay": {
      "type": "number",
      "description": "Total gross pay before deductions"
    },
    "total_deductions": {
      "type": "number",
      "description": "Total deductions amount"
    },
    "employee_payments": {
      "type": "number",
      "description": "Total amount for employee payments"
    },
    "other_payments": {
      "type": "number",
      "default": 0,
      "description": "Total amount for other payments (bonuses, reimbursements, etc.)"
    },
    "other_payments_details": {
      "type": "array",
      "default": [],
      "items": {
        "type": "object",
        "properties": {
          "recipient": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          },
          "amount": {
            "type": "number"
          }
        }
      },
      "description": "Detailed list of other payments with recipient, reason, and amount"
    },
    "employee_count": {
      "type": "number",
      "description": "Number of employees in this payroll run"
    },
    "period_timesheets": {
      "type": "number",
      "description": "Number of timesheets processed in this period"
    },
    "employee_payments_snapshot": {
      "type": "array",
      "items": {
        "type": "object"
      },
      "description": "Snapshot of employee payment details for this run"
    }
  },
  "required": [
    "period_start_date",
    "period_end_date",
    "status"
  ]
}