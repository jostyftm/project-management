import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Release } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const releaseService = {
  list: async (projectId: string | number): Promise<Release[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Release>[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/releases`,
      method: "GET",
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      project: item.relationships?.project?.data,
      creator: item.relationships?.creator?.data,
      work_items: item.relationships?.work_items ?? [],
    }));
  },

  create: async (projectId: string | number, payload: {
    name: string;
    version: string;
    description?: string;
    status?: string;
    work_item_ids?: (string | number)[];
  }): Promise<Release> => {
    const res = await httpRequestService<{ data: JsonApiItem<Release> }>({
      url: `${API_BASE_URL}/projects/${projectId}/releases`,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      work_items: res.data.relationships?.work_items ?? [],
      creator: res.data.relationships?.creator?.data,
    };
  },

  update: async (releaseId: string | number, payload: Partial<Release> & { work_item_ids?: (string | number)[] }): Promise<Release> => {
    const res = await httpRequestService<{ data: JsonApiItem<Release> }>({
      url: `${API_BASE_URL}/releases/${releaseId}`,
      method: "PUT",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      work_items: res.data.relationships?.work_items ?? [],
    };
  },

  publish: async (releaseId: string | number): Promise<Release> => {
    const res = await httpRequestService<{ data: JsonApiItem<Release> }>({
      url: `${API_BASE_URL}/releases/${releaseId}/publish`,
      method: "POST",
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      work_items: res.data.relationships?.work_items ?? [],
    };
  },

  generateChangelog: async (releaseId: string | number): Promise<string> => {
    const res = await httpRequestService<{ changelog: string }>({
      url: `${API_BASE_URL}/releases/${releaseId}/generate-changelog`,
      method: "POST",
    });

    return res.changelog;
  },

  delete: async (releaseId: string | number): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/releases/${releaseId}`,
      method: "DELETE",
    });
  },
};
