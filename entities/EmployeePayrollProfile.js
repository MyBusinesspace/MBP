{
  "name": "EmployeePayrollProfile",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "Links to the User entity ID"
    },
    "monthly_basic_salary": {
      "type": "number",
      "description": "Monthly basic salary - all other values are calculated from this"
    },
    "annual_salary": {
      "type": "number",
      "description": "Calculated as monthly_basic_salary \u00d7 12"
    },
    "ordinary_hourly_rate": {
      "type": "number",
      "description": "Calculated as annual_salary \u00f7 2080 hours (used for overtime calculations)"
    },
    "overtime_hourly_rate": {
      "type": "number",
      "description": "Calculated as ordinary_hourly_rate \u00d7 overtime_multiplier from settings"
    },
    "standard_working_hours_per_day": {
      "type": "number",
      "default": 8,
      "description": "Standard working hours per day for this employee"
    },
    "standard_working_days_per_month": {
      "type": "number",
      "default": 22,
      "description": "Standard working days per month"
    },
    "salary_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "pay_item_id": {
            "type": "string",
            "description": "Reference to PayItem entity"
          },
          "pay_item_name": {
            "type": "string",
            "description": "Name of the pay item for display"
          },
          "category": {
            "type": "string",
            "enum": [
              "Earnings",
              "Deductions",
              "Employer Contributions",
              "Reimbursements"
            ],
            "description": "Category of the pay item"
          },
          "amount": {
            "type": "number",
            "description": "Fixed amount for this item"
          },
          "calculation_type": {
            "type": "string",
            "enum": [
              "fixed",
              "per_hour",
              "per_day",
              "percentage"
            ],
            "default": "fixed"
          },
          "is_active": {
            "type": "boolean",
            "default": true
          }
        }
      },
      "description": "Array of salary items (earnings, deductions, allowances) for this employee"
    },
    "leave_tracking_enabled": {
      "type": "boolean",
      "default": true,
      "description": "Whether to auto-calculate days worked from leave requests"
    },
    "overtime_tracking_enabled": {
      "type": "boolean",
      "default": true,
      "description": "Whether to auto-calculate overtime from time tracker"
    },
    "payment_method": {
      "type": "string",
      "enum": [
        "Direct Deposit",
        "Check",
        "Cash",
        "Bank Transfer"
      ],
      "default": "Direct Deposit"
    },
    "bank_name": {
      "type": "string"
    },
    "routing_number": {
      "type": "string"
    },
    "account_number": {
      "type": "string"
    },
    "iban": {
      "type": "string",
      "description": "International Bank Account Number"
    },
    "swift_code": {
      "type": "string",
      "description": "SWIFT/BIC code for international transfers"
    },
    "tax_filing_status": {
      "type": "string"
    },
    "tax_allowances": {
      "type": "number"
    },
    "change_history": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "change_type": {
            "type": "string",
            "enum": [
              "Created",
              "Edited",
              "Note"
            ]
          },
          "date": {
            "type": "string",
            "format": "date-time"
          },
          "user_email": {
            "type": "string"
          },
          "user_name": {
            "type": "string"
          },
          "details": {
            "type": "string"
          },
          "changes": {
            "type": "object",
            "additionalProperties": true
          }
        }
      },
      "description": "History of changes made to this profile"
    }
  },
  "required": [
    "employee_id",
    "monthly_basic_salary"
  ]
}