import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Heart, MessageCircle, MoreHorizontal, Pin, PinOff, Share2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import MediaCarousel from "./MediaCarousel";
import { useData } from "@/components/DataProvider";
import Avatar from "@/components/Avatar";

export default function PostCard({ post, currentUser, onToggleLike, onAddComment, onTogglePin, onDelete, onShare }) {
  const [commentText, setCommentText] = useState("");
  const { users: allUsers = [] } = useData();
  const usersById = useMemo(() => {
    const m = {};
    (allUsers || []).forEach((u) => { if (u?.id) m[u.id] = u; });
    return m;
  }, [allUsers]);

  const liked = useMemo(() => {
    const uid = currentUser?.id;
    return Boolean(uid && Array.isArray(post?.likes_user_ids) && post.likes_user_ids.includes(uid));
  }, [post, currentUser]);

  const likesCount = post?.likes_user_ids?.length || 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{post.title || "Publicación"}</div>
          <div className="text-[11px] text-slate-500 truncate">
            {post.created_date ? format(new Date(post.created_date), 'dd/MM/yyyy HH:mm') : ''}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onTogglePin(post)} className="gap-2">
              {post.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />} {post.is_pinned ? 'Desfijar' : 'Fijar en el muro'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(post)} className="gap-2">
              <Share2 className="w-4 h-4" /> Compartir por WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(post)} className="gap-2 text-red-600">
              <Trash2 className="w-4 h-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      {Array.isArray(post.media_items) && post.media_items.length > 0 && (
        <div className="px-4 pb-3">
          <MediaCarousel items={post.media_items} />
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-2 text-sm text-slate-800 whitespace-pre-wrap">{post.content}</div>
      )}

      {/* Actions */}
      <div className="px-4 py-2 flex items-center gap-3 border-t border-slate-100">
        <Button variant={liked ? "secondary" : "outline"} size="sm" onClick={() => onToggleLike(post)} className="gap-1">
          <Heart className={`w-4 h-4 ${liked ? 'text-rose-600 fill-rose-600' : ''}`} /> {likesCount}
        </Button>
        <Badge variant="secondary" className="text-[11px]">{post.comments?.length || 0} comentarios</Badge>
      </div>

      {/* Comments */}
      <div className="px-4 pb-3 space-y-2">
        {(post.comments || []).slice(-3).map((c, i) => {
          const u = usersById[c.user_id];
          const name = u?.full_name || u?.name || u?.email || c.user_name || 'Usuario';
          const avatarSrc = u?.avatar_url;
          return (
            <div key={i} className="flex items-start gap-2 text-[13px] bg-slate-50 rounded-lg p-2">
              <Avatar user={u} name={name} src={avatarSrc} size="sm" />
              <div className="min-w-0">
                <div className="font-medium leading-tight truncate">{name}</div>
                <div className="text-slate-600 break-words">{c.content}</div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            placeholder="Escribe un comentario..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && commentText.trim()) {
                onAddComment(post, commentText.trim());
                setCommentText('');
              }
            }}
          />
          <Button size="sm" onClick={() => { if (commentText.trim()) { onAddComment(post, commentText.trim()); setCommentText(''); } }} className="gap-1">
            <MessageCircle className="w-4 h-4" /> Comentar
          </Button>
        </div>
      </div>
    </div>
  );
}