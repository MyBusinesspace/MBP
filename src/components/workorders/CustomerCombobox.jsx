import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronsUpDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerCombobox({ customers = [], selectedCustomerId, onSelectCustomer, disabled = false, placeholder = "Select customer..." }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    if (!search) return list.slice(0, 200);
    const s = search.toLowerCase();
    return list.filter(c => (c.name || "").toLowerCase().includes(s)).slice(0, 200);
  }, [customers, search]);

  const current = useMemo(() => customers.find(c => c.id === selectedCustomerId) || null, [customers, selectedCustomerId]);

  const handleSelect = (id) => {
    if (onSelectCustomer) onSelectCustomer(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", !current && "text-slate-400")}
        >
          {current ? current.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1 overscroll-contain">
          <div
            onClick={() => handleSelect(null)}
            className={cn(
              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100",
              !current && "bg-slate-100"
            )}
          >
            <Check className={cn("mr-2 h-4 w-4", !current ? "opacity-100" : "opacity-0")} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-500 italic">No customer</div>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No customers found.</div>
          ) : (
            filtered.map(c => {
              const isSel = current?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100",
                    isSel && "bg-slate-100"
                  )}
                >
                  <Check className={cn("mr-2 h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}