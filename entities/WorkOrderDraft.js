{
  "name": "WorkOrderDraft",
  "type": "object",
  "properties": {
    "user_id": {
      "type": "string",
      "description": "ID of the user who created this draft"
    },
    "original_work_order_id": {
      "type": "string",
      "description": "ID of the original work order if editing, null if creating new"
    },
    "draft_data": {
      "type": "object",
      "additionalProperties": true,
      "description": "JSON object containing all the work order form data"
    },
    "last_saved_at": {
      "type": "string",
      "format": "date-time",
      "description": "When the draft was last auto-saved"
    }
  },
  "required": [
    "user_id",
    "draft_data"
  ]
}