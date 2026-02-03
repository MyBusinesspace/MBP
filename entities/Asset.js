{
  "name": "Asset",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the asset (e.g., Ford Transit Van, Milwaukee M18 Drill)"
    },
    "category": {
      "type": "string",
      "enum": [
        "Vehicle",
        "Tower Crane",
        "Hoist",
        "Hoist Mast Section",
        "Tool",
        "Office Staff"
      ],
      "default": "Tool"
    },
    "subcategory": {
      "type": "string",
      "description": "Subcategory for more detailed classification (e.g., 'Power Tools', 'Hand Tools', 'Laptop', 'Van')"
    },
    "finance_category": {
      "type": "string",
      "description": "Finance category for accounting purposes (e.g., 'Fixed Assets', 'Operational Fixed Assets', 'Current Assets')"
    },
    "quantity": {
      "type": "number",
      "default": 1,
      "description": "Number of units of this asset"
    },
    "brand": {
      "type": "string",
      "description": "Brand/manufacturer of the asset"
    },
    "year_of_manufacture": {
      "type": "string",
      "description": "Year of manufacture (YOM)"
    },
    "mast_type": {
      "type": "string",
      "description": "Type of mast (e.g., MonoB, Telescopic)"
    },
    "height": {
      "type": "string",
      "description": "Height specification (e.g., 1.8m, 2.5m)"
    },
    "status": {
      "type": "string",
      "enum": [
        "Available",
        "In Use",
        "Maintenance",
        "Decommissioned",
        "On Rent"
      ],
      "default": "Available"
    },
    "last_status_change_date": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of the last status change, editable for manual entries"
    },
    "identifier": {
      "type": "string",
      "description": "Unique identifier like a serial number, VIN, or asset tag"
    },
    "plate_number": {
      "type": "string",
      "description": "License plate number for vehicles"
    },
    "assigned_to_user_id": {
      "type": "string",
      "description": "ID of the user the asset is assigned to"
    },
    "project_id": {
      "type": "string",
      "description": "ID of the project the asset is currently associated with"
    },
    "branch_id": {
      "type": "string",
      "description": "ID of the branch (company) this asset belongs to"
    },
    "purchase_date": {
      "type": "string",
      "format": "date"
    },
    "purchase_cost": {
      "type": "number"
    },
    "expiry_date": {
      "type": "string",
      "format": "date",
      "description": "Date when the asset warranty, registration, or lease expires"
    },
    "depreciation_method": {
      "type": "string",
      "enum": [
        "Straight Line",
        "Declining Balance",
        "Double Declining Balance",
        "No Depreciation"
      ],
      "default": "Straight Line",
      "description": "Method used to calculate asset depreciation"
    },
    "useful_life_years": {
      "type": "number",
      "default": 5,
      "description": "Expected useful life of the asset in years"
    },
    "salvage_value": {
      "type": "number",
      "default": 0,
      "description": "Estimated value of the asset at the end of its useful life"
    },
    "current_value": {
      "type": "number",
      "description": "Current depreciated value of the asset (calculated)"
    },
    "accumulated_depreciation": {
      "type": "number",
      "description": "Total depreciation accumulated to date"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes or details about the asset"
    },
    "file_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for photos attached to this asset."
    },
    "document_urls": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of URLs for private documents attached to this asset (Legacy)"
    },
    "attached_documents": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "upload_date": {
            "type": "string"
          },
          "notes": {
            "type": "string"
          }
        }
      },
      "description": "Detailed list of attached documents with metadata"
    },
    "activity_log": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "action": {
            "type": "string",
            "enum": [
              "Created",
              "Edited",
              "Deleted"
            ]
          },
          "user_email": {
            "type": "string"
          },
          "user_name": {
            "type": "string"
          },
          "details": {
            "type": "string"
          },
          "changes": {
            "type": "object",
            "additionalProperties": true
          }
        }
      },
      "description": "Activity log tracking all changes to this asset"
    },
    "custom_fields": {
      "type": "object",
      "additionalProperties": true,
      "description": "Custom fields defined by the company with labels and values"
    }
  },
  "required": [
    "name",
    "category",
    "status"
  ]
}