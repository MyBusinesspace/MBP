import { useState, useEffect, useRef, useContext, createContext, Children } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const SelectContext = createContext(null);

export function Select({ value, onValueChange, children, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value != null ? String(value) : '');
  const [selectedLabel, setSelectedLabel] = useState('');
  const triggerRef = useRef(null);

  useEffect(() => {
    if (value != null) {
      setSelectedValue(String(value));
    }
  }, [value]);

  useEffect(() => {
    // removed debug log
  }, [isOpen]);

  const contextValue = {
    isOpen,
    setIsOpen,
    disabled,
    triggerRef,
    selectedValue,
    setSelectedValue,
    selectedLabel,
    setSelectedLabel,
    onValueChange
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const context = useContext(SelectContext);

  if (!context) {
    return (
      <div className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
        className
      )}>
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </div>
    );
  }

  return (
    <button
      ref={context.triggerRef}
      type="button"
      onClick={(e) => {
        // removed debug log
        if (!context.disabled) {
          context.setIsOpen(!context.isOpen);
        }
      }}
      disabled={context.disabled}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-slate-950",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="flex-1 truncate text-left pr-2">{children}</span>
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", context.isOpen && "rotate-180")} />
    </button>
  );
}

export function SelectValue({ placeholder, children, asChild }) {
  const context = useContext(SelectContext);

  if (!context) {
    return <span>{placeholder || ''}</span>;
  }

  // If children is provided, always render children (custom content)
  if (children) {
    return <>{children}</>;
  }
  
  // Default behavior: show selectedLabel or value or placeholder
  const text = context.selectedLabel || placeholder || '';
  return <span>{text}</span>;
}

export function SelectContent({ className, children, position = "popper", side = "bottom", align = "start" }) {
  const context = useContext(SelectContext);
  const contentRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!context?.isOpen || !context.triggerRef.current) {
      return;
    }
    
    const update = () => {
      if (!context.triggerRef.current) return;
      const rect = context.triggerRef.current.getBoundingClientRect();
      
      let top = rect.bottom + 4;
      let left = rect.left;
      
      // Handle side positioning
      if (side === "top") {
        top = rect.top - 4;
      } else if (side === "bottom") {
        top = rect.bottom + 4;
      }
      
      // Handle align positioning
      if (align === "end") {
        left = rect.right - rect.width;
      } else if (align === "center") {
        left = rect.left + (rect.width / 2);
      }
      
      // removed debug log
      
      setPos({ 
        top, 
        left, 
        width: rect.width 
      });
    };
    
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [context?.isOpen, side, align]);

  useEffect(() => {
    if (!context?.isOpen) return;
    
    const onClick = (e) => {
      if (contentRef.current && !contentRef.current.contains(e.target) &&
          context.triggerRef.current && !context.triggerRef.current.contains(e.target)) {
        context.setIsOpen(false);
      }
    };
    
    const onKey = (e) => {
      if (e.key === 'Escape') context.setIsOpen(false);
    };
    
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [context?.isOpen]);

  if (!context?.isOpen) {
    return null;
  }

  // Build filtered children when searching (recursively extract text)
  const childrenArray = Children.toArray(children);
  const getText = (node) => {
    if (node == null) return '';
    const t = typeof node;
    if (t === 'string' || t === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getText).join(' ');
    if (node && node.props && 'children' in node.props) return getText(node.props.children);
    return '';
  };
  const filteredChildren = query
    ? childrenArray.filter((child) => {
        try {
          const text = getText(child?.props?.children).toLowerCase();
          return text.includes(query.toLowerCase());
        } catch {
          return true;
        }
      })
    : childrenArray;

  return (
    <div
      ref={contentRef}
      className={cn(
        "fixed z-[99999] min-w-[8rem] overflow-hidden rounded-md border bg-white shadow-lg",
        "max-h-[70vh] overflow-y-auto overscroll-contain",
        className
      )}
      style={{ 
        top: `${pos.top}px`, 
        left: `${pos.left}px`, 
        minWidth: `${pos.width}px` 
      }}
    >
      <div className="p-2 border-b bg-slate-50">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="h-8 text-xs"
        />
      </div>
      <div className="p-1 max-h-[60vh] overflow-y-auto">{filteredChildren}</div>
    </div>
  );
}

export function SelectItem({ value, children, className, ...props }) {
  const context = useContext(SelectContext);
  const itemRef = useRef(null);
  
  if (!context) {
    return (
      <div className={cn("py-1.5 pl-8 pr-2 text-sm", className)}>
        {children}
      </div>
    );
  }
  
  const val = value != null ? String(value) : '';
  const selected = context.selectedValue === val;

  return (
    <div
      ref={itemRef}
      onClick={(e) => {
        e.stopPropagation();
        const label = itemRef.current?.textContent?.trim() || '';
        context.setSelectedValue(val);
        context.setSelectedLabel(label);
        context.setIsOpen(false);
        if (context.onValueChange) context.onValueChange(val);
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm",
        "hover:bg-slate-100",
        selected && "bg-slate-100",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {selected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  );
}

export function SelectGroup({ children }) {
  return <div className="p-1">{children}</div>;
}

export function SelectLabel({ className, children }) {
  return <div className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}>{children}</div>;
}

export function SelectSeparator({ className }) {
  return <div className={cn("-mx-1 my-1 h-px bg-slate-100", className)} />;
}