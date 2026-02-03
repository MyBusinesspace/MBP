{
  "name": "UserInvitation",
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "description": "Email address of the invited user"
    },
    "first_name": {
      "type": "string",
      "description": "First name of the invited user"
    },
    "last_name": {
      "type": "string",
      "description": "Last name of the invited user"
    },
    "job_role": {
      "type": "string",
      "description": "Job role of the invited user"
    },
    "invited_role": {
      "type": "string",
      "enum": [
        "user",
        "admin"
      ],
      "default": "user",
      "description": "Role the user will have when they join"
    },
    "status": {
      "type": "string",
      "enum": [
        "sent",
        "activated",
        "expired"
      ],
      "default": "sent",
      "description": "Status of the invitation"
    },
    "invitation_token": {
      "type": "string",
      "description": "Unique token for the invitation"
    },
    "invited_by": {
      "type": "string",
      "description": "Email of the admin who sent the invitation"
    },
    "expires_at": {
      "type": "string",
      "format": "date-time",
      "description": "When the invitation expires"
    }
  },
  "required": [
    "email",
    "invited_role"
  ]
}