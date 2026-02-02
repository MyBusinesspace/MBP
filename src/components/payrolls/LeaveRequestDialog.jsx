import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeaveRequest, PublicHoliday } from '@/entities/all';
import { toast } from 'sonner';
import { differenceInDays, parseISO, eachDayOfInterval, isSunday, format } from 'date-fns';
import { Loader2, Upload, X, Search, FileText, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from '../Avatar';

export default function LeaveRequestDialog({ 
  isOpen, 
  onClose, 
  request, 
  employeeId, 
  users, 
  currentUser,
  onSuccess 
}) {
  console.log('🐛 [LeaveRequestDialog] Render - useMemo available?', typeof useMemo);
  const [formData, setFormData] = useState({
    employee_id: employeeId || currentUser?.id || '',
    request_type: 'holiday',
    start_date: '',
    end_date: '',
    reason: '',
    notes: '',
    paid_days: 0,
    unpaid_days: 0,
    attachments: [] // {url, name}
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [totalDays, setTotalDays] = useState(0);
  const [workingDays, setWorkingDays] = useState(0);
  const [sundayCount, setSundayCount] = useState(0);
  const [holidayCount, setHolidayCount] = useState(0);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // Load public holidays
  useEffect(() => {
    PublicHoliday.list().then(setPublicHolidays).catch(console.error);
  }, []);

  const filteredUsers = useMemo(() => {
    const activeUsers = users.filter(u => !u.archived);
    if (!employeeSearch) return activeUsers;
    const search = employeeSearch.toLowerCase();
    return activeUsers.filter(u => 
      (u.nickname || '').toLowerCase().includes(search) ||
      (u.full_name || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search)
    );
  }, [users, employeeSearch]);

  useEffect(() => {
    if (request) {
      // Migrate old attachment_urls to new attachments format
      let attachments = request.attachments || [];
      if (attachments.length === 0 && request.attachment_urls?.length > 0) {
        attachments = request.attachment_urls.map((url, i) => ({
          url,
          name: `Attachment ${i + 1}`
        }));
      }
      
      setFormData({
        employee_id: request.employee_id,
        request_type: request.request_type || 'holiday',
        start_date: request.start_date,
        end_date: request.end_date,
        reason: request.reason || '',
        notes: request.notes || '',
        paid_days: request.paid_days || 0,
        unpaid_days: request.unpaid_days || 0,
        attachments
      });
    } else {
      setFormData(prev => ({
        ...prev,
        employee_id: employeeId || currentUser?.id || ''
      }));
    }
  }, [request, employeeId, currentUser]);

  // Calcular días automáticamente y ajustar paid/unpaid
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      try {
        const startDate = parseISO(formData.start_date);
        const endDate = parseISO(formData.end_date);
        const days = differenceInDays(endDate, startDate) + 1;
        const newTotalDays = days > 0 ? days : 0;
        setTotalDays(newTotalDays);
        
        // Calculate working days (excluding Sundays and public holidays)
        if (newTotalDays > 0) {
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          const sundays = allDays.filter(d => isSunday(d)).length;
          
          // Check public holidays (exclude those falling on Sundays to avoid double counting)
          const holidayDates = publicHolidays.map(h => h.date);
          const holidays = allDays.filter(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            return holidayDates.includes(dateStr) && !isSunday(d);
          }).length;
          
          setSundayCount(sundays);
          setHolidayCount(holidays);
          setWorkingDays(newTotalDays - sundays - holidays);
        } else {
          setSundayCount(0);
          setHolidayCount(0);
          setWorkingDays(0);
        }
        
        // Si es un nuevo request o si cambió el total de días, auto-asignar todos como paid
        if (!request && (formData.paid_days + formData.unpaid_days !== newTotalDays)) {
          setFormData(prev => ({
            ...prev,
            paid_days: newTotalDays,
            unpaid_days: 0
          }));
        }
      } catch (e) {
        setTotalDays(0);
        setWorkingDays(0);
        setSundayCount(0);
        setHolidayCount(0);
      }
    } else {
      setTotalDays(0);
      setWorkingDays(0);
      setSundayCount(0);
      setHolidayCount(0);
    }
  }, [formData.start_date, formData.end_date, publicHolidays]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [editingAttachmentIndex, setEditingAttachmentIndex] = useState(null);
  const [editingAttachmentName, setEditingAttachmentName] = useState('');

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return {
          url: file_url,
          name: file.name.replace(/\.[^/.]+$/, '') // Remove extension for default name
        };
      });

      const uploadedAttachments = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedAttachments]
      }));

      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      console.error('Failed to upload files:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleStartEditName = (index, currentName) => {
    setEditingAttachmentIndex(index);
    setEditingAttachmentName(currentName);
  };

  const handleSaveAttachmentName = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.map((att, i) => 
        i === index ? { ...att, name: editingAttachmentName || `Attachment ${index + 1}` } : att
      )
    }));
    setEditingAttachmentIndex(null);
    setEditingAttachmentName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.start_date || !formData.end_date || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('End date must be after start date');
      return;
    }

    if (formData.paid_days + formData.unpaid_days !== totalDays) {
      toast.error(`Paid + Unpaid days must equal ${totalDays}`);
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...formData,
        total_days: totalDays,
        status: request?.status || 'pending',
        // Keep attachment_urls for backward compatibility
        attachment_urls: formData.attachments.map(a => a.url)
      };

      if (request?.id) {
        await LeaveRequest.update(request.id, dataToSave);
        toast.success('Request updated successfully');
      } else {
        await LeaveRequest.create(dataToSave);
        toast.success('Request submitted successfully');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save leave request:', error);
      toast.error('Failed to save request');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEmployee = users.find(u => u.id === formData.employee_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {request ? 'Edit Leave Request' : 'New Leave Request'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Employee Selection (only for admins) */}
          {isAdmin && !request && (
            <div>
              <Label>Employee *</Label>
              <Select value={formData.employee_id} onValueChange={(value) => handleChange('employee_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee">
                    {selectedEmployee && (
                      <div className="flex items-center gap-2">
                        <Avatar user={selectedEmployee} size="xs" />
                        {selectedEmployee.nickname || selectedEmployee.full_name || selectedEmployee.email}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 sticky top-0 bg-white border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search employee..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="pl-8 h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500 text-center">No employees found</div>
                    ) : (
                      filteredUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar user={user} size="xs" />
                            {user.nickname || user.full_name || user.email}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Employee Display (for non-admins or when editing) */}
          {(!isAdmin || request) && selectedEmployee && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Avatar user={selectedEmployee} size="md" />
              <div>
                <div className="font-medium">{selectedEmployee.nickname || selectedEmployee.full_name}</div>
                <div className="text-sm text-slate-600">{selectedEmployee.email}</div>
              </div>
            </div>
          )}

          {/* Request Type */}
          <div>
            <Label>Request Type *</Label>
            <Select value={formData.request_type} onValueChange={(value) => handleChange('request_type', value)}>
              <SelectTrigger>
                <SelectValue>
                  {formData.request_type === 'holiday' && 'Vacation / Holiday'}
                  {formData.request_type === 'sick_leave' && 'Sick Leave'}
                  {formData.request_type === 'day_off' && 'Day Off'}
                  {formData.request_type === 'personal_leave' && 'Personal Leave'}
                  {formData.request_type === 'unjustified_leave' && 'Unjustified Leave'}
                  {formData.request_type === 'other' && 'Other'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="holiday">Vacation / Holiday</SelectItem>
                <SelectItem value="sick_leave">Sick Leave</SelectItem>
                <SelectItem value="day_off">Day Off</SelectItem>
                <SelectItem value="personal_leave">Personal Leave</SelectItem>
                <SelectItem value="unjustified_leave">Unjustified Leave</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>End Date *</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Total Days Display */}
          {totalDays > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-green-50 border border-indigo-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-900">📅 Total Calendar Days:</span>
                <span className="text-xl font-bold text-indigo-600">{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
              </div>
              
              <div className="border-t border-indigo-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">💼 Working Days (excl. non-working):</span>
                  <span className="text-xl font-bold text-green-600">{workingDays} {workingDays === 1 ? 'day' : 'days'}</span>
                </div>
              </div>
              
              {(sundayCount > 0 || holidayCount > 0) && (
                <div className="bg-white/60 rounded-md p-2 space-y-1">
                  <div className="text-xs font-medium text-slate-600 mb-1">Excluded from working days:</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {sundayCount > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {sundayCount} {sundayCount === 1 ? 'Sunday' : 'Sundays'}
                      </span>
                    )}
                    {holidayCount > 0 && (
                      <span className="flex items-center gap-1 text-purple-600">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        {holidayCount} public {holidayCount === 1 ? 'holiday' : 'holidays'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paid/Unpaid Days Distribution */}
          {totalDays > 0 && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium">Days Distribution</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-green-700">Paid Days</Label>
                  <Input
                    type="number"
                    min="0"
                    max={totalDays}
                    value={formData.paid_days}
                    onChange={(e) => {
                      const paid = Math.min(parseInt(e.target.value) || 0, totalDays);
                      handleChange('paid_days', paid);
                      handleChange('unpaid_days', totalDays - paid);
                    }}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-red-700">Unpaid Days</Label>
                  <Input
                    type="number"
                    min="0"
                    max={totalDays}
                    value={formData.unpaid_days}
                    onChange={(e) => {
                      const unpaid = Math.min(parseInt(e.target.value) || 0, totalDays);
                      handleChange('unpaid_days', unpaid);
                      handleChange('paid_days', totalDays - unpaid);
                    }}
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t">
                <span className="text-slate-600">
                  {formData.paid_days + formData.unpaid_days !== totalDays && (
                    <span className="text-amber-600">⚠️ Total must equal {totalDays} days</span>
                  )}
                </span>
                <div className="flex gap-3">
                  <span className="text-green-600 font-medium">{formData.paid_days} paid</span>
                  <span className="text-red-600 font-medium">{formData.unpaid_days} unpaid</span>
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label>Reason *</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Please provide a reason for your leave request..."
              rows={3}
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          {/* File Attachments */}
          <div>
            <Label>Attachments (Medical certificates, etc.)</Label>
            <div className="mt-2 space-y-2">
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-sm text-slate-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-600">Click to upload files</span>
                    </>
                  )}
                </div>
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              {/* Uploaded Files List */}
              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        {editingAttachmentIndex === index ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editingAttachmentName}
                              onChange={(e) => setEditingAttachmentName(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveAttachmentName(index);
                                if (e.key === 'Escape') setEditingAttachmentIndex(null);
                              }}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleSaveAttachmentName(index)}
                            >
                              <Check className="w-3 h-3 text-green-600" />
                            </Button>
                          </div>
                        ) : (
                          <span 
                            className="text-sm truncate cursor-pointer hover:text-indigo-600"
                            onClick={() => handleStartEditName(index, attachment.name)}
                            title="Click to rename"
                          >
                            {attachment.name || `Attachment ${index + 1}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {editingAttachmentIndex !== index && (
                          <button
                            type="button"
                            onClick={() => handleStartEditName(index, attachment.name)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                            title="Rename"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline px-1"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || isUploading}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              request ? 'Update Request' : 'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}