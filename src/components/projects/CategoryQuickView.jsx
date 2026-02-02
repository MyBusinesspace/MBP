import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryColorConfig = {
  gray: 'bg-gray-100 text-gray-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  purple: 'bg-purple-100 text-purple-800',
  pink: 'bg-pink-100 text-pink-800',
  orange: 'bg-orange-100 text-orange-800',
  teal: 'bg-teal-100 text-teal-800'
};

export default function CategoryQuickView({ categories, categoryCounts }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="w-4 h-4" />
          Categories
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-4" 
        align="start"
        side="top"
        sideOffset={8}
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold mb-3">Project Categories</p>
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between">
                <Badge className={cn(categoryColorConfig[category.color] || categoryColorConfig.gray, "text-xs")}>
                  {category.name}
                </Badge>
                <span className="text-xs font-mono bg-gray-100 rounded px-2 py-0.5">
                  {categoryCounts[category.id] || 0}
                </span>
              </div>
            ))}
            {categoryCounts.uncategorized > 0 && (
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  Uncategorized
                </Badge>
                <span className="text-xs font-mono bg-gray-100 rounded px-2 py-0.5">
                  {categoryCounts.uncategorized}
                </span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}