import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Repeat, Square, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function EditTimesheetDialog({ 
  isOpen, 
  onClose, 
  activeTimesheet,
  onSwitch,
  onClockOut,
  onEdit,
  allWorkOrders,
  projects,
  customers
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedClockIn, setEditedClockIn] = useState('');
  const [editedClockOut, setEditedClockOut] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEditSubmit = async () => {
    if (!editedClockIn) {
      alert('Clock in time is required');
      return;
    }

    if (!editNotes || editNotes.trim().length === 0) {
      alert('Please explain why you need to edit this timesheet');
      return;
    }

    setIsProcessing(true);
    
    // Call onEdit with the edited data
    await onEdit({
      clock_in_time: new Date(editedClockIn).toISOString(),
      clock_out_time: editedClockOut ? new Date(editedClockOut).toISOString() : new Date().toISOString(),
      notes: editNotes
    });

    // Reset and close
    resetEdit();
    onClose();
  };

  const handleSwitch = () => {
    setIsProcessing(true);
    resetEdit();
    onClose();
    onSwitch();
  };

  const handleClockOut = () => {
    setIsProcessing(true);
    resetEdit();
    onClose();
    onClockOut();
  };

  const resetEdit = () => {
    setEditMode(false);
    setEditedClockIn('');
    setEditedClockOut('');
    setEditNotes('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetEdit();
      onClose();
    }
  };

  if (!activeTimesheet) return null;

  // Get current WO info
  const activeSegment = activeTimesheet.work_order_segments?.find(seg => !seg.end_time);
  const currentWO = activeSegment ? allWorkOrders.find(wo => wo.id === activeSegment.work_order_id) : null;
  const project = currentWO ? projects?.find(p => p.id === currentWO.project_id) : null;
  const customer = project ? customers?.find(c => c.id === project.customer_id) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Timesheet' : 'Clock Out Options'}</DialogTitle>
        </DialogHeader>

        {!editMode ? (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">Current Session</div>
              <div className="font-semibold text-slate-900">
                {project?.name || 'Unknown Project'}
              </div>
              {customer && (
                <div className="text-xs text-slate-500">
                  {customer.name}
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Started: {format(parseISO(activeTimesheet.clock_in_time), 'MMM d, yyyy HH:mm')}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSwitch}
                disabled={isProcessing}
                variant="outline"
                className="w-full justify-start h-auto py-3"
              >
                <Repeat className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Switch Work Order</div>
                  <div className="text-xs text-slate-500">Continue working on a different order</div>
                </div>
              </Button>

              <Button
                onClick={handleClockOut}
                disabled={isProcessing}
                variant="outline"
                className="w-full justify-start h-auto py-3 border-red-200 hover:bg-red-50"
              >
                <Square className="w-5 h-5 mr-3 text-red-600" />
                <div className="text-left">
                  <div className="font-semibold">Clock Out</div>
                  <div className="text-xs text-slate-500">End your work session</div>
                </div>
              </Button>

              <Button
                onClick={() => {
                  setEditMode(true);
                  setEditedClockIn(format(parseISO(activeTimesheet.clock_in_time), "yyyy-MM-dd'T'HH:mm"));
                  setEditedClockOut(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                }}
                disabled={isProcessing}
                variant="outline"
                className="w-full justify-start h-auto py-3 border-blue-200 hover:bg-blue-50"
              >
                <Edit className="w-5 h-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">Edit Timesheet</div>
                  <div className="text-xs text-slate-500">Request changes - timer will stop automatically</div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800 font-semibold mb-1">
                ⚠️ Important:
              </p>
              <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                <li>Your timer will stop immediately when you submit</li>
                <li>An admin must approve your changes before they are finalized</li>
                <li>Please explain why you need to edit this timesheet</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Clock In Time *</Label>
                <Input
                  type="datetime-local"
                  value={editedClockIn}
                  onChange={(e) => setEditedClockIn(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div>
                <Label>Clock Out Time *</Label>
                <Input
                  type="datetime-local"
                  value={editedClockOut}
                  onChange={(e) => setEditedClockOut(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Defaults to current time
                </p>
              </div>

              <div>
                <Label>Reason for Edit *</Label>
                <Textarea
                  placeholder="Example: Forgot to clock in on time, need to correct end time, etc."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                  disabled={isProcessing}
                />
                <p className="text-xs text-slate-500 mt-1">
                  This will be sent to the admin for review
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => resetEdit()}
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Stop Timer & Submit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}