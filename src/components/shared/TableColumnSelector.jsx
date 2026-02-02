import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings2 } from 'lucide-react';

export default function TableColumnSelector({ columns, visibleColumns, onToggleColumn }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings2 className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium mb-3">Toggle Columns</p>
          {columns.map(column => (
            <div key={column.id} className="flex items-center gap-2">
              <Checkbox
                id={column.id}
                checked={visibleColumns.includes(column.id)}
                onCheckedChange={() => onToggleColumn(column.id)}
                disabled={column.locked}
              />
              <label
                htmlFor={column.id}
                className={`text-sm cursor-pointer ${column.locked ? 'text-gray-400' : ''}`}
              >
                {column.label}
                {column.locked && ' (required)'}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}