import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Comment } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const commentService = {
  listByWorkItem: async (workItemId: string | number): Promise<Comment[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Comment>[] }>({
      url: `${API_BASE_URL}/work-items/${workItemId}/comments`,
      method: "GET",
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      user: item.relationships?.user?.data?.attributes
        ? { id: item.relationships.user.data.id, ...item.relationships.user.data.attributes }
        : undefined,
    }));
  },

  listByPage: async (pageId: string | number): Promise<Comment[]> => {
    const res = await httpRequestService<{ data: JsonApiItem<Comment>[] }>({
      url: `${API_BASE_URL}/pages/${pageId}/comments`,
      method: "GET",
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      user: item.relationships?.user?.data?.attributes
        ? { id: item.relationships.user.data.id, ...item.relationships.user.data.attributes }
        : undefined,
    }));
  },

  create: async (payload: {
    content: string;
    work_item_id?: string | number | null;
    page_id?: string | number | null;
    project_id?: string | number | null;
    mentioned_user_ids?: (string | number)[];
  }): Promise<Comment> => {
    const res = await httpRequestService<{ data: JsonApiItem<Comment> }>({
      url: `${API_BASE_URL}/comments`,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      user: res.data.relationships?.user?.data?.attributes
        ? { id: res.data.relationships.user.data.id, ...res.data.relationships.user.data.attributes }
        : undefined,
    };
  },

  delete: async (commentId: string | number): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/comments/${commentId}`,
      method: "DELETE",
    });
  },
};
