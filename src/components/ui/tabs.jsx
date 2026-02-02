import React, { createContext, useContext, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext();

export function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [activeTab, setActiveTab] = useState(defaultValue || value);

  // Support controlled mode
  useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value);
    }
  }, [value]);

  const handleSetActiveTab = (newValue) => {
    if (value === undefined) {
      // Uncontrolled mode
      setActiveTab(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-nowrap h-10 items-center justify-start rounded-md bg-slate-100 p-1 text-slate-500 w-full overflow-x-auto gap-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children, ...props }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 h-9 leading-none text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shrink-0",
        isActive && "bg-white text-slate-950 shadow-sm",
        !isActive && "text-slate-500 hover:text-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const TabsContent = React.forwardRef(function TabsContent(
  { value, className, children, ...props },
  ref
) {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});