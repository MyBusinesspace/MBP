import * as React from "react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, onCheckedChange, onChange, ...props }, ref) => {
  const handleChange = (e) => {
    if (typeof onChange === 'function') onChange(e);
    if (typeof onCheckedChange === 'function') onCheckedChange(e.target.checked);
  };
  return (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:text-primary-foreground",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  );
})
Checkbox.displayName = "Checkbox"

export { Checkbox }