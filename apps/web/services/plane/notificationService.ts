import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Notification } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const notificationService = {
  list: async (filters?: { unread?: boolean; type?: string }): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (filters?.unread !== undefined) {
      params.append("unread", String(filters.unread));
    }
    if (filters?.type) {
      params.append("type", filters.type);
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await httpRequestService<{ data: JsonApiItem<Notification>[] }>({
      url: `${API_BASE_URL}/notifications${query}`,
      method: "GET",
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      actor: item.relationships?.actor?.data?.attributes
        ? { id: item.relationships.actor.data.id, ...item.relationships.actor.data.attributes }
        : undefined,
    }));
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await httpRequestService<{ unread_count: number }>({
      url: `${API_BASE_URL}/notifications/unread-count`,
      method: "GET",
    });

    return res.unread_count;
  },

  markAsRead: async (notificationId: string | number): Promise<Notification> => {
    const res = await httpRequestService<{ data: JsonApiItem<Notification> }>({
      url: `${API_BASE_URL}/notifications/${notificationId}/read`,
      method: "POST",
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      actor: res.data.relationships?.actor?.data?.attributes
        ? { id: res.data.relationships.actor.data.id, ...res.data.relationships.actor.data.attributes }
        : undefined,
    };
  },

  markAllAsRead: async (): Promise<number> => {
    const res = await httpRequestService<{ marked_count: number }>({
      url: `${API_BASE_URL}/notifications/read-all`,
      method: "POST",
    });

    return res.marked_count;
  },
};
