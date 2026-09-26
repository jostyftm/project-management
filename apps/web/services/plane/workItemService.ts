import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { WorkItem } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const workItemService = {
  list: async (projectId: string | number, params?: Record<string, any>) => {
    const res = await httpRequestService<{ data: JsonApiItem<WorkItem>[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items`,
      method: "GET",
      params,
    });
    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      state: item.relationships?.state?.attributes
        ? { id: item.relationships.state.id, ...item.relationships.state.attributes }
        : undefined,
      assignees: item.relationships?.assignees ?? [],
      labels: (item.relationships?.labels ?? []).map((l: any) => ({
        id: l.id,
        ...l.attributes,
      })),
      project: item.relationships?.project?.data,
    }));
  },

  create: async (projectId: string | number, payload: {
    title: string;
    description_json?: any;
    priority?: string;
    state_id?: string | number;
    estimate_points?: number;
    start_date?: string;
    target_date?: string;
    assignee_ids?: (string | number)[];
    label_ids?: (string | number)[];
  }) => {
    const res = await httpRequestService<{ data: JsonApiItem<WorkItem> }>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items`,
      method: "POST",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
      state: res.data.relationships?.state?.attributes,
      assignees: res.data.relationships?.assignees ?? [],
    };
  },

  get: async (id: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<WorkItem> }>({
      url: `${API_BASE_URL}/work-items/${id}`,
      method: "GET",
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
      state: res.data.relationships?.state?.attributes,
      assignees: res.data.relationships?.assignees ?? [],
      labels: res.data.relationships?.labels ?? [],
    };
  },

  update: async (id: string | number, payload: Partial<WorkItem> & { state_id?: string | number }) => {
    const res = await httpRequestService<{ data: JsonApiItem<WorkItem> }>({
      url: `${API_BASE_URL}/work-items/${id}`,
      method: "PUT",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
      state: res.data.relationships?.state?.attributes,
    };
  },

  delete: async (id: string | number) => {
    return httpRequestService({
      url: `${API_BASE_URL}/work-items/${id}`,
      method: "DELETE",
    });
  },
};
