import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Settings } from "lucide-react";
import PostComposer from "@/components/connection-wall/PostComposer";
import PostCard from "@/components/connection-wall/PostCard";
import ConnectionsWallSettingsPanel from "@/components/connection-wall/ConnectionsWallSettingsPanel.jsx";
import { useData } from "@/components/DataProvider";

export default function ConnectionsWall() {
  const qc = useQueryClient();
  const [openSettings, setOpenSettings] = useState(false);
  const { currentCompany } = useData();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["wall-posts"],
    queryFn: async () => {
      const list = await base44.entities.WallPost.list("-created_date", 1000);
      return list.sort((a, b) => {
        if ((b.is_pinned ? 1 : 0) !== (a.is_pinned ? 1 : 0)) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
        return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      });
    },
    initialData: [],
  });

  // Suscripción en tiempo real para recargar publicaciones al crear/editar/eliminar
  React.useEffect(() => {
    const unsubscribe = base44.entities.WallPost.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
    });
    return unsubscribe;
  }, [qc]);

  const updatePost = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.WallPost.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wall-posts"] }),
  });

  const deletePost = useMutation({
    mutationFn: async (id) => base44.entities.WallPost.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wall-posts"] }),
  });

  const handleToggleLike = (post) => {
    const uid = currentUser?.id;
    if (!uid) return;
    const likes = Array.isArray(post.likes_user_ids) ? [...post.likes_user_ids] : [];
    const idx = likes.indexOf(uid);
    if (idx >= 0) likes.splice(idx, 1); else likes.push(uid);
    updatePost.mutate({ id: post.id, data: { likes_user_ids: likes } });
  };

  const handleAddComment = (post, content) => {
    const comments = Array.isArray(post.comments) ? [...post.comments] : [];
    comments.push({ user_id: currentUser?.id || "me", content, timestamp: new Date().toISOString() });
    updatePost.mutate({ id: post.id, data: { comments } });
  };

  const handleTogglePin = (post) => {
    const is_pinned = !post.is_pinned;
    updatePost.mutate({ id: post.id, data: { is_pinned, pinned_at: is_pinned ? new Date().toISOString() : null } });
  };

  const handleDelete = (post) => {
    if (window.confirm("¿Eliminar esta publicación?")) {
      deletePost.mutate(post.id);
    }
  };

  const handleShareWhatsApp = (post) => {
    const first = Array.isArray(post.media_items) && post.media_items[0] ? post.media_items[0] : null;
    const text = `${post.title || ""}\n\n${post.content || ""}${first ? `\n\n${first.url}` : ""}`.trim();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Debug
  useEffect(() => { console.debug("[Wall] mounted"); }, []);
  useEffect(() => { if (currentUser) console.debug("[Wall] currentUser", { id: currentUser.id }); }, [currentUser]);
  useEffect(() => { console.debug("[Wall] posts", { isLoading, count: posts?.length }); }, [isLoading, posts]);

  return (
    <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
            <img
              src={currentCompany?.connections_wall_tab_icon_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/53fc9b73a_Screenshot2026-01-23at84002AM.png"}
              alt="Wall Icon"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Connections · Wall</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => { console.debug("[Wall] open settings click"); setOpenSettings(true); }} className="gap-2">
          <Settings className="w-4 h-4" /> Settings
        </Button>
      </div>

      <PostComposer onCreated={() => qc.invalidateQueries({ queryKey: ["wall-posts"] })} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando muro...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Aún no hay publicaciones</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onToggleLike={handleToggleLike}
              onAddComment={handleAddComment}
              onTogglePin={handleTogglePin}
              onDelete={handleDelete}
              onShare={handleShareWhatsApp}
            />
          ))}
        </div>
      )}

      <ConnectionsWallSettingsPanel isOpen={openSettings} onClose={() => setOpenSettings(false)} />
    </div>
  );
}