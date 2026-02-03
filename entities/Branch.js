{
  "name": "Branch",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "short_name": {
      "type": "string",
      "description": "Short name for sidebar display"
    },
    "location": {
      "type": "string",
      "description": "Short location name (e.g. Dubai)"
    },
    "address": {
      "type": "string",
      "description": "Full physical address"
    },
    "phone": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "website": {
      "type": "string"
    },
    "tax_number": {
      "type": "string",
      "description": "TRN / VAT Number"
    },
    "logo_url": {
      "type": "string",
      "description": "URL of the main company logo"
    },
    "logo_forms_url": {
      "type": "string",
      "description": "URL of the company logo optimized for forms/reports"
    },
    "logo_collapsed_url": {
      "type": "string",
      "description": "URL of the company logo optimized for collapsed sidebar"
    },
    "assets_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Our Assets tab"
    },
    "equipment_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Client Equipment tab"
    },
    "documents_assets_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Documents & Assets sidebar tab"
    },
    "clients_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Clients tab"
    },
    "projects_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Projects tab"
    },
    "schedule_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Schedule/Work Orders tab"
    },
    "time_tracker_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Time Tracker tab"
    },
    "chat_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Chat tab"
    },
    "calendar_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Calendar tab"
    },
    "contacts_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Contacts tab"
    },
    "quick_tasks_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Quick Tasks tab"
    },
    "users_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Users tab"
    },
    "payroll_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Payroll tab"
    },
    "orders_tab_icon_url": {
      "type": "string",
      "description": "Custom icon URL for Orders tab"
    },
    "manager_ids": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "color": {
      "type": "string",
      "enum": [
        "gray",
        "red",
        "yellow",
        "green",
        "blue",
        "indigo",
        "purple",
        "pink",
        "orange",
        "teal"
      ],
      "default": "blue"
    },
    "is_active": {
      "type": "boolean",
      "default": true
    },
    "settings": {
      "type": "object",
      "additionalProperties": true
    },
    "sort_order": {
      "type": "number",
      "default": 0
    },
    "form_settings": {
      "type": "object",
      "description": "Customization settings for PDF forms (Working Report & Summary Report)",
      "properties": {
        "primary_color": {
          "type": "string",
          "description": "Primary brand color in hex format (e.g. #DC2626)"
        },
        "secondary_color": {
          "type": "string",
          "description": "Secondary/accent color in hex format"
        },
        "header_background_color": {
          "type": "string",
          "description": "Background color for headers"
        },
        "working_report": {
          "type": "object",
          "properties": {
            "show_company_name": {
              "type": "boolean",
              "default": true
            },
            "show_phone": {
              "type": "boolean",
              "default": true
            },
            "show_email": {
              "type": "boolean",
              "default": true
            },
            "show_tax_number": {
              "type": "boolean",
              "default": true
            },
            "show_logo": {
              "type": "boolean",
              "default": true
            },
            "show_wo_number": {
              "type": "boolean",
              "default": true
            },
            "show_category": {
              "type": "boolean",
              "default": true
            },
            "show_asset_details": {
              "type": "boolean",
              "default": true
            },
            "show_instructions": {
              "type": "boolean",
              "default": true
            },
            "show_work_done": {
              "type": "boolean",
              "default": true
            },
            "show_spare_parts": {
              "type": "boolean",
              "default": true
            },
            "show_notes": {
              "type": "boolean",
              "default": true
            },
            "show_signatures": {
              "type": "boolean",
              "default": true
            },
            "custom_title": {
              "type": "string",
              "description": "Custom report title"
            },
            "custom_footer_text": {
              "type": "string",
              "description": "Custom footer text"
            }
          }
        },
        "summary_report": {
          "type": "object",
          "properties": {
            "show_company_name": {
              "type": "boolean",
              "default": true
            },
            "show_phone": {
              "type": "boolean",
              "default": true
            },
            "show_email": {
              "type": "boolean",
              "default": true
            },
            "show_tax_number": {
              "type": "boolean",
              "default": true
            },
            "show_logo": {
              "type": "boolean",
              "default": true
            },
            "show_filters_applied": {
              "type": "boolean",
              "default": true
            },
            "show_statistics": {
              "type": "boolean",
              "default": true
            },
            "show_project": {
              "type": "boolean",
              "default": true
            },
            "show_customer": {
              "type": "boolean",
              "default": true
            },
            "show_category": {
              "type": "boolean",
              "default": true
            },
            "show_assigned_users": {
              "type": "boolean",
              "default": true
            },
            "show_time_details": {
              "type": "boolean",
              "default": true
            },
            "show_notes": {
              "type": "boolean",
              "default": true
            },
            "show_contact_person": {
              "type": "boolean",
              "default": false
            },
            "custom_title": {
              "type": "string",
              "description": "Custom report title"
            },
            "custom_footer_text": {
              "type": "string",
              "description": "Custom footer text"
            }
          }
        }
      }
    },
    "payslip_report": {
      "type": "object",
      "description": "Customization settings for Payslip PDF",
      "properties": {
        "show_company_name": {
          "type": "boolean",
          "default": true
        },
        "show_company_address": {
          "type": "boolean",
          "default": true
        },
        "show_company_phone": {
          "type": "boolean",
          "default": true
        },
        "show_company_email": {
          "type": "boolean",
          "default": true
        },
        "show_tax_number": {
          "type": "boolean",
          "default": true
        },
        "show_logo": {
          "type": "boolean",
          "default": true
        },
        "show_employee_id": {
          "type": "boolean",
          "default": true
        },
        "show_employee_position": {
          "type": "boolean",
          "default": true
        },
        "show_employee_email": {
          "type": "boolean",
          "default": true
        },
        "show_hours_worked": {
          "type": "boolean",
          "default": true
        },
        "show_overtime_details": {
          "type": "boolean",
          "default": true
        },
        "show_earnings_breakdown": {
          "type": "boolean",
          "default": true
        },
        "show_deductions_breakdown": {
          "type": "boolean",
          "default": true
        },
        "show_bank_details": {
          "type": "boolean",
          "default": false
        },
        "show_tax_breakdown": {
          "type": "boolean",
          "default": true
        },
        "custom_title": {
          "type": "string",
          "description": "Custom payslip title (default: PAY SLIP)"
        },
        "custom_footer_text": {
          "type": "string",
          "description": "Custom footer text"
        },
        "currency": {
          "type": "string",
          "default": "AED"
        },
        "currency_symbol": {
          "type": "string",
          "default": ""
        }
      }
    }
  },
  "required": [
    "name"
  ]
}