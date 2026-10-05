"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/config/enviroments";
import { storage } from "@/lib/storage";
import { ACCESS_TOKEN } from "@/config/constants";
import { Notification } from "@/types/plane-types";

interface UseLiveStreamOptions {
  onNotification?: (notification: Notification) => void;
  onNotificationCount?: (count: number) => void;
  onConnected?: (data: { status: string; workspace_id?: number | string }) => void;
  enabled?: boolean;
}

/**
 * Hook reactivo para conectarse al canal de Server-Sent Events (SSE) autenticado vía query param
 */
export function useLiveStream({
  onNotification,
  onNotificationCount,
  onConnected,
  enabled = true,
}: UseLiveStreamOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const token = storage.get(ACCESS_TOKEN);
    const currentWs = storage.get("current_workspace") as { id?: number | string } | null;

    if (typeof token !== "string" || !token) return;

    try {
      const streamUrl = new URL(`${API_BASE_URL}/live-stream`);
      streamUrl.searchParams.set("token", token);
      if (currentWs?.id) {
        streamUrl.searchParams.set("workspace_id", String(currentWs.id));
      }

      const es = new EventSource(streamUrl.toString());
      eventSourceRef.current = es;

      es.addEventListener("connected", (e) => {
        try {
          const data = JSON.parse(e.data);
          onConnected?.(data);
        } catch {}
      });

      es.addEventListener("notification_count", (e) => {
        try {
          const data = JSON.parse(e.data);
          const count = data.unread_count ?? data.count;
          if (typeof count === "number") {
            onNotificationCount?.(count);
          }
        } catch {}
      });

      es.addEventListener("notification", (e) => {
        try {
          const notif = JSON.parse(e.data);
          onNotification?.(notif);
        } catch {}
      });

      es.onerror = () => {
        // En caso de corte de red el navegador reintenta la reconexión SSE automáticamente
      };

      return () => {
        es.close();
        eventSourceRef.current = null;
      };
    } catch (err) {
      console.warn("[LiveStream] Error initializing EventSource:", err);
    }
  }, [enabled, onNotification, onNotificationCount, onConnected]);

  return {
    close: () => eventSourceRef.current?.close(),
  };
}
