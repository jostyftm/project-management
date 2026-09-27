import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { WorkItemType } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
}

export const workItemTypeService = {
  list: async (projectId?: string | number) => {
    const url = projectId
      ? `${API_BASE_URL}/projects/${projectId}/work-item-types`
      : `${API_BASE_URL}/work-item-types`;

    const res = await httpRequestService<{ data: JsonApiItem<WorkItemType>[] }>({
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
    icon?: string;
    color?: string;
    is_default?: boolean;
  }) => {
    const url = projectId
      ? `${API_BASE_URL}/projects/${projectId}/work-item-types`
      : `${API_BASE_URL}/work-item-types`;

    const res = await httpRequestService<{ data: JsonApiItem<WorkItemType> }>({
      url,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },
};
