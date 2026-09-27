import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Initiative } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const initiativeService = {
  list: async (params?: Record<string, any>): Promise<Initiative[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Initiative>[] }>({
      url: `${API_BASE_URL}/initiatives`,
      method: "GET",
      params,
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      projects: item.relationships?.projects ?? [],
      creator: item.relationships?.creator?.data,
    }));
  },

  get: async (id: string | number): Promise<{ initiative: Initiative; metrics: any }> => {
    const res = await httpRequestService<{ data: JsonApiItem<Initiative>; metrics: any }>({
      url: `${API_BASE_URL}/initiatives/${id}`,
      method: "GET",
    });

    return {
      initiative: {
        id: res.data.id,
        ...res.data.attributes,
        projects: res.data.relationships?.projects ?? [],
        creator: res.data.relationships?.creator?.data,
      },
      metrics: res.metrics,
    };
  },

  create: async (payload: {
    title: string;
    description?: string;
    target_date?: string;
    status?: string;
    project_ids?: (string | number)[];
  }): Promise<Initiative> => {
    const res = await httpRequestService<{ data: JsonApiItem<Initiative> }>({
      url: `${API_BASE_URL}/initiatives`,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      projects: res.data.relationships?.projects ?? [],
    };
  },

  update: async (id: string | number, payload: Partial<Initiative> & { project_ids?: (string | number)[] }): Promise<Initiative> => {
    const res = await httpRequestService<{ data: JsonApiItem<Initiative> }>({
      url: `${API_BASE_URL}/initiatives/${id}`,
      method: "PUT",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      projects: res.data.relationships?.projects ?? [],
    };
  },

  delete: async (id: string | number): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/initiatives/${id}`,
      method: "DELETE",
    });
  },
};
