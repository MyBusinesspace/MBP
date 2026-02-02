import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";

const getInitialState = (formType) => {
  switch (formType) {
    case 'leave_request':
      return { leave_type: '', start_date: '', end_date: '', reason: '' };
    case 'vacation_request':
      return { start_date: '', end_date: '', destination: '' };
    case 'work_report':
      return { project_id: '', hours: '', description: '' };
    default:
      return {};
  }
};

export default function RequestFormDialog({ isOpen, onClose, onSubmit, formType, projects, formTypeConfig }) {
  const [selectedFormType, setSelectedFormType] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setSelectedFormType(formType);
      setFormData(getInitialState(formType));
    } else {
      // Reset on close for a clean state next time
      setSelectedFormType(null);
      setFormData({});
    }
  }, [isOpen, formType]);

  const handleTypeChange = (type) => {
    setSelectedFormType(type);
    setFormData(getInitialState(type));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Basic validation
    if (selectedFormType === 'leave_request' && (!formData.leave_type || !formData.start_date || !formData.end_date)) {
        toast.error("Please fill all required fields for Leave Request.");
        return;
    }
    if (selectedFormType === 'vacation_request' && (!formData.start_date || !formData.end_date)) {
        toast.error("Please fill all required fields for Vacation Request.");
        return;
    }
    if (selectedFormType === 'work_report' && (!formData.project_id || !formData.hours || !formData.description)) {
        toast.error("Please fill all required fields for Work Report.");
        return;
    }
    onSubmit(formData, selectedFormType);
  };

  const renderFormContent = () => {
    switch (selectedFormType) {
      case 'leave_request':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="leave_type">Type of Leave</Label>
              <Select onValueChange={(val) => handleChange('leave_type', val)} value={formData.leave_type}>
                <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Personal Day">Personal Day</SelectItem>
                  <SelectItem value="Bereavement">Bereavement</SelectItem>
                  <SelectItem value="Jury Duty">Jury Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => handleChange('end_date', e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea id="reason" placeholder="Briefly explain the reason for your leave..." value={formData.reason} onChange={(e) => handleChange('reason', e.target.value)} />
            </div>
          </div>
        );
      case 'vacation_request':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => handleChange('end_date', e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="destination">Destination (optional)</Label>
              <Input id="destination" placeholder="e.g., 'Paris, France' or 'Staying home'" value={formData.destination} onChange={(e) => handleChange('destination', e.target.value)} />
            </div>
          </div>
        );
      case 'work_report':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="project_id">Project</Label>
              <Select onValueChange={(val) => handleChange('project_id', val)} value={formData.project_id}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hours">Hours Worked</Label>
              <Input id="hours" type="number" placeholder="e.g., 8" value={formData.hours} onChange={(e) => handleChange('hours', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="description">Work Description</Label>
              <Textarea id="description" placeholder="Describe the work you completed..." value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
            </div>
          </div>
        );
      default:
        // This will be shown when no form type is selected yet
        return (
            <div className="py-4">
              <Label>Select Form Type</Label>
              <Select onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue placeholder="Choose a form to submit..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(formTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {selectedFormType ? `${formTypeConfig[selectedFormType]?.label}` : 'New Request'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {renderFormContent()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {selectedFormType && <Button onClick={handleSubmit}>Submit</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}