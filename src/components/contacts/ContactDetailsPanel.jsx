import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contact } from '@/entities/all';
import { X, Save, Trash2, Phone, MapPin, FileDown, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '../Avatar';
import { format } from 'date-fns';
import LocationPickerMap from '../maps/LocationPickerMap';
import { base44 } from '@/api/base44Client';

export default function ContactDetailsPanel({ contact, categories, onClose, onSave, currentUser }) {
  const [formData, setFormData] = useState(contact);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isNew = !contact.id;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addActivityLog = (action, details) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      user_email: currentUser?.email || 'unknown',
      user_name: currentUser?.full_name || currentUser?.email || 'Unknown User',
      details
    };

    const currentLog = formData.activity_log || [];
    return [...currentLog, logEntry];
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Contact name is required');
      return;
    }

    setSaving(true);
    try {
      const activityLog = isNew
        ? addActivityLog('created', 'Contact created')
        : addActivityLog('updated', 'Contact details updated');

      const dataToSave = {
        ...formData,
        activity_log: activityLog
      };

      if (isNew) {
        await Contact.create(dataToSave);
        toast.success('Contact created successfully');
      } else {
        await Contact.update(contact.id, dataToSave);
        toast.success('Contact updated successfully');
      }

      onSave();
    } catch (error) {
      console.error('Failed to save contact:', error);
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await Contact.delete(contact.id);
      toast.success('Contact deleted successfully');
      onClose();
      onSave();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      if (error.response?.status === 404) {
        toast.error('Contact no longer exists');
        onClose();
        onSave();
      } else {
        toast.error('Failed to delete contact');
      }
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('avatar_url', file_url);
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const category = categories.find(c => c.id === formData.category_id);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${formData.name} - Contact Card</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              color: #1e293b;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #6366f1;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              color: #6366f1;
              font-size: 32px;
            }
            .header p {
              margin: 5px 0 0 0;
              color: #64748b;
              font-size: 14px;
            }
            .section {
              margin: 25px 0;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #475569;
              margin-bottom: 12px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 5px;
            }
            .field {
              display: flex;
              margin: 10px 0;
              padding: 8px 0;
            }
            .field-label {
              font-weight: 500;
              color: #64748b;
              width: 150px;
              flex-shrink: 0;
            }
            .field-value {
              color: #1e293b;
            }
            .category-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Contact Information</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Basic Information</div>
            <div class="field">
              <div class="field-label">Name:</div>
              <div class="field-value"><strong>${formData.name || 'N/A'}</strong></div>
            </div>
            ${formData.company ? `
            <div class="field">
              <div class="field-label">Company:</div>
              <div class="field-value">${formData.company}</div>
            </div>` : ''}
            ${formData.job_title ? `
            <div class="field">
              <div class="field-label">Job Title:</div>
              <div class="field-value">${formData.job_title}</div>
            </div>` : ''}
            ${category ? `
            <div class="field">
              <div class="field-label">Category:</div>
              <div class="field-value">
                <span class="category-badge" style="background-color: #e0e7ff; color: #4338ca;">
                  ${category.name}
                </span>
              </div>
            </div>` : ''}
            ${formData.description ? `
            <div class="field">
              <div class="field-label">Description:</div>
              <div class="field-value">${formData.description}</div>
            </div>` : ''}
          </div>

          <div class="section">
            <div class="section-title">Contact Information</div>
            ${formData.phone ? `
            <div class="field">
              <div class="field-label">Primary Phone:</div>
              <div class="field-value">${formData.phone}</div>
            </div>` : ''}
            ${formData.phone_secondary ? `
            <div class="field">
              <div class="field-label">Secondary Phone:</div>
              <div class="field-value">${formData.phone_secondary}</div>
            </div>` : ''}
            ${formData.email ? `
            <div class="field">
              <div class="field-label">Email:</div>
              <div class="field-value">${formData.email}</div>
            </div>` : ''}
          </div>

          ${formData.location_name || formData.address ? `
          <div class="section">
            <div class="section-title">Location</div>
            ${formData.location_name ? `
            <div class="field">
              <div class="field-label">Location Name:</div>
              <div class="field-value">${formData.location_name}</div>
            </div>` : ''}
            ${formData.address ? `
            <div class="field">
              <div class="field-label">Address:</div>
              <div class="field-value">${formData.address}</div>
            </div>` : ''}
          </div>` : ''}

          ${formData.notes ? `
          <div class="section">
            <div class="section-title">Additional Notes</div>
            <div class="field">
              <div class="field-value">${formData.notes.replace(/\n/g, '<br>')}</div>
            </div>
          </div>` : ''}

          <div class="footer">
            This contact card was generated from the Contacts Directory
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleLocationSelected = (location) => {
    handleChange('latitude', location.lat);
    handleChange('longitude', location.lng);
    handleChange('address', location.address);
    handleChange('location_name', location.name);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col overflow-hidden border-l border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isNew ? 'New Contact' : 'Contact Details'}
              </h2>
              <p className="text-sm text-slate-600">
                {isNew ? 'Add a new contact to the directory' : 'View and edit contact information'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportPDF}
                  title="Export as PDF"
                >
                  <FileDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDelete}
                  className="text-red-600 hover:bg-red-50"
                  title="Delete contact"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-lg">
          <Avatar
            name={formData.name || 'New Contact'}
            imageUrl={formData.avatar_url}
            size="xl"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('avatar-upload').click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
            </Button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4" />
            Basic Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title || ''}
                onChange={(e) => handleChange('job_title', e.target.value)}
                placeholder="Manager"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id || ''}
                onValueChange={(value) => handleChange('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category">
                    {formData.category_id ? categories.find(c => c.id === formData.category_id)?.name : "Select a category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent 
                  className="max-h-[300px] overflow-y-scroll z-[99999]"
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                >
                  <SelectItem value={null}>No category</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="e.g., Building security guard, Emergency plumber, Main supplier..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Primary Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <Label htmlFor="phone_secondary">Secondary Phone</Label>
              <Input
                id="phone_secondary"
                value={formData.phone_secondary || ''}
                onChange={(e) => handleChange('phone_secondary', e.target.value)}
                placeholder="+1 234 567 8901"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </h3>

          <div className="space-y-3">
            <div>
              <Label htmlFor="location_name">Location Name</Label>
              <Input
                id="location_name"
                value={formData.location_name || ''}
                onChange={(e) => handleChange('location_name', e.target.value)}
                placeholder="Main Office, Workshop, etc."
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main St, City, Country"
              />
            </div>

            {formData.latitude && formData.longitude && (
              <div className="h-48 rounded-lg overflow-hidden border border-slate-200">
                <LocationPickerMap
                  initialLocation={{
                    lat: formData.latitude,
                    lng: formData.longitude
                  }}
                  onLocationSelected={handleLocationSelected}
                />
              </div>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Additional Notes</h3>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any additional information..."
            rows={4}
          />
        </div>

        {/* Activity Log */}
        {!isNew && formData.activity_log && formData.activity_log.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Activity Log
            </h3>
            <div className="bg-slate-50 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
              {formData.activity_log.slice().reverse().map((log, index) => (
                <div key={index} className="text-xs border-b border-slate-200 pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{log.user_name}</span>
                    <span className="text-slate-500">
                      {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1">
                    <span className="capitalize font-medium">{log.action}</span>
                    {log.details && ` - ${log.details}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isNew ? 'Create Contact' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}