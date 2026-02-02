import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function EquipmentSelector({ 
  project, 
  availableEquipments, 
  onSelect, 
  onCreateNew 
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (equipmentId) => {
    onSelect(equipmentId);
    setOpen(false);
  };

  const handleCreateNew = () => {
    onCreateNew();
    setOpen(false);
  };

  // Show max 10 items, 5 at top, 5 at bottom if more
  const displayEquipments = availableEquipments.length > 10 
    ? [...availableEquipments.slice(0, 5), ...availableEquipments.slice(-5)]
    : availableEquipments;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-auto py-1 px-2 text-xs hover:bg-slate-100"
        >
          Equipment <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <ScrollArea className="max-h-64">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={handleCreateNew}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Equipment
            </Button>
            
            {displayEquipments.length > 0 && (
              <div className="border-t pt-1 mt-1">
                {displayEquipments.map((equipment, idx) => (
                  <Button
                    key={equipment.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => handleSelect(equipment.id)}
                  >
                    <span className="truncate">{equipment.name}</span>
                  </Button>
                ))}
                {availableEquipments.length > 10 && (
                  <p className="text-xs text-gray-400 text-center py-1">
                    ... {availableEquipments.length - 10} more
                  </p>
                )}
              </div>
            )}
            
            {displayEquipments.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">
                No equipment available
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}