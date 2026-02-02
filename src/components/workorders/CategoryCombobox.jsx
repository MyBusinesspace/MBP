import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function CategoryCombobox({ 
  categories = [], 
  selectedCategoryId, 
  onSelectCategory,
  disabled = false 
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const safeCategories = Array.isArray(categories) ? categories : [];
  
  const selectedCategory = useMemo(() => {
    return safeCategories.find(c => c.id === selectedCategoryId);
  }, [safeCategories, selectedCategoryId]);

  const filteredCategories = useMemo(() => {
    if (!search) return safeCategories;
    return safeCategories.filter(category =>
      category.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [safeCategories, search]);

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
          {selectedCategory ? (
            <span className="text-sm truncate">{selectedCategory.name}</span>
          ) : (
            <span className="text-sm text-slate-400">Search category...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0 max-h-[280px] overflow-hidden flex flex-col" 
        align="start" 
        side="bottom"
      >
        {/* Search Input */}
        <div className="flex items-center border-b px-3 bg-white flex-shrink-0">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category..."
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* ✅ LISTA CON SCROLL FORZADO */}
        <div 
          className="overflow-y-scroll p-1 flex-1"
          style={{ 
            maxHeight: '220px',
            overscrollBehavior: 'contain'
          }}
        >
          {filteredCategories.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No category found.
            </div>
          ) : (
            <>
              {/* No category option */}
              <div
                onClick={() => {
                  onSelectCategory(null);
                  setOpen(false);
                  setSearch('');
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !selectedCategoryId ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-slate-500 italic">No category</span>
              </div>

              {/* Category items */}
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => {
                    onSelectCategory(category.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCategoryId === category.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category.name}
                </div>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}