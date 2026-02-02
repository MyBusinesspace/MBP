import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function AssetFilterPanel({
  // Asset filters
  categories = [],
  selectedCategories = [],
  onCategoryToggle,
  statuses = [],
  selectedStatuses = [],
  onStatusToggle,
  // Finance Category filters
  financeCategories = [],
  selectedFinanceCategories = [],
  onFinanceCategoryToggle,
  // Work Order Category filters
  workOrderCategories = [],
  selectedWOCategories = [],
  onWOCategoryToggle,
  // Clear functions
  onClearAll
}) {
  const totalFilters = selectedCategories.length + selectedStatuses.length + selectedWOCategories.length + selectedFinanceCategories.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-slate-300 hover:bg-slate-50">
          <Filter className="w-4 h-4 text-slate-600" />
          Filter
          {totalFilters > 0 && (
            <Badge className="ml-1 h-5 px-1.5 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
              {totalFilters}
            </Badge>
          )}
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-slate-900">Filters</h4>
            {totalFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-3 h-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Category</h5>
                <div className="space-y-1">
                  {categories.map(({ name, count }) => (
                    <label
                      key={name}
                      className={cn(
                        "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors text-sm",
                        selectedCategories.includes(name) ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <Checkbox
                        checked={selectedCategories.includes(name)}
                        onCheckedChange={() => onCategoryToggle(name)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="flex-1 truncate text-xs">{name}</span>
                      <span className="text-[10px] text-slate-400">{count}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Status Filter */}
            {statuses.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</h5>
                <div className="space-y-1">
                  {statuses.map(({ name, count }) => (
                    <label
                      key={name}
                      className={cn(
                        "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors text-sm",
                        selectedStatuses.includes(name) ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <Checkbox
                        checked={selectedStatuses.includes(name)}
                        onCheckedChange={() => onStatusToggle(name)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="flex-1 truncate text-xs">{name}</span>
                      <span className="text-[10px] text-slate-400">{count}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Finance Category Filter */}
          {financeCategories.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Finance Category</h5>
              <div className="grid grid-cols-2 gap-1">
                {financeCategories.map(({ id, name, count }) => (
                  <label
                    key={id || name}
                    className={cn(
                      "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors text-sm",
                      selectedFinanceCategories.includes(name) ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <Checkbox
                      checked={selectedFinanceCategories.includes(name)}
                      onCheckedChange={() => onFinanceCategoryToggle(name)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1 truncate text-xs">{name}</span>
                    <span className="text-[10px] text-slate-400">{count}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Work Order Category Filter - Full width below */}
          {workOrderCategories.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Work Order Category</h5>
              <div className="grid grid-cols-2 gap-1">
                {workOrderCategories.map(({ id, name, count }) => (
                  <label
                    key={id}
                    className={cn(
                      "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors text-sm",
                      selectedWOCategories.includes(id) ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <Checkbox
                      checked={selectedWOCategories.includes(id)}
                      onCheckedChange={() => onWOCategoryToggle(id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1 truncate text-xs">{name}</span>
                    <span className="text-[10px] text-slate-400">{count}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}