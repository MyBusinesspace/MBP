import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function ProjectCombobox({
  projects = [],
  customers = [],
  selectedProjectId,
  onSelectProject,
  disabled = false,
  placeholder = "Select project..."
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const selectedCustomer = useMemo(() => {
    if (!selectedProject?.customer_id) return null;
    return customers.find(c => c.id === selectedProject.customer_id);
  }, [selectedProject, customers]);

  const filteredProjects = useMemo(() => {
    const list = projects || [];
    if (!searchValue) return list.slice(0, 100);
    const search = searchValue.toLowerCase();
    const results = list.filter(p => {
      const projectName = (p.name || '').toLowerCase();
      const customer = customers.find(c => c.id === p.customer_id);
      const customerName = (customer?.name || '').toLowerCase();
      return projectName.includes(search) || customerName.includes(search);
    });
    return results.slice(0, 100);
  }, [projects, customers, searchValue]);

  const handleSelect = (projectId) => {
    console.log('🎯 ProjectCombobox - handleSelect:', projectId);
    if (onSelectProject) {
      onSelectProject(projectId);
    }
    setOpen(false);
    setSearchValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedProjectId && "text-slate-400"
          )}
        >
          {selectedProjectId ? (
            <span className="truncate">
              {selectedProject?.name}
              {selectedCustomer && (
                <span className="text-slate-500 ml-1">({selectedCustomer.name})</span>
              )}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] max-h-[80vh] p-0 overflow-hidden" align="start">
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            type="text"
            placeholder="Search projects or customers..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* ✅ LISTA CON SCROLL - SIN Command wrapper */}
        <div 
          className="max-h-[70vh] overflow-y-auto p-1 overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          style={{ 
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* No Project Option */}
          <div
            onClick={() => handleSelect(null)}
            className={cn(
              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100",
              !selectedProjectId && "bg-slate-100"
            )}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                !selectedProjectId ? "opacity-100" : "opacity-0"
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-500 italic">No Project</div>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No projects found.
            </div>
          ) : (
            <>
              {filteredProjects.map((project) => {
              const customer = customers.find(c => c.id === project.customer_id);
              const isSelected = selectedProjectId === project.id;
              
              return (
                <div
                  key={project.id}
                  onClick={() => handleSelect(project.id)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100",
                    isSelected && "bg-slate-100"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.name}</div>
                    {customer && (
                      <div className="text-xs text-slate-500 truncate">({customer.name})</div>
                    )}
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}