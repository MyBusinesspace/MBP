{
  "name": "WorkingOrder",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "T\u00edtulo o nombre de la orden de trabajo"
    },
    "description": {
      "type": "string",
      "description": "Descripci\u00f3n general e instrucciones"
    },
    "project_id": {
      "type": "string"
    },
    "customer_id": {
      "type": "string"
    },
    "branch_id": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "open",
        "closed"
      ],
      "default": "open",
      "description": "Estado manual de la WO"
    },
    "notes": {
      "type": "string"
    },
    "category_id": {
      "type": "string",
      "description": "Categor\u00eda opcional de la WO"
    }
  },
  "required": [
    "name",
    "project_id",
    "branch_id"
  ]
}