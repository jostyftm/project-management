import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import {
  DeliverablesResponse,
  WorkItemDeliverable,
  WorkItemDodItem,
  DeliverableStatus,
  DeliverableType,
} from "@/types/deliverable-types";

interface ApiResponse<T> {
  data: T;
}

function formatDeliverable(item: any): WorkItemDeliverable {
  if (!item) return item;
  if (item.attributes) {
    return {
      id: Number(item.id),
      workspace_id: item.attributes.workspace_id,
      project_id: item.attributes.project_id,
      work_item_id: item.attributes.work_item_id,
      created_by: item.attributes.created_by,
      title: item.attributes.title,
      type: item.attributes.type,
      url: item.attributes.url,
      disk: item.attributes.disk,
      file_path: item.attributes.file_path,
      file_name: item.attributes.file_name,
      file_size: item.attributes.file_size,
      file_mime: item.attributes.file_mime,
      file_url: item.attributes.file_url,
      description: item.attributes.description,
      status: item.attributes.status,
      reviewed_by: item.attributes.reviewed_by,
      reviewed_at: item.attributes.reviewed_at,
      review_notes: item.attributes.review_notes,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at,
      creator: item.relationships?.creator?.data || item.creator,
      reviewer: item.relationships?.reviewer?.data || item.reviewer,
    };
  }
  return item;
}

function formatDodItem(item: any): WorkItemDodItem {
  if (!item) return item;
  if (item.attributes) {
    return {
      id: Number(item.id),
      work_item_id: item.attributes.work_item_id,
      title: item.attributes.title,
      is_completed: item.attributes.is_completed,
      completed_at: item.attributes.completed_at,
      created_at: item.attributes.created_at,
      updated_at: item.attributes.updated_at,
      completed_by: item.relationships?.completed_by?.data || item.completed_by,
    };
  }
  return item;
}

export const workItemDeliverableService = {
  list: async (
    projectId: string | number,
    workItemId: string | number
  ): Promise<DeliverablesResponse> => {
    const res = await httpRequestService<ApiResponse<{ deliverables: any[]; dod_items: any[] }>>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/deliverables`,
      method: "GET",
    });

    return {
      deliverables: (res.data?.deliverables || []).map(formatDeliverable),
      dod_items: (res.data?.dod_items || []).map(formatDodItem),
    };
  },

  create: async (
    projectId: string | number,
    workItemId: string | number,
    data: {
      title: string;
      type: DeliverableType;
      url?: string;
      file?: File | null;
      description?: string;
    }
  ): Promise<WorkItemDeliverable> => {
    if (data.file) {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("type", data.type);
      if (data.url) formData.append("url", data.url);
      if (data.description) formData.append("description", data.description);
      formData.append("file", data.file);

      const res = await httpRequestService<ApiResponse<any>>({
        url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/deliverables`,
        method: "POST",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return formatDeliverable(res.data);
    }

    const res = await httpRequestService<ApiResponse<any>>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/deliverables`,
      method: "POST",
      data: {
        title: data.title,
        type: data.type,
        url: data.url,
        description: data.description,
      },
    });
    return formatDeliverable(res.data);
  },

  delete: async (
    projectId: string | number,
    workItemId: string | number,
    deliverableId: string | number
  ): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/deliverables/${deliverableId}`,
      method: "DELETE",
    });
  },

  review: async (
    projectId: string | number,
    workItemId: string | number,
    deliverableId: string | number,
    payload: {
      status: DeliverableStatus;
      review_notes?: string;
    }
  ): Promise<WorkItemDeliverable> => {
    const res = await httpRequestService<ApiResponse<any>>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/deliverables/${deliverableId}/review`,
      method: "PATCH",
      data: payload,
    });
    return formatDeliverable(res.data);
  },

  createDod: async (
    projectId: string | number,
    workItemId: string | number,
    title: string
  ): Promise<WorkItemDodItem> => {
    const res = await httpRequestService<ApiResponse<any>>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/dod-items`,
      method: "POST",
      data: { title },
    });
    return formatDodItem(res.data);
  },

  toggleDod: async (
    projectId: string | number,
    workItemId: string | number,
    dodItemId: string | number
  ): Promise<WorkItemDodItem> => {
    const res = await httpRequestService<ApiResponse<any>>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/dod-items/${dodItemId}`,
      method: "PATCH",
    });
    return formatDodItem(res.data);
  },

  deleteDod: async (
    projectId: string | number,
    workItemId: string | number,
    dodItemId: string | number
  ): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/dod-items/${dodItemId}`,
      method: "DELETE",
    });
  },

  downloadFile: async (
    projectId: string | number,
    workItemId: string | number,
    deliverableId: string | number,
    fileName: string
  ): Promise<void> => {
    const blob = await httpRequestService<Blob>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/deliverables/${deliverableId}/download`,
      method: "GET",
      responseType: "blob",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },

  getFileBlob: async (
    projectId: string | number,
    workItemId: string | number,
    deliverableId: string | number
  ): Promise<{ blobUrl: string; contentType: string }> => {
    const blob = await httpRequestService<Blob>({
      url: `${API_BASE_URL}/projects/${projectId}/work-items/${workItemId}/deliverables/${deliverableId}/download`,
      method: "GET",
      responseType: "blob",
    });

    const blobUrl = window.URL.createObjectURL(blob);
    return {
      blobUrl,
      contentType: blob.type,
    };
  },
};
