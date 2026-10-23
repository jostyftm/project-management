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
    type?: 'COMMENT' | 'WORK_LOG';
    is_work_log?: boolean;
    caption?: string;
    attachment?: File | null;
  }): Promise<Comment> => {
    let dataToSend: any = payload;

    if (payload.attachment instanceof File) {
      const formData = new FormData();
      formData.append("content", payload.content || payload.caption || "Evidencia adjunta");
      if (payload.work_item_id) formData.append("work_item_id", String(payload.work_item_id));
      if (payload.page_id) formData.append("page_id", String(payload.page_id));
      if (payload.project_id) formData.append("project_id", String(payload.project_id));
      if (payload.type) formData.append("type", payload.type);
      if (typeof payload.is_work_log === "boolean") {
        formData.append("is_work_log", payload.is_work_log ? "1" : "0");
      }
      if (payload.caption) formData.append("caption", payload.caption);
      formData.append("attachment", payload.attachment);
      if (payload.mentioned_user_ids && payload.mentioned_user_ids.length > 0) {
        payload.mentioned_user_ids.forEach((id) => formData.append("mentioned_user_ids[]", String(id)));
      }
      dataToSend = formData;
    }

    const res = await httpRequestService<{ data: JsonApiItem<Comment> }>({
      url: `${API_BASE_URL}/comments`,
      method: "POST",
      data: dataToSend,
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
