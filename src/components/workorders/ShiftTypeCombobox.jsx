import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function ShiftTypeCombobox({ 
  shiftTypes = [], 
  selectedShiftTypeId, 
  onSelectShiftType,
  disabled = false 
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : [];
  
  const selectedShiftType = useMemo(() => {
    return safeShiftTypes.find(s => s.id === selectedShiftTypeId);
  }, [safeShiftTypes, selectedShiftTypeId]);

  const filteredShiftTypes = useMemo(() => {
    if (!search) return safeShiftTypes;
    return safeShiftTypes.filter(shift =>
      shift.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [safeShiftTypes, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9"
          disabled={disabled}
        >
          {selectedShiftType ? (
            <span className="text-sm truncate">
              {selectedShiftType.name}
              {selectedShiftType.start_time && selectedShiftType.end_time && (
                <span className="text-xs text-slate-500 ml-2">
                  ({selectedShiftType.start_time} - {selectedShiftType.end_time})
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm text-slate-400">Search shift type...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 h-4 shrink-0 opacity-50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shift type..."
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* ✅ LISTA CON SCROLL - SIN Command wrapper */}
        <div 
          className="max-h-[300px] overflow-y-auto p-1"
          style={{ 
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          }}
        >
          {filteredShiftTypes.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No shift type found.
            </div>
          ) : (
            <>
              {/* No shift type option */}
              <div
                onClick={() => {
                  onSelectShiftType(null);
                  setOpen(false);
                  setSearch('');
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !selectedShiftTypeId ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-slate-500 italic">No shift type</span>
              </div>

              {/* Shift type items */}
              {filteredShiftTypes.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => {
                    onSelectShiftType(shift.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedShiftTypeId === shift.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{shift.name}</span>
                    {shift.start_time && shift.end_time && (
                      <span className="text-xs text-slate-500">
                        {shift.start_time} - {shift.end_time}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}