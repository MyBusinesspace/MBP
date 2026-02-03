{
  "name": "PettyCashEntry",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "ID of the employee this entry belongs to"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Date of the transaction"
    },
    "type": {
      "type": "string",
      "enum": [
        "expense",
        "input"
      ],
      "description": "Type of transaction: expense (money out) or input (money in)"
    },
    "category_id": {
      "type": "string",
      "description": "ID of the petty cash category"
    },
    "provider_detail": {
      "type": "string",
      "description": "Detail of provider or concept of the transaction"
    },
    "note_number": {
      "type": "string",
      "description": "Number of the expense note/receipt"
    },
    "text_note": {
      "type": "string",
      "description": "Additional text notes about the transaction"
    },
    "amount": {
      "type": "number",
      "description": "Amount of the transaction (positive for input, negative for expense from employee perspective)"
    },
    "document_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "URLs of documents/receipts attached to this transaction"
    },
    "balance_after_transaction": {
      "type": "number",
      "description": "Balance after this transaction was applied"
    }
  },
  "required": [
    "employee_id",
    "date",
    "type",
    "amount"
  ]
}