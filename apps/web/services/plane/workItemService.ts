import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { WorkItem, WorkItemRelation } from "@/types/plane-types";

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
      type: item.relationships?.type?.attributes
        ? { id: item.relationships.type.id, ...item.relationships.type.attributes }
        : undefined,
      assignees: item.relationships?.assignees ?? [],
      labels: (item.relationships?.labels ?? []).map((l: any) => ({
        id: l.id,
        ...l.attributes,
      })),
      project: item.relationships?.project?.data,
      sub_items: item.relationships?.sub_items ?? [],
      cycles: item.relationships?.cycles ?? [],
      modules: item.relationships?.modules ?? [],
    }));
  },

  create: async (projectId: string | number, payload: {
    title: string;
    description_json?: any;
    priority?: string;
    state_id?: string | number;
    type_id?: string | number;
    parent_id?: string | number;
    estimate_points?: number;
    estimate_value?: string;
    cycle_id?: string | number;
    module_id?: string | number;
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
      type: res.data.relationships?.type?.attributes,
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
      state: res.data.relationships?.state?.attributes
        ? { id: res.data.relationships.state.id, ...res.data.relationships.state.attributes }
        : undefined,
      type: res.data.relationships?.type?.attributes
        ? { id: res.data.relationships.type.id, ...res.data.relationships.type.attributes }
        : undefined,
      assignees: res.data.relationships?.assignees ?? [],
      labels: res.data.relationships?.labels ?? [],
      parent: res.data.relationships?.parent,
      sub_items: res.data.relationships?.sub_items ?? [],
      cycles: res.data.relationships?.cycles ?? [],
      modules: res.data.relationships?.modules ?? [],
      outward_relations: res.data.relationships?.outward_relations ?? [],
      inward_relations: res.data.relationships?.inward_relations ?? [],
    };
  },

  update: async (id: string | number, payload: Partial<WorkItem> & {
    state_id?: string | number;
    type_id?: string | number;
    parent_id?: string | number;
    cycle_id?: string | number;
    module_id?: string | number;
  }) => {
    const res = await httpRequestService<{ data: JsonApiItem<WorkItem> }>({
      url: `${API_BASE_URL}/work-items/${id}`,
      method: "PUT",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
      state: res.data.relationships?.state?.attributes,
      type: res.data.relationships?.type?.attributes,
    };
  },

  delete: async (id: string | number) => {
    return httpRequestService({
      url: `${API_BASE_URL}/work-items/${id}`,
      method: "DELETE",
    });
  },

  addRelation: async (workItemId: string | number, payload: { target_id: string | number; relation_type?: string }) => {
    return httpRequestService<{ message: string; data: WorkItemRelation }>({
      url: `${API_BASE_URL}/work-items/${workItemId}/relations`,
      method: "POST",
      data: payload,
    });
  },

  deleteRelation: async (relationId: string | number) => {
    return httpRequestService({
      url: `${API_BASE_URL}/work-items/relations/${relationId}`,
      method: "DELETE",
    });
  },
};
