{
  "name": "LeaveRequest",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "ID del usuario que solicita la baja"
    },
    "request_type": {
      "type": "string",
      "enum": [
        "sick_leave",
        "unjustified_leave",
        "holiday",
        "day_off",
        "personal_leave",
        "other"
      ],
      "default": "holiday",
      "description": "Tipo de solicitud de baja"
    },
    "start_date": {
      "type": "string",
      "format": "date",
      "description": "Fecha de inicio de la baja"
    },
    "end_date": {
      "type": "string",
      "format": "date",
      "description": "Fecha de fin de la baja"
    },
    "reason": {
      "type": "string",
      "description": "Raz\u00f3n o justificaci\u00f3n de la solicitud"
    },
    "notes": {
      "type": "string",
      "description": "Notas adicionales de la solicitud"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "approved",
        "rejected",
        "cancelled"
      ],
      "default": "pending",
      "description": "Estado actual de la solicitud"
    },
    "approver_id": {
      "type": "string",
      "description": "ID del usuario que aprueba o rechaza la solicitud"
    },
    "approval_date": {
      "type": "string",
      "format": "date-time",
      "description": "Fecha de aprobaci\u00f3n o rechazo"
    },
    "approval_notes": {
      "type": "string",
      "description": "Notas del aprobador sobre la decisi\u00f3n"
    },
    "attachment_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "URLs de documentos adjuntos (legacy, usar attachments)"
    },
    "attachments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        }
      },
      "description": "Documentos adjuntos con nombre personalizado"
    },
    "calendar_event_id": {
      "type": "string",
      "description": "ID del evento de calendario asociado si es aprobado"
    },
    "total_days": {
      "type": "number",
      "description": "Total de d\u00edas solicitados (calculado autom\u00e1ticamente)"
    },
    "paid_days": {
      "type": "number",
      "default": 0,
      "description": "N\u00famero de d\u00edas pagados dentro de la solicitud"
    },
    "unpaid_days": {
      "type": "number",
      "default": 0,
      "description": "N\u00famero de d\u00edas no pagados dentro de la solicitud"
    },
    "team_at_leave_start_id": {
      "type": "string",
      "description": "ID del equipo al que pertenec\u00eda el empleado antes de iniciar la baja"
    }
  },
  "required": [
    "employee_id",
    "request_type",
    "start_date",
    "end_date",
    "reason"
  ]
}