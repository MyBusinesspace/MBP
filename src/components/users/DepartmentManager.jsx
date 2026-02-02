import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Pencil, MoreVertical, Copy } from 'lucide-react';
import { Department } from '@/entities/all';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const colorOptions = [
  { value: 'white', label: 'White', class: 'bg-white border border-gray-300', textClass: 'text-gray-700' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-500', textClass: 'text-white' },
  { value: 'red', label: 'Red', class: 'bg-red-500', textClass: 'text-white' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500', textClass: 'text-white' },
  { value: 'green', label: 'Green', class: 'bg-green-500', textClass: 'text-white' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500', textClass: 'text-white' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500', textClass: 'text-white' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500', textClass: 'text-white' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500', textClass: 'text-white' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500', textClass: 'text-white' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500', textClass: 'text-white' }
];

export default function DepartmentManager({ onDepartmentsChanged }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ 
    name: '', 
    color: 'blue',
    employee_number_prefix: '',
    serial_digits: 4,
    next_serial: 1
  });
  const [editingId, setEditingId] = useState(null);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await Department.list('sort_order');
      setDepartments(data || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleSave = async () => {
    if (!newDepartment.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      if (editingId) {
        await Department.update(editingId, newDepartment);
        toast.success('Department updated');
      } else {
        await Department.create({
          ...newDepartment,
          sort_order: departments.length
        });
        toast.success('Department created');
      }
      
      setNewDepartment({ 
        name: '', 
        color: 'blue',
        employee_number_prefix: '',
        serial_digits: 4,
        next_serial: 1
      });
      setEditingId(null);
      await loadDepartments();
      if (onDepartmentsChanged) onDepartmentsChanged();
    } catch (error) {
      console.error('Failed to save department:', error);
      toast.error('Failed to save department');
    }
  };

  const handleEdit = (dept) => {
    setNewDepartment({
      name: dept.name,
      color: dept.color || 'blue',
      employee_number_prefix: dept.employee_number_prefix || '',
      serial_digits: dept.serial_digits || 4,
      next_serial: dept.next_serial || 1
    });
    setEditingId(dept.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department?')) return;
    
    try {
      await Department.delete(id);
      toast.success('Department deleted');
      await loadDepartments();
      if (onDepartmentsChanged) onDepartmentsChanged();
    } catch (error) {
      console.error('Failed to delete department:', error);
      toast.error('Failed to delete department');
    }
  };

  const handleDuplicate = async (dept) => {
    try {
      const duplicated = {
        name: `${dept.name} (Copy)`,
        color: dept.color,
        employee_number_prefix: dept.employee_number_prefix,
        serial_digits: dept.serial_digits,
        next_serial: 1,
        sort_order: departments.length
      };
      
      await Department.create(duplicated);
      toast.success('Department duplicated');
      await loadDepartments();
      if (onDepartmentsChanged) onDepartmentsChanged();
    } catch (error) {
      console.error('Failed to duplicate department:', error);
      toast.error('Failed to duplicate department');
    }
  };

  const cancelEdit = () => {
    setNewDepartment({ 
      name: '', 
      color: 'blue',
      employee_number_prefix: '',
      serial_digits: 4,
      next_serial: 1
    });
    setEditingId(null);
  };

  const selectedColor = colorOptions.find(c => c.value === newDepartment.color);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Departments</h2>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Department Name</label>
            <Input
              placeholder="e.g., Operations, HR, Finance..."
              value={newDepartment.name}
              onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Employee Number Prefix (3 letters)</label>
            <Input
              placeholder="e.g., ADM, OPR, CON, HR, ANA"
              value={newDepartment.employee_number_prefix}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().slice(0, 3);
                setNewDepartment({ ...newDepartment, employee_number_prefix: value });
              }}
              maxLength={3}
            />
            <p className="text-xs text-slate-500 mt-1">
              Used to generate employee numbers (e.g., ADM-0001)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Color</label>
            <Select
              value={newDepartment.color}
              onValueChange={(value) => setNewDepartment({ ...newDepartment, color: value })}
            >
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded", selectedColor?.class)} />
                    <span>{selectedColor?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-4 h-4 rounded", color.class)} />
                      <span>{color.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1" disabled={!newDepartment.name.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              {editingId ? 'Update Department' : 'Add Department'}
            </Button>
            {editingId && (
              <Button onClick={cancelEdit} variant="outline">
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Existing Departments ({departments.length})</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="font-medium">No departments yet</p>
              <p className="text-sm mt-2">Create your first department above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {departments.map((dept) => {
                const deptColor = colorOptions.find(c => c.value === dept.color);
                return (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn("w-3 h-3 rounded", deptColor?.class)} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{dept.name}</div>
                        {dept.employee_number_prefix && (
                          <div className="text-xs text-slate-500">Prefix: {dept.employee_number_prefix}</div>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4 text-slate-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(dept)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(dept)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(dept.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}