{
  "name": "TimeReport",
  "type": "object",
  "properties": {
    "order_id": {
      "type": "string",
      "description": "ID of the TimeEntry (Order) this report belongs to"
    },
    "approval_status": {
      "type": "string",
      "enum": [
        "draft",
        "pending",
        "approved",
        "rejected"
      ],
      "default": "draft",
      "description": "Approval state of the report"
    },
    "submitted_for_approval_at": {
      "type": "string",
      "format": "date-time",
      "description": "When the report was submitted for approval"
    },
    "approved_at": {
      "type": "string",
      "format": "date-time",
      "description": "When the report was approved"
    },
    "approved_by_user_id": {
      "type": "string",
      "description": "User ID of the approver"
    },
    "rejection_reason": {
      "type": "string",
      "description": "Reason provided when the report was rejected"
    },
    "client_signed": {
      "type": "boolean",
      "default": false,
      "description": "Whether the client signed the report"
    },
    "client_signature_image_url": {
      "type": "string",
      "description": "URL of the client's signature image (optional)"
    },
    "client_signature_name": {
      "type": "string",
      "description": "Name of the client who signed (optional)"
    },
    "client_signature_date": {
      "type": "string",
      "format": "date-time",
      "description": "When the client signed (optional)"
    }
  },
  "required": [
    "order_id"
  ]
}