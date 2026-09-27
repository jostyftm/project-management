import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Activity } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const activityService = {
  listByWorkItem: async (workItemId: string | number): Promise<Activity[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Activity>[] }>({
      url: `${API_BASE_URL}/work-items/${workItemId}/activities`,
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

  listByProject: async (projectId: string | number): Promise<Activity[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Activity>[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/activities`,
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
};
