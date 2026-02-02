import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LeaveRequest } from '@/entities/all';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Loader2, CheckCircle, XCircle, FileText, Calendar, Clock, User, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import { base44 } from '@/api/base44Client';
import LeaveRequestDialog from './LeaveRequestDialog';

export default function LeaveRequestDetailsDialog({ 
  isOpen, 
  onClose, 
  request, 
  users, 
  currentUser,
  onSuccess 
}) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const canApprove = isAdmin && request.status === 'pending';
  const canEdit = isAdmin || (request.employee_id === currentUser?.id && request.status === 'pending');

  const employee = users.find(u => u.id === request.employee_id);
  const approver = users.find(u => u.id === request.approver_id);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      sick_leave: 'Sick Leave',
      unjustified_leave: 'Unjustified Leave',
      holiday: 'Vacation',
      day_off: 'Day Off',
      personal_leave: 'Personal Leave',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      // Llamar al backend function para aprobar y crear evento de calendario
      await base44.functions.invoke('approveLeaveRequest', {
        leave_request_id: request.id,
        approval_notes: approvalNotes
      });

      toast.success('Leave request approved and calendar events created');
      onSuccess();
    } catch (error) {
      console.error('Failed to approve leave request:', error);
      toast.error('Failed to approve leave request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!approvalNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    try {
      await LeaveRequest.update(request.id, {
        status: 'rejected',
        approver_id: currentUser.id,
        approval_date: new Date().toISOString(),
        approval_notes: approvalNotes
      });

      toast.success('Leave request rejected');
      onSuccess();
    } catch (error) {
      console.error('Failed to reject leave request:', error);
      toast.error('Failed to reject leave request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = window.confirm('Are you sure you want to cancel this request?');
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await LeaveRequest.update(request.id, {
        status: 'cancelled'
      });

      toast.success('Leave request cancelled');
      onSuccess();
    } catch (error) {
      console.error('Failed to cancel leave request:', error);
      toast.error('Failed to cancel leave request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leave Request Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge className={cn('text-sm px-3 py-1', getStatusColor(request.status))}>
              {request.status}
            </Badge>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                  disabled={isProcessing}
                  className="text-indigo-600"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              {request.status === 'pending' && request.employee_id === currentUser?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="text-slate-600"
                >
                  Cancel Request
                </Button>
              )}
            </div>
          </div>

          {/* Employee Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <User className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Employee Information</h3>
            </div>
            <div className="flex items-center gap-3">
              <Avatar user={employee} size="lg" />
              <div>
                <div className="font-medium text-lg">{employee?.nickname || employee?.full_name}</div>
                <div className="text-sm text-slate-600">{employee?.email}</div>
                <div className="text-sm text-slate-600">{employee?.job_role || 'No role specified'}</div>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Request Type</span>
              </div>
              <div className="text-lg font-semibold text-slate-900">{getTypeLabel(request.request_type)}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Total Days</span>
              </div>
              <div className="text-lg font-semibold text-indigo-600">
                {request.total_days || 0} {request.total_days === 1 ? 'day' : 'days'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Start Date</span>
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {request.start_date && format(parseISO(request.start_date), 'MMM d, yyyy')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">End Date</span>
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {request.end_date && format(parseISO(request.end_date), 'MMM d, yyyy')}
              </div>
            </div>
          </div>

          {/* Payroll Impact */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-medium text-sm text-blue-900 mb-2">Payroll Impact</div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-green-700 font-medium">{request.paid_days || 0}</span>
                <span className="text-green-600">paid days</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-700 font-medium">{request.unpaid_days || 0}</span>
                <span className="text-red-600">unpaid days</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Reason</Label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-slate-700 whitespace-pre-wrap">{request.reason}</p>
            </div>
          </div>

          {/* Additional Notes */}
          {request.notes && (
            <div>
              <Label className="text-base font-semibold mb-2 block">Additional Notes</Label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-700 whitespace-pre-wrap">{request.notes}</p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {((request.attachments && request.attachments.length > 0) || (request.attachment_urls && request.attachment_urls.length > 0)) && (
            <div>
              <Label className="text-base font-semibold mb-2 block">Attachments</Label>
              <div className="space-y-2">
                {(request.attachments || []).map((att, index) => (
                  <a
                    key={index}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{att.name || `Attachment ${index + 1}`}</span>
                  </a>
                ))}
                {/* Fallback for legacy attachment_urls without attachments */}
                {(!request.attachments || request.attachments.length === 0) && request.attachment_urls?.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">Attachment {index + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Approval Section */}
          {request.status !== 'pending' && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="font-medium text-sm text-slate-900 mb-2">
                {request.status === 'approved' ? 'Approved by' : 'Rejected by'}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Avatar user={approver} size="sm" />
                <span className="font-medium">{approver?.nickname || approver?.full_name || 'Admin'}</span>
              </div>
              {request.approval_date && (
                <div className="text-xs text-slate-600 mb-2">
                  on {format(parseISO(request.approval_date), 'MMM d, yyyy \'at\' h:mm a')}
                </div>
              )}
              {request.approval_notes && (
                <div className="bg-white border border-slate-200 rounded p-3 mt-2">
                  <div className="text-xs text-slate-600 mb-1">Notes:</div>
                  <p className="text-sm text-slate-700">{request.approval_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Approval Form (only for admins on pending requests) */}
          {canApprove && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <Label className="text-base font-semibold mb-2 block">Admin Action Required</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm mb-1 block">Approval Notes (optional for approval, required for rejection)</Label>
                  <Textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Add any notes about your decision..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve & Create Calendar Events
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={isProcessing}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Edit Dialog */}
      {showEditDialog && (
        <LeaveRequestDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          request={request}
          users={users}
          currentUser={currentUser}
          onSuccess={() => {
            setShowEditDialog(false);
            onSuccess();
          }}
        />
      )}
    </Dialog>
  );
}