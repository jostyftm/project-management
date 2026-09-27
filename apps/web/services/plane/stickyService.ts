import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Sticky } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const stickyService = {
  list: async (): Promise<Sticky[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Sticky>[] }>({
      url: `${API_BASE_URL}/stickies`,
      method: "GET",
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      creator: item.relationships?.creator?.data,
    }));
  },

  create: async (payload: {
    content: string;
    color?: string;
    is_pinned?: boolean;
    is_private?: boolean;
    position_x?: number;
    position_y?: number;
  }): Promise<Sticky> => {
    const res = await httpRequestService<{ data: JsonApiItem<Sticky> }>({
      url: `${API_BASE_URL}/stickies`,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      creator: res.data.relationships?.creator?.data,
    };
  },

  update: async (stickyId: string | number, payload: Partial<Sticky>): Promise<Sticky> => {
    const res = await httpRequestService<{ data: JsonApiItem<Sticky> }>({
      url: `${API_BASE_URL}/stickies/${stickyId}`,
      method: "PUT",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      creator: res.data.relationships?.creator?.data,
    };
  },

  togglePin: async (stickyId: string | number): Promise<Sticky> => {
    const res = await httpRequestService<{ data: JsonApiItem<Sticky> }>({
      url: `${API_BASE_URL}/stickies/${stickyId}/pin`,
      method: "POST",
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      creator: res.data.relationships?.creator?.data,
    };
  },

  togglePrivacy: async (stickyId: string | number): Promise<Sticky> => {
    const res = await httpRequestService<{ data: JsonApiItem<Sticky> }>({
      url: `${API_BASE_URL}/stickies/${stickyId}/privacy`,
      method: "POST",
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      creator: res.data.relationships?.creator?.data,
    };
  },

  delete: async (stickyId: string | number): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/stickies/${stickyId}`,
      method: "DELETE",
    });
  },
};
