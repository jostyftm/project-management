import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { WorkItem } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export type YourWorkTab = "assigned" | "created" | "drafts";

export const yourWorkService = {
  list: async (tab: YourWorkTab = "assigned", params?: Record<string, any>): Promise<WorkItem[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<WorkItem>[] }>({
      url: `${API_BASE_URL}/your-work`,
      method: "GET",
      params: { tab, ...params },
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
      creator: item.relationships?.creator?.data,
    }));
  },
};
