import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Module, ModuleProgress } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const moduleService = {
  list: async (projectId: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<Module>[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/modules`,
      method: "GET",
    });
    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      lead: item.relationships?.lead?.attributes,
      work_items: item.relationships?.work_items ?? [],
    }));
  },

  create: async (projectId: string | number, payload: {
    name: string;
    description?: string;
    status?: string;
    lead_id?: string | number;
    start_date?: string;
    target_date?: string;
  }) => {
    const res = await httpRequestService<{ data: JsonApiItem<Module> }>({
      url: `${API_BASE_URL}/projects/${projectId}/modules`,
      method: "POST",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  get: async (moduleId: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<Module> }>({
      url: `${API_BASE_URL}/modules/${moduleId}`,
      method: "GET",
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
      work_items: res.data.relationships?.work_items ?? [],
    };
  },

  update: async (moduleId: string | number, payload: Partial<Module>) => {
    const res = await httpRequestService<{ data: JsonApiItem<Module> }>({
      url: `${API_BASE_URL}/modules/${moduleId}`,
      method: "PUT",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  syncWorkItems: async (moduleId: string | number, workItemIds: (string | number)[]) => {
    return httpRequestService({
      url: `${API_BASE_URL}/modules/${moduleId}/work-items`,
      method: "POST",
      data: { work_item_ids: workItemIds },
    });
  },

  getProgress: async (moduleId: string | number) => {
    const res = await httpRequestService<{ data: ModuleProgress }>({
      url: `${API_BASE_URL}/modules/${moduleId}/progress`,
      method: "GET",
    });
    return res.data;
  },
};
