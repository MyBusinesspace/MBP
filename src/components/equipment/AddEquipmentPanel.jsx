import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClientEquipment, AssetCategory, AssetStatus, Project } from '@/entities/all';
import { Loader2, Package, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';

export default function AddEquipmentPanel({ isOpen, onClose, onEquipmentAdded, customers = [], projects = [] }) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
  const [openStatusCombobox, setOpenStatusCombobox] = useState(false);
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [openProjectCombobox, setOpenProjectCombobox] = useState(false);
  
  const initialFormState = {
    name: '',
    customer_id: '',
    brand: '',
    serial_number: '',
    plate_number: '',
    year_of_manufacture: '',
    category: '',
    status: '',
    project_id: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (isOpen) {
      // Load config only when open
      const loadConfig = async () => {
        try {
          const [categoriesData, statusesData] = await Promise.all([
            AssetCategory.list('sort_order'),
            AssetStatus.list('sort_order')
          ]);
          setCategories(categoriesData || []);
          setStatuses(statusesData || []);
        } catch (error) {
          console.error('Failed to load config:', error);
        }
      };
      loadConfig();
      // Reset form when opening
      setFormData(initialFormState);
    }
  }, [isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientSelect = (customer) => {
    if (!customer) {
      setFormData(prev => ({ ...prev, customer_id: '', project_id: '' }));
      return;
    }
    setFormData(prev => ({ 
      ...prev, 
      customer_id: customer.id,
      project_id: '' // Reset project when client changes
    }));
    setOpenClientCombobox(false);
  };

  const handleProjectSelect = (project) => {
    if (!project) {
      setFormData(prev => ({ ...prev, project_id: '' }));
      return;
    }
    setFormData(prev => ({ 
      ...prev, 
      project_id: project.id
    }));
    setOpenProjectCombobox(false);
  };

  // Filter projects by selected customer
  const filteredProjects = formData.customer_id 
    ? projects.filter(p => p.customer_id === formData.customer_id)
    : projects;

  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      toast.error('Equipment name is required');
      return;
    }

    // Optional: Require project? user previously had check, let's keep it simple but robust
    // if (!formData.project_id) { ... } 

    setLoading(true);
    try {
      // Prepare data
      const selectedProject = projects.find(p => p.id === formData.project_id);
      const selectedCustomer = customers.find(c => c.id === (formData.customer_id || selectedProject?.customer_id));
      
      const equipmentData = {
        name: formData.name,
        brand: formData.brand,
        serial_number: formData.serial_number,
        plate_number: formData.plate_number,
        year_of_manufacture: formData.year_of_manufacture,
        category: formData.category,
        status: formData.status,
        notes: formData.notes,
        // Relations
        project_id: formData.project_id || null,
        customer_id: selectedCustomer?.id || null,
        client_name: selectedCustomer?.name || ''
      };

      // Create
      const newEquipment = await ClientEquipment.create(equipmentData);
      
      // Link to project if needed
      if (formData.project_id) {
        const project = await Project.get(formData.project_id);
        if (project) {
          const currentIds = project.client_equipment_ids || [];
          await Project.update(formData.project_id, {
            client_equipment_ids: [...currentIds, newEquipment.id]
          });
        }
      }

      toast.success('Equipment created successfully');
      if (onEquipmentAdded) onEquipmentAdded(newEquipment);
      onClose();
    } catch (error) {
      console.error('Failed to create equipment:', error);
      toast.error('Failed to create equipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="border-b py-4 px-6">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <SheetTitle>Add Client Equipment</SheetTitle>
          </div>
          <SheetDescription>
            Add new equipment to the inventory.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Equipment Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Tower Crane, Concrete Pump"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Brand"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => handleChange('serial_number', e.target.value)}
                placeholder="Serial number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plate_number">Plate Number</Label>
              <Input
                id="plate_number"
                value={formData.plate_number}
                onChange={(e) => handleChange('plate_number', e.target.value)}
                placeholder="Plate Number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {formData.category || "Select category"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {categories.map((cat) => (
                          <CommandItem
                            key={cat.id}
                            value={cat.name}
                            onSelect={() => {
                              handleChange('category', cat.name);
                              setOpenCategoryCombobox(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.category === cat.name ? "opacity-100" : "opacity-0")} />
                            {cat.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={formData.year_of_manufacture}
                onChange={(e) => handleChange('year_of_manufacture', e.target.value)}
                placeholder="e.g., 2020"
              />
            </div>
          </div>

          {/* Client Selector - Step 1 */}
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {formData.customer_id 
                    ? customers.find(c => c.id === formData.customer_id)?.name || 'Unknown Client'
                    : "Select Client first"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search client..." />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={customer.name}
                          onSelect={() => handleClientSelect(customer)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", formData.customer_id === customer.id ? "opacity-100" : "opacity-0")} />
                          {customer.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Project Selector - Step 2 (filtered by client) */}
          <div className="space-y-2">
            <Label htmlFor="project">Project {formData.customer_id ? `(${filteredProjects.length} available)` : ''}</Label>
            <Popover open={openProjectCombobox} onOpenChange={setOpenProjectCombobox}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  role="combobox" 
                  className="w-full justify-between"
                  disabled={!formData.customer_id}
                >
                  {formData.project_id 
                    ? projects.find(p => p.id === formData.project_id)?.name || 'Unknown Project'
                    : formData.customer_id 
                      ? "Select Project (optional)"
                      : "Select a client first"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search project..." />
                  <CommandList>
                    <CommandEmpty>No projects for this client.</CommandEmpty>
                    <CommandGroup>
                      {filteredProjects.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={project.name}
                          onSelect={() => handleProjectSelect(project)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", formData.project_id === project.id ? "opacity-100" : "opacity-0")} />
                          {project.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
             <Popover open={openStatusCombobox} onOpenChange={setOpenStatusCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {formData.status || "Select status"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search status..." />
                    <CommandList>
                      <CommandEmpty>No status found.</CommandEmpty>
                      <CommandGroup>
                        {statuses.map((stat) => (
                          <CommandItem
                            key={stat.id}
                            value={stat.name}
                            onSelect={() => {
                              handleChange('status', stat.name);
                              setOpenStatusCombobox(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.status === stat.name ? "opacity-100" : "opacity-0")} />
                            {stat.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notes..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="border-t p-4 flex justify-end gap-2 bg-slate-50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Equipment
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}