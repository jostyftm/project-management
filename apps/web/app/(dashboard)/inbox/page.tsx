"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox,
  CheckCheck,
  Check,
  AtSign,
  MessageSquare,
  CheckCircle2,
  Bell,
  Loader2,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { notificationService } from "@/services/plane/notificationService";
import { Notification } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function InboxPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all");

  useDocumentTitle("Bandeja de Entrada");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const list = await notificationService.list();
      setNotifications(list);
    } catch (err) {
      console.error("Error loading inbox notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notif: Notification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (notif.is_read) return;

    try {
      await notificationService.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (String(n.id) === String(notif.id) ? { ...n, is_read: true } : n))
      );
      toast.success("Notificación marcada como leída");
    } catch {
      toast.error("Error al actualizar notificación");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch {
      toast.error("Error al marcar todas las notificaciones");
    }
  };

  const handleOpenNotification = async (notif: Notification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif);
    }
    if (notif.target_url) {
      router.push(notif.target_url);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === "unread") return !n.is_read;
    if (filterTab === "mentions") return n.type === "MENTION";
    if (filterTab === "assignments") return n.type === "ASSIGNMENT";
    if (filterTab === "comments") return n.type === "COMMENT";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/your-work" className="hover:text-indigo-600 transition-colors">
              Tu trabajo
            </Link>
            <ChevronRight className="size-3 text-slate-300" />
            <span className="font-semibold text-slate-800">Bandeja de Entrada</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Inbox className="size-6 text-indigo-600" />
              <span>Bandeja de Entrada</span>
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                {unreadCount} sin leer
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            className="border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 text-xs font-semibold gap-1.5 h-9"
          >
            <CheckCheck className="size-4" />
            <span>Marcar todas como leídas</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={filterTab} onValueChange={setFilterTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="all" className="text-xs">
            Todas ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">
            No leídas ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="mentions" className="text-xs">
            Menciones ({notifications.filter((n) => n.type === "MENTION").length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs">
            Asignaciones ({notifications.filter((n) => n.type === "ASSIGNMENT").length})
          </TabsTrigger>
          <TabsTrigger value="comments" className="text-xs">
            Comentarios ({notifications.filter((n) => n.type === "COMMENT").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterTab} className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
              <Loader2 className="size-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-sm">Cargando notificaciones...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
              <Bell className="size-10 text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-700 text-base">No hay notificaciones aquí</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                {filterTab === "unread"
                  ? "Estás al día. No tienes notificaciones pendientes por revisar."
                  : "No se encontraron notificaciones en esta categoría."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotifications.map((notif) => {
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleOpenNotification(notif)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 shadow-xs hover:border-indigo-300",
                      !notif.is_read
                        ? "bg-white border-indigo-200/90 hover:bg-slate-50/50"
                        : "bg-slate-50/60 border-slate-200/80 hover:bg-white"
                    )}
                  >
                    {/* Icon Badge */}
                    <div className="mt-0.5 shrink-0">
                      {notif.type === "MENTION" ? (
                        <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                          <AtSign className="size-4" />
                        </div>
                      ) : notif.type === "COMMENT" ? (
                        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                          <MessageSquare className="size-4" />
                        </div>
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                          <CheckCircle2 className="size-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <h4
                            className={cn(
                              "text-sm truncate",
                              !notif.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700"
                            )}
                          >
                            {notif.title}
                          </h4>
                          {!notif.is_read && (
                            <span className="size-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>

                        <span className="text-xs text-slate-400 shrink-0">
                          {new Date(notif.created_at).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line line-clamp-2">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-indigo-600 font-semibold">
                        <span className="inline-flex items-center gap-1 hover:underline">
                          Abrir elemento <ExternalLink className="size-3" />
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 self-center">
                      {!notif.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleMarkAsRead(notif, e)}
                          title="Marcar como leída"
                          className="size-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                        >
                          <Check className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
