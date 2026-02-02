import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

export default function WorkOrderStatusDialog({ isOpen, onClose, onConfirm, workOrder, currentStatus }) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'open');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    console.log('📋 WorkOrderStatusDialog - isOpen:', isOpen, 'currentStatus:', currentStatus);
    if (isOpen) {
      setSelectedStatus(currentStatus || 'open');
      setNotes('');
    }
  }, [isOpen, currentStatus]);

  const handleConfirm = () => {
    console.log('✅ Status dialog confirm:', selectedStatus, notes);
    onConfirm(selectedStatus, notes);
  };

  console.log('🎨 WorkOrderStatusDialog render - isOpen:', isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Update Work Order Status
          </DialogTitle>
          <DialogDescription>
            As a team leader or admin, you must update the work order status before clocking out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {workOrder && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-sm font-medium text-slate-700">
                {workOrder.title || workOrder.work_order_number || 'Work Order'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Current status: <span className="font-semibold">{currentStatus || 'unknown'}</span>
              </div>
            </div>
          )}

          <div>
            <Label>New Status *</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    Open
                  </div>
                </SelectItem>
                <SelectItem value="closed">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                    Closed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about the work order status..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
            Update Status & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}