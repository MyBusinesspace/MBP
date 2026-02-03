{
  "name": "FormSubmission",
  "type": "object",
  "properties": {
    "form_type": {
      "type": "string",
      "description": "The type of form being submitted (e.g., 'leave_request', 'vacation_request', 'work_report').",
      "enum": [
        "leave_request",
        "vacation_request",
        "work_report"
      ]
    },
    "employee_id": {
      "type": "string",
      "description": "The ID of the user who submitted the form."
    },
    "status": {
      "type": "string",
      "enum": [
        "Pending",
        "Approved",
        "Rejected"
      ],
      "default": "Pending",
      "description": "The current status of the submission."
    },
    "data": {
      "type": "object",
      "additionalProperties": true,
      "description": "A JSON object containing the specific answers from the form."
    },
    "notes": {
      "type": "string",
      "description": "Optional notes from an admin regarding the submission."
    }
  },
  "required": [
    "form_type",
    "employee_id",
    "data"
  ]
}