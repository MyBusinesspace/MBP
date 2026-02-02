import * as React from "react";
import { cn } from "@/lib/utils";

// Lightweight Calendar shim without external deps.
// Supports mode="single" and mode="range" using native date inputs.
// Props handled: mode, selected, onSelect, className, disabled

function toDateInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value) {
  if (!value) return undefined;
  // Create date at local midnight
  const [y, m, d] = value.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  className,
  disabled,
  ..._props
}) {
  // Range local state mirrors the selected prop
  const [range, setRange] = React.useState(() => ({
    from: selected?.from || undefined,
    to: selected?.to || undefined,
  }));

  React.useEffect(() => {
    if (mode === "range" && selected && (selected.from !== range.from || selected.to !== range.to)) {
      setRange({ from: selected.from, to: selected.to });
    }
  }, [mode, selected?.from, selected?.to]);

  if (mode === "range") {
    const fromValue = toDateInputValue(range.from);
    const toValue = toDateInputValue(range.to);

    return (
      <div className={cn("grid gap-2", className)}>
        <div className="text-xs text-slate-500">Start date</div>
        <input
          type="date"
          className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={fromValue}
          onChange={(e) => {
            const newFrom = fromDateInputValue(e.target.value);
            const next = { from: newFrom, to: range.to };
            setRange(next);
            onSelect && onSelect(next);
          }}
          disabled={disabled}
        />
        <div className="text-xs text-slate-500">End date</div>
        <input
          type="date"
          className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={toValue}
          onChange={(e) => {
            const newTo = fromDateInputValue(e.target.value);
            const next = { from: range.from, to: newTo };
            setRange(next);
            onSelect && onSelect(next);
          }}
          disabled={disabled}
        />
      </div>
    );
  }

  // Single mode
  const singleValue = toDateInputValue(selected);
  return (
    <input
      type="date"
      className={cn(
        "h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      value={singleValue}
      onChange={(e) => {
        const d = fromDateInputValue(e.target.value);
        onSelect && onSelect(d);
      }}
      disabled={disabled}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };