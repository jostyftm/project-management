"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink, Inbox, MessageSquare, AtSign, CheckCircle2, Loader2, Users, UserCheck, ArrowRightLeft, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notificationService } from "@/services/plane/notificationService";
import { Notification } from "@/types/plane-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/enviroments";
import { storage } from "@/lib/storage";
import { ACCESS_TOKEN } from "@/config/constants";

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Quiet fail if session not ready
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notificationService.list();
      setNotifications(list.slice(0, 6));
    } catch {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and real-time SSE stream
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // 30s polling fallback

    // Attempt Server-Sent Events (SSE) live stream connection with auth in query string
    let eventSource: EventSource | null = null;
    try {
      const token = storage.get(ACCESS_TOKEN);
      const currentWs = storage.get("current_workspace") as { id?: number | string } | null;
      if (typeof token === "string" && token && typeof window !== "undefined") {
        const streamUrl = new URL(`${API_BASE_URL}/live-stream`, window.location.origin);
        streamUrl.searchParams.set("token", token);
        if (currentWs?.id) {
          streamUrl.searchParams.set("workspace_id", String(currentWs.id));
        }

        eventSource = new EventSource(streamUrl.toString());

        eventSource.addEventListener("connected", () => {
          // Live stream connected successfully
        });

        eventSource.addEventListener("notification_count", (e) => {
          try {
            const data = JSON.parse(e.data);
            const count = data.unread_count ?? data.count;
            if (typeof count === "number") {
              setUnreadCount(count);
            }
          } catch {}
        });

        eventSource.addEventListener("notification", (e) => {
          try {
            const notif: Notification = JSON.parse(e.data);
            setNotifications((prev) => [notif, ...prev.filter((n) => String(n.id) !== String(notif.id))].slice(0, 6));
            setUnreadCount((prev) => prev + 1);
            toast.info(notif.title || "Nueva notificación", {
              description: notif.message,
            });
          } catch {}
        });
      }
    } catch {}

    return () => {
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [fetchCount]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchRecent();
      fetchCount();
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (String(n.id) === String(notif.id) ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }

    setOpen(false);
    if (notif.target_url) {
      router.push(notif.target_url);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch {
      toast.error("Error al marcar notificaciones");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          title="Notificaciones"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 p-3.5 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Inbox className="size-4 text-indigo-600" />
            <h4 className="font-bold text-sm text-slate-900">Notificaciones</h4>
            {unreadCount > 0 && (
              <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                {unreadCount} sin leer
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 text-xs text-slate-500 hover:text-indigo-600 p-1.5 gap-1"
            >
              <CheckCheck className="size-3.5" />
              <span>Marcar leídas</span>
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-slate-400">
              <Loader2 className="size-5 animate-spin text-indigo-600 mr-2" />
              <span className="text-xs">Cargando notificaciones...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Bell className="size-8 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium text-slate-600">Bandeja al día</p>
              <p className="text-[11px] text-slate-400">No tienes notificaciones pendientes.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 flex items-start gap-3",
                  !n.is_read ? "bg-indigo-50/40" : "bg-white"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {n.type === "MENTION" ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                      <AtSign className="size-3.5" />
                    </div>
                  ) : n.type === "COMMENT" ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <MessageSquare className="size-3.5" />
                    </div>
                  ) : n.type === "ASSIGNMENT" ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <UserCheck className="size-3.5" />
                    </div>
                  ) : n.type === "STATE_CHANGED" ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                      <ArrowRightLeft className="size-3.5" />
                    </div>
                  ) : n.type === "CYCLE_COMPLETED" ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Flag className="size-3.5" />
                    </div>
                  ) : n.type === "PROJECT_INVITATION" || n.type === "PROJECT_MEMBER_ADDED" ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                      <Users className="size-3.5" />
                    </div>
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                      <CheckCircle2 className="size-3.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn("text-xs truncate", !n.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                      {n.title}
                    </p>
                    {!n.is_read && <span className="size-2 rounded-full bg-indigo-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-slate-400 pt-0.5">
                    {new Date(n.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
          <Link
            href="/inbox"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 py-1 transition-colors"
          >
            <span>Abrir Bandeja de Entrada (Inbox)</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
