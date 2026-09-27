import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Milestone } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const milestoneService = {
  list: async (projectId: string | number): Promise<Milestone[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Milestone>[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/milestones`,
      method: "GET",
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      project: item.relationships?.project?.data,
      work_items: item.relationships?.work_items ?? [],
    }));
  },

  create: async (projectId: string | number, payload: {
    title: string;
    description?: string;
    target_date?: string;
    status?: string;
    work_item_ids?: (string | number)[];
  }): Promise<Milestone> => {
    const res = await httpRequestService<{ data: JsonApiItem<Milestone> }>({
      url: `${API_BASE_URL}/projects/${projectId}/milestones`,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      work_items: res.data.relationships?.work_items ?? [],
    };
  },

  update: async (milestoneId: string | number, payload: Partial<Milestone> & { work_item_ids?: (string | number)[] }): Promise<Milestone> => {
    const res = await httpRequestService<{ data: JsonApiItem<Milestone> }>({
      url: `${API_BASE_URL}/milestones/${milestoneId}`,
      method: "PUT",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      work_items: res.data.relationships?.work_items ?? [],
    };
  },

  toggleComplete: async (milestoneId: string | number): Promise<Milestone> => {
    const res = await httpRequestService<{ data: JsonApiItem<Milestone> }>({
      url: `${API_BASE_URL}/milestones/${milestoneId}/complete`,
      method: "POST",
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      work_items: res.data.relationships?.work_items ?? [],
    };
  },

  delete: async (milestoneId: string | number): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/milestones/${milestoneId}`,
      method: "DELETE",
    });
  },
};
