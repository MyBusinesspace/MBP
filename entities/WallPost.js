{
  "name": "WallPost",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "T\u00edtulo de la publicaci\u00f3n"
    },
    "content": {
      "type": "string",
      "description": "Texto principal de la publicaci\u00f3n"
    },
    "media_items": {
      "type": "array",
      "description": "Lista de medios adjuntos (im\u00e1genes o videos)",
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": [
              "image",
              "video"
            ]
          }
        },
        "required": [
          "url",
          "type"
        ]
      }
    },
    "likes_user_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Usuarios que han dado like"
    },
    "reactions": {
      "type": "array",
      "description": "Reacciones con emojis por usuario",
      "items": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string"
          },
          "emoji": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    },
    "comments": {
      "type": "array",
      "description": "Comentarios de la publicaci\u00f3n",
      "items": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string"
          },
          "content": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          }
        },
        "required": [
          "user_id",
          "content",
          "timestamp"
        ]
      }
    },
    "is_pinned": {
      "type": "boolean",
      "default": false,
      "description": "Fijado en el muro"
    },
    "pinned_at": {
      "type": "string",
      "format": "date-time",
      "description": "Fecha de fijado"
    },
    "department_id": {
      "type": "string",
      "description": "Departamento asociado (Connections)"
    },
    "created_by_user_id": {
      "type": "string",
      "description": ""
    },
    "visibility": {
      "type": "string",
      "enum": [
        "public",
        "department_only"
      ],
      "default": "department_only"
    }
  },
  "required": [
    "title"
  ]
}