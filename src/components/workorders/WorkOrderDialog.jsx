import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // Assuming toast is from sonner

export default function WorkOrderDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  workOrder, 
  projects, 
  employees, 
  assets, // This prop still provides the raw asset data
  categories,
  shiftTypes 
}) {
  const [formData, setFormData] = useState({
    work_order_number: '',
    project_id: '',
    employee_id: '', // Added employee_id
    equipment_id: null, // Renamed asset_id to equipment_id, default to null
    task: '',
    work_notes: '', // Added work_notes
    work_order_category_id: null, // Added work_order_category_id
    shift_type_id: null, // Default to null for shift_type_id
    planned_start_time: '',
    planned_end_time: ''
  });
  const [isLoading, setIsLoading] = useState(false); // Renamed isSaving to isLoading

  // CRITICAL: Filter projects and assets
  const activeProjects = (projects || []).filter(p => 
    p.status !== 'archived' && p.status !== 'deleted' && !p.is_deleted
  );

  const activeAssets = (assets || []).filter(a => 
    a.status !== 'Decommissioned' && !a.archived
  );

  // Only assets linked to the selected project
  const filteredAssets = activeAssets.filter(a => a.project_id === formData.project_id);

  useEffect(() => {
    if (workOrder) {
      // Validate that the work order's project is still active
      const projectStillActive = activeProjects.find(p => p.id === workOrder.project_id);
      
      setFormData({
        work_order_number: workOrder.work_order_number || '',
        project_id: projectStillActive ? workOrder.project_id : '', // If project is not active, reset to empty
        employee_id: workOrder.employee_id || '',
        equipment_id: workOrder.equipment_id || null,
        task: workOrder.task || '',
        work_notes: workOrder.work_notes || '',
        planned_start_time: workOrder.planned_start_time ? new Date(workOrder.planned_start_time).toISOString().slice(0, 16) : '',
        planned_end_time: workOrder.planned_end_time ? new Date(workOrder.planned_end_time).toISOString().slice(0, 16) : '',
        work_order_category_id: workOrder.work_order_category_id || null,
        shift_type_id: workOrder.shift_type_id || null
      });
    } else {
      // Reset for new work order
      setFormData({
        work_order_number: '',
        project_id: '',
        employee_id: '',
        equipment_id: null,
        task: '',
        work_notes: '',
        planned_start_time: '',
        planned_end_time: '',
        work_order_category_id: null,
        shift_type_id: null
      });
    }
  }, [workOrder, activeProjects]); // Added activeProjects as a dependency

  // Reset equipment selection if it doesn't belong to the selected project
  useEffect(() => {
    if (!formData.project_id) {
      setFormData(prev => ({ ...prev, equipment_id: null }));
      return;
    }
    if (
      formData.equipment_id &&
      !activeAssets.some(a => a.project_id === formData.project_id && a.id === formData.equipment_id)
    ) {
      setFormData(prev => ({ ...prev, equipment_id: null }));
    }
  }, [formData.project_id, formData.equipment_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.project_id || !formData.employee_id) {
      toast.error('Project and Employee are required');
      return;
    }

    // Validate that selected project is active
    const projectExists = activeProjects.find(p => p.id === formData.project_id);
    if (!projectExists) {
      toast.error('Selected project is not available');
      return;
    }

    setIsLoading(true);
    const dataToSave = { ...formData };

    // If creating a new order (not editing), force date/time to "now"
    if (!workOrder) {
      const now = new Date();
      // planned_start_time: default to now if empty or if a past template value sneaked in
      if (!dataToSave.planned_start_time || new Date(dataToSave.planned_start_time) < now) {
        dataToSave.planned_start_time = now.toISOString();
      }
      // planned_end_time: clear if it's before start (likely copied)
      if (dataToSave.planned_end_time && new Date(dataToSave.planned_end_time) < new Date(dataToSave.planned_start_time)) {
        delete dataToSave.planned_end_time;
      }
    }
    
    // Clean up null/empty fields to avoid sending unnecessary data
    if (!dataToSave.equipment_id) delete dataToSave.equipment_id;
    if (!dataToSave.work_order_category_id) delete dataToSave.work_order_category_id;
    if (!dataToSave.shift_type_id) delete dataToSave.shift_type_id;
    if (!dataToSave.task) delete dataToSave.task;
    if (!dataToSave.work_notes) delete dataToSave.work_notes;
    // Add any other specific cleanup if needed, e.g., if start/end times can be empty strings
    if (dataToSave.planned_start_time === '') delete dataToSave.planned_start_time;
    if (dataToSave.planned_end_time === '') delete dataToSave.planned_end_time;


    try {
      await onSave(dataToSave);
      onClose(); // Close dialog on successful save
    } catch (error) {
      console.error("Failed to save work order:", error);
      toast.error("Failed to save work order.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function for employee full name (assuming it exists elsewhere or we define it)
  const getDynamicFullName = (employee) => {
    if (!employee) return '';
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workOrder ? 'Edit Work Order' : 'Create Work Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Work Order Number */}
            <div className="space-y-2">
              <Label>Work Order Number</Label>
              <Input
                value={formData.work_order_number}
                onChange={(e) => setFormData(prev => ({ ...prev, work_order_number: e.target.value }))}
                placeholder="e.g., N1"
              />
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee */}
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employees || []).map(emp => ( // Ensure employees is an array
                    <SelectItem key={emp.id} value={emp.id}>
                      {getDynamicFullName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Equipment (formerly Asset) */}
            {filteredAssets.length > 0 && (
            <div className="space-y-2">
              <Label>Equipment</Label>
              <Select
                value={formData.equipment_id === null ? 'none' : formData.equipment_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, equipment_id: value === 'none' ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Equipment</SelectItem>
                  {filteredAssets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}

            {/* Work Order Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.work_order_category_id === null ? 'none' : formData.work_order_category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, work_order_category_id: value === 'none' ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {(categories || []).map(category => ( // Ensure categories is an array
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shift Type */}
            <div className="space-y-2">
              <Label>Shift Type</Label>
              <Select
                value={formData.shift_type_id === null ? 'none' : formData.shift_type_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, shift_type_id: value === 'none' ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Shift Type</SelectItem>
                  {(shiftTypes || []).map(shift => ( // Ensure shiftTypes is an array
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name} {shift.start_time && shift.end_time && `(${shift.start_time} - ${shift.end_time})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Planned Start Time */}
            <div className="space-y-2">
              <Label>Planned Start Time</Label>
              <Input
                type="datetime-local"
                value={formData.planned_start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, planned_start_time: e.target.value }))}
              />
            </div>

            {/* Planned End Time */}
            <div className="space-y-2">
              <Label>Planned End Time</Label>
              <Input
                type="datetime-local"
                value={formData.planned_end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, planned_end_time: e.target.value }))}
              />
            </div>

            {/* Task Notes (Description) */}
            <div className="col-span-2 space-y-2">
              <Label>Task Description</Label>
              <Textarea
                placeholder="Description of the task to be performed..."
                value={formData.task}
                onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Work Notes */}
            <div className="col-span-2 space-y-2">
              <Label>Work Notes</Label>
              <Textarea
                placeholder="Notes about the work performed..."
                value={formData.work_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, work_notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.project_id || !formData.employee_id}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                workOrder ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}