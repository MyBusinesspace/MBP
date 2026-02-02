import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

export default function DynamicChecklist({ items = [], onChange, placeholder = "Add item...", disabled = false, showSequence = false }) {
  // Ensure we always have at least one empty item if the list is empty, 
  // BUT only if we want to force at least one input.
  // The requirement is "start with only one checkbox/note".
  
  const [localItems, setLocalItems] = useState([]);

  useEffect(() => {
    if (!items || items.length === 0) {
      setLocalItems([{ id: Date.now().toString(), text: '', checked: false }]);
    } else {
      setLocalItems(items);
    }
  }, [items]);

  const handleChange = (id, field, value) => {
    if (disabled) return;
    const newItems = localItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setLocalItems(newItems);
    onChange(newItems);
  };

  const handleAdd = (index) => {
    if (disabled) return;
    const newItem = { id: Date.now().toString() + Math.random(), text: '', checked: false };
    const newItems = [...localItems];
    newItems.splice(index + 1, 0, newItem);
    setLocalItems(newItems);
    onChange(newItems);
    
    // Focus the new input after render
    setTimeout(() => {
      const inputs = document.querySelectorAll('.dynamic-checklist-input');
      if (inputs[index + 1]) inputs[index + 1].focus();
    }, 0);
  };

  const handleRemove = (id) => {
    if (disabled) return;
    if (localItems.length <= 1) {
        // Don't remove the last item, just clear it
        handleChange(id, 'text', '');
        handleChange(id, 'checked', false);
        return;
    }
    const newItems = localItems.filter(item => item.id !== id);
    setLocalItems(newItems);
    onChange(newItems);
  };

  const handleKeyDown = (e, index, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd(index);
    }
    if (e.key === 'Backspace' && localItems[index].text === '') {
        // If empty and not the only item, remove it and focus previous
        if (localItems.length > 1) {
            e.preventDefault();
            handleRemove(id);
            setTimeout(() => {
                const inputs = document.querySelectorAll('.dynamic-checklist-input');
                if (inputs[index - 1]) inputs[index - 1].focus();
            }, 0);
        }
    }
  };

  return (
    <div className="space-y-2">
      {localItems.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <Checkbox
            checked={item.checked}
            onCheckedChange={(checked) => handleChange(item.id, 'checked', checked)}
            disabled={disabled}
            className="mt-0.5"
          />
          {showSequence && (
            <span className="w-10 text-[11px] text-slate-500 select-none">{index + 1}/{localItems.length}</span>
          )}
          <Input
            value={item.text}
            onChange={(e) => handleChange(item.id, 'text', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index, item.id)}
            placeholder={placeholder}
            className={`flex-1 h-8 text-sm dynamic-checklist-input ${item.checked ? 'line-through text-slate-400 bg-green-50' : ''}`}
            disabled={disabled}
          />
          {!disabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(item.id)}
              className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              tabIndex={-1}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAdd(localItems.length - 1)}
          className="text-xs text-slate-500 hover:text-indigo-600 px-2 h-7"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Item
        </Button>
      )}
    </div>
  );
}