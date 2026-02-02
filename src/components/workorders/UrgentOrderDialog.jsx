import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Image as ImageIcon, UploadCloud } from "lucide-react";

export default function UrgentOrderDialog({
  isOpen,
  onClose,
  projects = [],
  currentUser,
  currentCompany,
  onCreated,
}) {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [fileUrls, setFileUrls] = useState([]);
  const [assignToMe, setAssignToMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const reset = () => {
    setProjectId("");
    setTitle("");
    setInstructions("");
    setFileUrls([]);
    setAssignToMe(false);
  };

  const handleUploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const res = await base44.integrations.Core.UploadFile({ file });
        if (res?.file_url) uploaded.push(res.file_url);
      }
      setFileUrls((prev) => [...prev, ...uploaded]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!projectId || !title) return; // minimal required
    setIsSubmitting(true);
    try {
      const project = projects.find((p) => p.id === projectId);
      const payload = {
        project_id: projectId,
        branch_id: project?.branch_id || currentCompany?.id || null,
        title,
        status: "open",
        is_urgent: true,
        work_description_items: instructions
          ? [{ id: null, text: instructions, checked: false }]
          : [],
        file_urls: fileUrls,
        employee_ids: assignToMe && currentUser?.id ? [currentUser.id] : [],
        team_ids: [],
      };
      const created = await base44.entities.TimeEntry.create(payload);
      if (onCreated) onCreated(created);
      reset();
      onClose?.();
    } catch (_) {
      // surfacing errors via platform toast elsewhere if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) { reset(); onClose?.(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Create Urgent Order (No Schedule)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm text-slate-700">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex flex-col">
                      <span className="text-sm">{p.name}</span>
                      {p.location_name || p.address ? (
                        <span className="text-[11px] text-slate-500">
                          {p.location_name || p.address}
                        </span>
                      ) : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-700">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short description (e.g., Hoist breakdown)"
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-700">Instructions (optional)</label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add quick instructions for the team"
              className="min-h-[90px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-700">Attach photo (optional)</label>
            <label className="flex items-center gap-2 w-full h-10 px-3 rounded-md border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 text-sm">
              <UploadCloud className="w-4 h-4 text-slate-500" />
              <span>Upload image</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadFiles} />
            </label>
            {(isUploading || fileUrls.length > 0) && (
              <div className="text-xs text-slate-600">
                {isUploading ? "Uploading..." : `${fileUrls.length} file(s) attached`}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={assignToMe}
              onChange={(e) => setAssignToMe(e.target.checked)}
              className="w-4 h-4"
            />
            Assign to me now
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose?.(); }} disabled={isSubmitting || isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!projectId || !title || isSubmitting || isUploading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Create Urgent Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}