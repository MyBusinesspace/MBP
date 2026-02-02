import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Video, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PostComposer({ onCreated }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [isPosting, setIsPosting] = useState(false);

  const handleFiles = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
  };

  const detectType = (file) => {
    const t = file.type || "";
    if (t.startsWith("video")) return "video";
    return "image";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() && !content.trim() && files.length === 0) return;
    setIsPosting(true);

    try {
      const media_items = [];
      for (const f of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        media_items.push({ url: file_url, type: detectType(f) });
      }

      const post = await base44.entities.WallPost.create({
        title: title.trim() || "",
        content: content.trim() || "",
        media_items,
        likes_user_ids: [],
        reactions: [],
        comments: [],
        is_pinned: false,
        visibility: "department_only"
      });

      setTitle("");
      setContent("");
      setFiles([]);
      onCreated && onCreated(post);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <Input placeholder="Título (p.ej. Empleado de la semana)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Escribe algo para tu equipo..." value={content} onChange={(e) => setContent(e.target.value)} />

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center text-xs text-slate-500">
              {f.type?.startsWith("video") ? <Video className="w-6 h-6" /> : <img className="w-full h-full object-cover" src={URL.createObjectURL(f)} alt={f.name} />}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
          <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFiles} />
          <ImagePlus className="w-4 h-4" /> Añadir fotos/videos
        </label>

        <Button type="submit" disabled={isPosting} className="gap-2">
          {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Publicar
        </Button>
      </div>
    </form>
  );
}