{
  "name": "WorkingReportCounter",
  "type": "object",
  "properties": {
    "branch_id": {
      "type": "string",
      "description": "ID de la sucursal/empresa (branch) para el contador"
    },
    "year": {
      "type": "string",
      "description": "A\u00f1o de la secuencia (YYYY)"
    },
    "last_number": {
      "type": "number",
      "default": 0,
      "description": "\u00daltimo n\u00famero asignado para este branch y a\u00f1o"
    }
  },
  "required": [
    "branch_id",
    "year"
  ]
}