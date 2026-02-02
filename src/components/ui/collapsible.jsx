import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

const CollapsibleContext = createContext();

export function Collapsible({ open: controlledOpen, onOpenChange, children, defaultOpen = false }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const handleToggle = () => {
    const newState = !isOpen;
    if (controlledOpen === undefined) {
      setInternalOpen(newState);
    }
    if (onOpenChange) {
      onOpenChange(newState);
    }
  };

  return (
    <CollapsibleContext.Provider value={{ isOpen, handleToggle }}>
      {children}
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({ children, asChild, ...props }) {
  const { handleToggle } = useContext(CollapsibleContext);
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        handleToggle();
        if (children.props.onClick) {
          children.props.onClick(e);
        }
      }
    });
  }

  return (
    <button type="button" onClick={handleToggle} {...props}>
      {children}
    </button>
  );
}

export function CollapsibleContent({ children, className, ...props }) {
  const { isOpen } = useContext(CollapsibleContext);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-top-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}