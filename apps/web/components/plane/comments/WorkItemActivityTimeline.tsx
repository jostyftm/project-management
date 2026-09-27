"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Comment, Activity, User } from "@/types/plane-types";
import { commentService } from "@/services/plane/commentService";
import { activityService } from "@/services/plane/activityService";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  AtSign,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  workItemId?: string | number | null;
  pageId?: string | number | null;
  projectId?: string | number | null;
  availableMembers?: User[];
}

type TimelineEntry =
  | { type: "comment"; id: string; data: Comment; date: Date }
  | { type: "activity"; id: string; data: Activity; date: Date };

export function WorkItemActivityTimeline({
  workItemId,
  pageId,
  projectId,
  availableMembers = [],
}: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // New comment
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentionHelper, setShowMentionHelper] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (workItemId) {
        const [cList, aList] = await Promise.all([
          commentService.listByWorkItem(workItemId),
          activityService.listByWorkItem(workItemId),
        ]);
        setComments(cList);
        setActivities(aList);
      } else if (pageId) {
        const cList = await commentService.listByPage(pageId);
        setComments(cList);
        setActivities([]);
      }
    } catch (err) {
      console.error("Error loading timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [workItemId, pageId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine comments and activities into single chronological stream
  const timeline: TimelineEntry[] = React.useMemo(() => {
    const list: TimelineEntry[] = [];

    comments.forEach((c) => {
      list.push({
        type: "comment",
        id: `c-${c.id}`,
        data: c,
        date: new Date(c.created_at),
      });
    });

    activities.forEach((a) => {
      // Don't duplicate COMMENTED activity if we already render the actual comment
      if (a.action !== "COMMENTED") {
        list.push({
          type: "activity",
          id: `a-${a.id}`,
          data: a,
          date: new Date(a.created_at),
        });
      }
    });

    // Sort ascending (chronological conversation flow)
    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [comments, activities]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    // Show mention helper if last character typed is @
    if (val.endsWith("@")) {
      setShowMentionHelper(true);
    } else if (!val.includes("@")) {
      setShowMentionHelper(false);
    }
  };

  const handleInsertMention = (member: User) => {
    // Replace the trailing @ or append mention
    const prefix = newComment.endsWith("@") ? newComment.slice(0, -1) : newComment;
    setNewComment(`${prefix}@${member.name || member.email} `);
    setShowMentionHelper(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await commentService.create({
        content: newComment.trim(),
        work_item_id: workItemId || undefined,
        page_id: pageId || undefined,
        project_id: projectId || undefined,
      });

      setComments((prev) => [...prev, created]);
      setNewComment("");
      setShowMentionHelper(false);
      toast.success("Comentario publicado");
    } catch {
      toast.error("Error al publicar comentario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    try {
      await commentService.delete(commentId);
      setComments((prev) => prev.filter((c) => String(c.id) !== String(commentId)));
      toast.success("Comentario eliminado");
    } catch {
      toast.error("Error al eliminar comentario");
    }
  };

  const renderActivityText = (act: Activity) => {
    const actorName = act.actor?.name || "Un usuario";

    switch (act.action) {
      case "STATE_CHANGED": {
        const from = act.changes_diff?.from?.name || "Anterior";
        const to = act.changes_diff?.to?.name || "Nuevo";
        return (
          <span>
            <strong>{actorName}</strong> cambió el estado de <span className="font-semibold text-slate-700">{from}</span> a{" "}
            <span className="font-semibold text-indigo-700">{to}</span>
          </span>
        );
      }
      case "CREATED":
        return (
          <span>
            <strong>{actorName}</strong> creó este elemento
          </span>
        );
      case "ASSIGNED":
        return (
          <span>
            <strong>{actorName}</strong> actualizó los miembros asignados
          </span>
        );
      default:
        return (
          <span>
            <strong>{actorName}</strong> realizó la acción <em>{act.action}</em>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Stream Area */}
      <div className="flex-1 space-y-3 min-h-[220px] max-h-[380px] overflow-y-auto p-1 pr-2">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-slate-400">
            <Loader2 className="size-5 animate-spin text-indigo-600 mr-2" />
            <span className="text-xs">Cargando actividad...</span>
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 border border-dashed rounded-xl">
            <MessageSquare className="size-6 text-slate-300 mb-1.5" />
            <p className="text-xs font-semibold text-slate-600">Sin actividad aún</p>
            <p className="text-[11px] text-slate-400">Sé el primero en iniciar la conversación con un comentario.</p>
          </div>
        ) : (
          timeline.map((entry) => {
            if (entry.type === "activity") {
              const act = entry.data as Activity;
              return (
                <div key={entry.id} className="flex items-center gap-2.5 py-1 text-xs text-slate-500">
                  <div className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                    <Clock className="size-3" />
                  </div>
                  <div className="min-w-0 flex-1 truncate">{renderActivityText(act)}</div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {entry.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            }

            const comment = entry.data as Comment;
            const isAuthor = String(comment.user_id) === String(user?.id);

            return (
              <div
                key={entry.id}
                className={cn(
                  "p-3 rounded-xl border text-xs space-y-1.5 transition-colors",
                  isAuthor
                    ? "bg-indigo-50/40 border-indigo-100/80"
                    : "bg-white border-slate-200"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      {comment.user?.name ? comment.user.name.substring(0, 2).toUpperCase() : "U"}
                    </div>
                    <span className="font-bold text-slate-800">{comment.user?.name || "Usuario"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{entry.date.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Eliminar comentario"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-slate-700 leading-relaxed whitespace-pre-line pl-8">
                  {comment.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mention helper popover list */}
      {showMentionHelper && availableMembers.length > 0 && (
        <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-md max-h-36 overflow-y-auto space-y-0.5 text-xs">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Mencionar miembro (@):
          </p>
          {availableMembers.map((m) => (
            <div
              key={m.id}
              onClick={() => handleInsertMention(m)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
            >
              <AtSign className="size-3 text-slate-400" />
              <span className="font-medium text-slate-800">{m.name}</span>
              <span className="text-[11px] text-slate-400">({m.email})</span>
            </div>
          ))}
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-slate-100">
        <Textarea
          placeholder="Escribe un comentario... Usa @ para mencionar a tus compañeros"
          value={newComment}
          onChange={handleTextChange}
          rows={2}
          className="text-xs resize-none bg-white border-slate-200 focus-visible:ring-indigo-500"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Markdown compatible</span>
          <Button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
            className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 font-semibold cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span>Comentar</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
