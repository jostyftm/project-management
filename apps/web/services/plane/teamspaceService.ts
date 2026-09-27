import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Teamspace } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const teamspaceService = {
  list: async (): Promise<Teamspace[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Teamspace>[] }>({
      url: `${API_BASE_URL}/teamspaces`,
      method: "GET",
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      projects: item.relationships?.projects ?? [],
      creator: item.relationships?.creator?.data,
    }));
  },

  create: async (payload: {
    name: string;
    description?: string;
    icon?: string;
    project_ids?: (string | number)[];
  }): Promise<Teamspace> => {
    const res = await httpRequestService<{ data: JsonApiItem<Teamspace> }>({
      url: `${API_BASE_URL}/teamspaces`,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      projects: res.data.relationships?.projects ?? [],
    };
  },

  update: async (id: string | number, payload: Partial<Teamspace> & { project_ids?: (string | number)[] }): Promise<Teamspace> => {
    const res = await httpRequestService<{ data: JsonApiItem<Teamspace> }>({
      url: `${API_BASE_URL}/teamspaces/${id}`,
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
      url: `${API_BASE_URL}/teamspaces/${id}`,
      method: "DELETE",
    });
  },
};
