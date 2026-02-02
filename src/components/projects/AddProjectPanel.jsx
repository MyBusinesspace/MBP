import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Project } from '@/entities/all';
import { useData } from '@/components/DataProvider';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AddProjectPanel({ isOpen, onClose, onProjectAdded, customers }) {
  const { currentCompany } = useData();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer_id: null,
    status: 'active',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return customers.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return customers
      .filter(customer =>
        customer.name.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Exact match first
        if (aName === query) return -1;
        if (bName === query) return 1;
        
        // Starts with query second
        const aStarts = aName.startsWith(query);
        const bStarts = bName.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Then alphabetical
        return a.name.localeCompare(b.name);
      });
  }, [customers, searchQuery]);

  const handleSave = async (e) => {
    e?.preventDefault();
    
    if (!formData.name) {
      toast.error('Project name is required.');
      return;
    }

    if (!formData.customer_id) {
      toast.error('Customer is required.');
      return;
    }
    
    setIsSaving(true);
    try {
      const newProject = await Project.create({
        name: formData.name,
        description: formData.description || undefined,
        customer_id: formData.customer_id || null,
        branch_id: currentCompany?.id,
        status: formData.status || 'active',
      });
      
      toast.success('Project created successfully!');
      
      if (onProjectAdded) {
        onProjectAdded(newProject);
      }
      
      handleClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      customer_id: null,
      status: 'active',
    });
    setSearchQuery('');
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create New Project</SheetTitle>
        </SheetHeader>

        {/* Search Bar - FIXED AT TOP */}
        <div className="sticky top-0 bg-white z-10 pb-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <Label>Customer *</Label>
            <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 space-y-1">
              {!customers || filteredCustomers.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">
                  {searchQuery ? 'No customers found matching your search' : 'No customers available'}
                </div>
              ) : (
                filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, customer_id: customer.id })}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      formData.customer_id === customer.id
                        ? "bg-indigo-100 text-indigo-900 font-semibold"
                        : "hover:bg-slate-100",
                      isSaving && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={isSaving}
                  >
                    {customer.name}
                  </button>
                ))
              )}
            </div>
            {formData.customer_id && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {customers.find(c => c.id === formData.customer_id)?.name}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  type="button"
                  className="ml-2 h-auto px-2 py-1 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setFormData({...formData, customer_id: null})}
                  disabled={isSaving}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Downtown Tower Renovation"
              disabled={isSaving}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the project..."
              disabled={isSaving}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              disabled={isSaving}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button type="submit" disabled={isSaving || !formData.name} className="w-full">
              {isSaving ? 'Saving...' : 'Save Project'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving} className="w-full">
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}