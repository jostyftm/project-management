"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Comment, Activity, User } from "@/types/plane-types";
import { commentService } from "@/services/plane/commentService";
import { activityService } from "@/services/plane/activityService";
import { projectMemberService, ProjectMemberUser } from "@/services/plane/projectMemberService";
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

interface MentionableMember {
  id: string | number;
  name?: string | null;
  email: string;
  avatar_url?: string | null;
  role?: string | null;
}

interface Props {
  workItemId?: string | number | null;
  pageId?: string | number | null;
  projectId?: string | number | null;
  availableMembers?: (User | ProjectMemberUser | MentionableMember)[];
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

  // Members list for mentions with auto-fetching fallback
  const [members, setMembers] = useState<MentionableMember[]>(
    (availableMembers as MentionableMember[]) || []
  );

  // Auto-fetch project members if none provided and projectId is present
  useEffect(() => {
    if (availableMembers && availableMembers.length > 0) {
      setMembers(availableMembers as MentionableMember[]);
    } else if (projectId) {
      projectMemberService
        .list(projectId)
        .then((res) => {
          if (res?.members && res.members.length > 0) {
            setMembers(res.members);
          }
        })
        .catch(() => {});
    }
  }, [availableMembers, projectId]);

  // New comment input and mention autocomplete state
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

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
  const timeline: TimelineEntry[] = useMemo(() => {
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

  // Filter members based on active mention query
  const filteredSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => {
      const nameMatch = m.name?.toLowerCase().includes(q);
      const emailMatch = m.email.toLowerCase().includes(q);
      return nameMatch || emailMatch;
    });
  }, [mentionQuery, members]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredSuggestions.length) {
      setSelectedIndex(0);
    }
  }, [filteredSuggestions.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (suggestionsRef.current && filteredSuggestions.length > 0) {
      const activeEl = suggestionsRef.current.children[selectedIndex + 1] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filteredSuggestions.length]);

  const checkMentionTrigger = (text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Check that @ is preceded by start of string or whitespace
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      if (/\s/.test(charBeforeAt)) {
        const queryText = textBeforeCursor.slice(lastAtIndex + 1);
        // Ensure no whitespace between @ and cursor
        if (!/\s/.test(queryText)) {
          setMentionQuery(queryText);
          setMentionStartIndex(lastAtIndex);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setMentionQuery(null);
    setMentionStartIndex(-1);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(val);
    checkMentionTrigger(val, cursorPos);
  };

  const handleSelectMention = (member: MentionableMember) => {
    if (mentionStartIndex === -1 || !textareaRef.current) return;

    const mentionName = member.name?.trim() || member.email.split("@")[0];
    const cursorPos = textareaRef.current.selectionStart || newComment.length;
    const textBeforeAt = newComment.slice(0, mentionStartIndex);
    const textAfterCursor = newComment.slice(cursorPos);

    const updatedText = `${textBeforeAt}@${mentionName} ${textAfterCursor}`;
    setNewComment(updatedText);
    setMentionQuery(null);
    setMentionStartIndex(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextCursorPos = textBeforeAt.length + mentionName.length + 2; // '@' + name + ' '
        textareaRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMention(filteredSuggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        setMentionStartIndex(-1);
        return;
      }
    }

    // Ctrl+Enter or Cmd+Enter to submit
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
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
      setMentionQuery(null);
      setMentionStartIndex(-1);
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

  // Render mentions with visual badge in comment text
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_\-\.]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@") && part.length > 1) {
        const username = part.slice(1);
        return (
          <span
            key={index}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/70 dark:border-indigo-800 text-[11px] align-baseline"
          >
            <AtSign className="size-2.5 inline shrink-0 text-indigo-500" />
            <span>{username}</span>
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderActivityText = (act: Activity) => {
    const actorName = act.actor?.name || "Un usuario";

    switch (act.action) {
      case "STATE_CHANGED": {
        const from = act.changes_diff?.from?.name || "Anterior";
        const to = act.changes_diff?.to?.name || "Nuevo";
        return (
          <span>
            <strong>{actorName}</strong> cambió el estado de{" "}
            <span className="font-semibold text-slate-700">{from}</span> a{" "}
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
            <p className="text-[11px] text-slate-400">
              Sé el primero en iniciar la conversación con un comentario.
            </p>
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
                    ? "bg-indigo-50/40 border-indigo-100/80 dark:bg-indigo-950/20 dark:border-indigo-900/40"
                    : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px] shrink-0">
                      {comment.user?.name ? comment.user.name.substring(0, 2).toUpperCase() : "U"}
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {comment.user?.name || "Usuario"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>
                      {entry.date.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
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

                <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-8">
                  {renderCommentContent(comment.content)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mention helper popover list con Autocompletado Interactivo */}
      {mentionQuery !== null && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="p-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/70 rounded-xl shadow-xl max-h-48 overflow-y-auto space-y-1 text-xs animate-in fade-in-50 zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <AtSign className="size-3" />
              Mencionar miembro del proyecto:
            </span>
            <span className="text-[9px] lowercase font-normal text-slate-400">
              Usa ↑ ↓ y Enter
            </span>
          </div>
          {filteredSuggestions.map((m, idx) => {
            const isSelected = idx === selectedIndex;
            const initials = (m.name || m.email).substring(0, 2).toUpperCase();
            return (
              <div
                key={m.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleSelectMention(m)}
                className={cn(
                  "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors",
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-200 border-l-2 border-indigo-600 pl-2"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px] shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs truncate">
                      {m.name || "Usuario"}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {m.email}
                    </p>
                  </div>
                </div>

                {m.role && (
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono shrink-0",
                      m.role === "ADMIN"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {m.role}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Textarea
          ref={textareaRef}
          placeholder="Escribe un comentario... Usa @ para autocompletar compañeros del proyecto"
          value={newComment}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={2}
          className="text-xs resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Escribe <strong>@</strong> para autocompletar · Markdown compatible
          </span>
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
