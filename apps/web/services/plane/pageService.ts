import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { DocBlock, DocPage, PageAnalytics, PageTreeNode } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const pageService = {
  list: async (projectId?: string | number, params?: Record<string, any>): Promise<DocPage[]> => {
    const url = projectId
      ? `${API_BASE_URL}/projects/${projectId}/pages`
      : `${API_BASE_URL}/pages`;

    const res = await httpRequestService<{ data: JsonApiItem<DocPage>[] }>({
      url,
      method: "GET",
      params,
    });

    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      project: item.relationships?.project?.data,
      creator: item.relationships?.creator?.data,
      last_editor: item.relationships?.last_editor?.data,
    }));
  },

  getTree: async (projectId?: string | number): Promise<PageTreeNode[]> => {
    const url = projectId
      ? `${API_BASE_URL}/projects/${projectId}/pages/tree`
      : `${API_BASE_URL}/pages/tree`;

    const res = await httpRequestService<{ data: PageTreeNode[] }>({
      url,
      method: "GET",
    });

    return res.data;
  },

  get: async (pageId: string | number): Promise<DocPage> => {
    const res = await httpRequestService<{ data: JsonApiItem<DocPage> }>({
      url: `${API_BASE_URL}/pages/${pageId}`,
      method: "GET",
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      project: res.data.relationships?.project?.data,
      creator: res.data.relationships?.creator?.data,
      last_editor: res.data.relationships?.last_editor?.data,
      children: (res.data.relationships?.children?.data ?? []).map((c: any) => ({
        id: c.id,
        ...c.attributes,
      })),
    };
  },

  create: async (payload: {
    title: string;
    project_id?: string | number | null;
    parent_id?: string | number | null;
    content_json?: DocBlock[];
    is_published?: boolean;
    is_locked?: boolean;
    access?: string;
    icon?: string;
    color?: string;
  }): Promise<DocPage> => {
    const url = payload.project_id
      ? `${API_BASE_URL}/projects/${payload.project_id}/pages`
      : `${API_BASE_URL}/pages`;

    const res = await httpRequestService<{ data: JsonApiItem<DocPage> }>({
      url,
      method: "POST",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      project: res.data.relationships?.project?.data,
      creator: res.data.relationships?.creator?.data,
    };
  },

  update: async (pageId: string | number, payload: Partial<DocPage>): Promise<DocPage> => {
    const res = await httpRequestService<{ data: JsonApiItem<DocPage> }>({
      url: `${API_BASE_URL}/pages/${pageId}`,
      method: "PUT",
      data: payload,
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      project: res.data.relationships?.project?.data,
      creator: res.data.relationships?.creator?.data,
      last_editor: res.data.relationships?.last_editor?.data,
    };
  },

  delete: async (pageId: string | number): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/pages/${pageId}`,
      method: "DELETE",
    });
  },

  recordView: async (pageId: string | number): Promise<void> => {
    try {
      await httpRequestService({
        url: `${API_BASE_URL}/pages/${pageId}/view`,
        method: "POST",
      });
    } catch {
      // Ignore background tracking errors
    }
  },

  getAnalytics: async (pageId: string | number): Promise<PageAnalytics> => {
    const res = await httpRequestService<{ data: JsonApiItem<PageAnalytics> }>({
      url: `${API_BASE_URL}/pages/${pageId}/analytics`,
      method: "GET",
    });

    return {
      page_id: res.data.id,
      title: (res.data.attributes as any).title,
      total_views: (res.data.attributes as any).total_views,
      unique_viewers: (res.data.attributes as any).unique_viewers,
      word_count: (res.data.attributes as any).word_count,
      character_count: (res.data.attributes as any).character_count,
      block_count: (res.data.attributes as any).block_count,
      reading_time_minutes: (res.data.attributes as any).reading_time_minutes,
      created_at: (res.data.attributes as any).created_at,
      updated_at: (res.data.attributes as any).updated_at,
      creator: res.data.relationships?.creator,
      last_editor: res.data.relationships?.last_editor,
      recent_views: res.data.relationships?.recent_views ?? [],
    };
  },

  generateReport: async (projectId: string | number): Promise<DocPage> => {
    const res = await httpRequestService<{ data: JsonApiItem<DocPage> }>({
      url: `${API_BASE_URL}/pages/generate-report`,
      method: "POST",
      data: { project_id: projectId },
    });

    return {
      id: res.data.id,
      ...res.data.attributes,
      project: res.data.relationships?.project?.data,
      creator: res.data.relationships?.creator?.data,
    };
  },
};
