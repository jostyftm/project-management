import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { SavedView } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
}

export const viewService = {
  list: async (projectId?: string | number) => {
    const url = projectId
      ? `${API_BASE_URL}/projects/${projectId}/views`
      : `${API_BASE_URL}/views`;

    const res = await httpRequestService<{ data: JsonApiItem<SavedView>[] }>({
      url,
      method: "GET",
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
    }));
  },

  create: async (projectId: string | number | undefined, payload: {
    name: string;
    description?: string;
    filters?: Record<string, any>;
    display_filters?: Record<string, any>;
  }) => {
    const url = projectId
      ? `${API_BASE_URL}/projects/${projectId}/views`
      : `${API_BASE_URL}/views`;

    const res = await httpRequestService<{ data: JsonApiItem<SavedView> }>({
      url,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  delete: async (viewId: string | number) => {
    return httpRequestService({
      url: `${API_BASE_URL}/views/${viewId}`,
      method: "DELETE",
    });
  },
};
