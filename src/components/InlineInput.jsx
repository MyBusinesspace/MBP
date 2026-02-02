import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

export default function InlineInput({ value, onSave, placeholder, className, disabled }) {
  const [currentValue, setCurrentValue] = useState(value || '');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value || '');
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== (value || '')) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setCurrentValue(value || '');
      inputRef.current?.blur();
    }
  };

  if (disabled) {
    return <span className={`${className || 'text-sm'} truncate block`}>{value || '-'}</span>;
  }

  return (
    <Input
      ref={inputRef}
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`w-full bg-transparent border-none h-auto p-1 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:outline-none ${className || ''} ${!isEditing ? 'truncate' : ''}`}
    />
  );
}