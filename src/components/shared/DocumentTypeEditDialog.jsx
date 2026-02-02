import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function DocumentTypeEditDialog({
  open,
  title = "Edit Document Type",
  types = [],
  currentTypeId = null,
  onSave,
  onClose,
}) {
  const [selected, setSelected] = React.useState(currentTypeId || "");
  React.useEffect(() => { setSelected(currentTypeId || ""); }, [currentTypeId]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm text-slate-700">Document Type</label>
          <Select value={selected || ""} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave?.(selected)} disabled={!selected}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}