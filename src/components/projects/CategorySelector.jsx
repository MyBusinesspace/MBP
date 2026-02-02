import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CategorySelector({ project, categories, categoryColorConfig, onUpdate }) {
  const [open, setOpen] = useState(false);
  const selectedCategories = (project.category_ids || [])
    .map(catId => categories.find(c => c.id === catId))
    .filter(Boolean);

  const handleToggleCategory = async (categoryId) => {
    const currentIds = project.category_ids || [];
    const newIds = currentIds.includes(categoryId)
      ? currentIds.filter(id => id !== categoryId)
      : [...currentIds, categoryId];
    
    await onUpdate(project.id, 'category_ids', newIds);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-auto py-1 px-2 text-xs hover:bg-slate-100 w-full justify-start"
        >
          {selectedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-1 items-center">
              {selectedCategories.slice(0, 2).map(cat => (
                <Badge key={cat.id} className={`${categoryColorConfig[cat.color] || categoryColorConfig.gray} text-[10px] px-1.5 py-0`}>
                  {cat.name}
                </Badge>
              ))}
              {selectedCategories.length > 2 && (
                <span className="text-[10px] text-slate-500">+{selectedCategories.length - 2}</span>
              )}
              <ChevronDown className="w-3 h-3 ml-auto text-slate-400" />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400">
              <Plus className="w-3 h-3" />
              <span>Category</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <ScrollArea className="max-h-64">
          <div className="space-y-1">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">
                No categories available
              </p>
            ) : (
              categories.map(cat => {
                const isSelected = (project.category_ids || []).includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                    onClick={() => handleToggleCategory(cat.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleCategory(cat.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Badge className={`${categoryColorConfig[cat.color] || categoryColorConfig.gray} text-xs`}>
                      {cat.name}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}