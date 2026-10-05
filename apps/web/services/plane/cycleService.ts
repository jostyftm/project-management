import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Cycle, CycleAnalytics } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const cycleService = {
  list: async (projectId: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<Cycle>[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/cycles`,
      method: "GET",
    });
    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      owner: item.relationships?.owner?.attributes,
      work_items: item.relationships?.work_items ?? [],
    }));
  },

  create: async (projectId: string | number, payload: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) => {
    const res = await httpRequestService<{ data: JsonApiItem<Cycle> }>({
      url: `${API_BASE_URL}/projects/${projectId}/cycles`,
      method: "POST",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  get: async (cycleId: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<Cycle> }>({
      url: `${API_BASE_URL}/cycles/${cycleId}`,
      method: "GET",
    });
    const rawWorkItems = res.data.relationships?.work_items ?? [];
    const workItems = Array.isArray(rawWorkItems)
      ? rawWorkItems.map((item: any) => ({
          id: item.id,
          ...item.attributes,
          state: item.relationships?.state?.attributes
            ? { id: item.relationships.state.id, ...item.relationships.state.attributes }
            : undefined,
          type: item.relationships?.type?.attributes
            ? { id: item.relationships.type.id, ...item.relationships.type.attributes }
            : undefined,
          assignees: item.relationships?.assignees ?? [],
          labels: item.relationships?.labels ?? [],
        }))
      : [];

    return {
      id: res.data.id,
      ...res.data.attributes,
      work_items: workItems,
    };
  },

  update: async (cycleId: string | number, payload: Partial<Cycle>) => {
    const res = await httpRequestService<{ data: JsonApiItem<Cycle> }>({
      url: `${API_BASE_URL}/cycles/${cycleId}`,
      method: "PUT",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  complete: async (cycleId: string | number, payload?: { transfer_target?: 'BACKLOG' | 'CYCLE'; target_cycle_id?: number | string }) => {
    return httpRequestService<{ message: string; data: JsonApiItem<Cycle> }>({
      url: `${API_BASE_URL}/cycles/${cycleId}/complete`,
      method: "POST",
      data: payload ?? { transfer_target: 'BACKLOG' },
    });
  },

  getAnalytics: async (cycleId: string | number) => {
    const res = await httpRequestService<{ data: CycleAnalytics }>({
      url: `${API_BASE_URL}/cycles/${cycleId}/analytics`,
      method: "GET",
    });
    return res.data;
  },

  addWorkItems: async (cycleId: string | number, workItemIds: (string | number)[]) => {
    return httpRequestService({
      url: `${API_BASE_URL}/cycles/${cycleId}/work-items`,
      method: "POST",
      data: { work_item_ids: workItemIds },
    });
  },

  removeWorkItem: async (cycleId: string | number, workItemId: string | number) => {
    return httpRequestService({
      url: `${API_BASE_URL}/cycles/${cycleId}/work-items/${workItemId}`,
      method: "DELETE",
    });
  },

  delete: async (cycleId: string | number) => {
    return httpRequestService<{ message: string }>({
      url: `${API_BASE_URL}/cycles/${cycleId}`,
      method: "DELETE",
    });
  },
};
