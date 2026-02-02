import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

const taskStatusOptions = {
  "on going": { label: "On Going", color: "bg-blue-100 text-blue-800" },
  "finished": { label: "Finished", color: "bg-green-100 text-green-800" },
  "cancelled": { label: "Cancelled", color: "bg-red-100 text-red-800" }
};

export default function ClockOutDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  entry, 
  project,
  isLoading 
}) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!selectedStatus) {
      setError('Please select a task status before clocking out');
      return;
    }
    
    setError('');
    onConfirm(selectedStatus);
    setSelectedStatus('');
  };

  const handleClose = () => {
    setSelectedStatus('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Clock Out - Task Status Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-medium text-slate-900">{project?.name}</p>
            <p className="text-sm text-slate-600">{entry?.task}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Task Status <span className="text-red-500">*</span>
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className={error ? 'border-red-300' : ''}>
                <SelectValue placeholder="Select task status..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(taskStatusOptions).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <Badge className={`${config.color} font-medium text-xs`}>
                        {config.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Clocking out...' : 'Clock Out'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}