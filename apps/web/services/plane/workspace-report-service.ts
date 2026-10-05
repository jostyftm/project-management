import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import {
  CreateBlockPayload,
  CreateReportPayload,
  CreateSnapshotPayload,
  ReorderBlockItem,
  ReportBlock,
  ReportSnapshot,
  ReportTemplate,
  UpdateBlockPayload,
  UpdateReportPayload,
  WorkspaceReport,
} from "@/types/workspace-report-types";

interface JsonApiResource<T> {
  type: string;
  id: string;
  attributes: T;
  relationships?: Record<string, any>;
}

interface JsonApiResponse<T> {
  data: JsonApiResource<T>;
}

interface JsonApiListResponse<T> {
  data: JsonApiResource<T>[];
  meta?: Record<string, any>;
}

function mapReport(item: JsonApiResource<any>): WorkspaceReport {
  return {
    id: item.id,
    ...item.attributes,
    owner: item.relationships?.owner?.attributes
      ? { id: item.relationships.owner.id, ...item.relationships.owner.attributes }
      : undefined,
    blocks: Array.isArray(item.relationships?.blocks)
      ? item.relationships.blocks.map(mapBlock)
      : undefined,
  };
}

function mapBlock(item: JsonApiResource<any>): ReportBlock {
  return {
    id: item.id,
    ...item.attributes,
  };
}

function mapSnapshot(item: JsonApiResource<any>): ReportSnapshot {
  return {
    id: item.id,
    ...item.attributes,
    creator: item.relationships?.creator?.attributes
      ? { id: item.relationships.creator.id, ...item.relationships.creator.attributes }
      : undefined,
  };
}

export const workspaceReportService = {
  // Reportes
  list: async (workspaceId: string | number, params?: { page?: number; per_page?: number }) => {
    const res = await httpRequestService<JsonApiListResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports`,
      method: "GET",
      params,
    });
    return res.data.map(mapReport);
  },

  get: async (workspaceId: string | number, reportId: string | number) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}`,
      method: "GET",
    });
    return mapReport(res.data);
  },

  create: async (workspaceId: string | number, payload: CreateReportPayload) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports`,
      method: "POST",
      data: payload,
    });
    return mapReport(res.data);
  },

  update: async (
    workspaceId: string | number,
    reportId: string | number,
    payload: UpdateReportPayload
  ) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}`,
      method: "PATCH",
      data: payload,
    });
    return mapReport(res.data);
  },

  delete: async (workspaceId: string | number, reportId: string | number) => {
    return httpRequestService({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}`,
      method: "DELETE",
    });
  },

  publish: async (workspaceId: string | number, reportId: string | number) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/publish`,
      method: "POST",
    });
    return mapReport(res.data);
  },

  duplicate: async (workspaceId: string | number, reportId: string | number) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/duplicate`,
      method: "POST",
    });
    return mapReport(res.data);
  },

  // Bloques
  listBlocks: async (workspaceId: string | number, reportId: string | number) => {
    const res = await httpRequestService<JsonApiListResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/blocks`,
      method: "GET",
    });
    return res.data.map(mapBlock);
  },

  createBlock: async (
    workspaceId: string | number,
    reportId: string | number,
    payload: CreateBlockPayload
  ) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/blocks`,
      method: "POST",
      data: payload,
    });
    return mapBlock(res.data);
  },

  updateBlock: async (
    workspaceId: string | number,
    reportId: string | number,
    blockId: string | number,
    payload: UpdateBlockPayload
  ) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/blocks/${blockId}`,
      method: "PATCH",
      data: payload,
    });
    return mapBlock(res.data);
  },

  deleteBlock: async (
    workspaceId: string | number,
    reportId: string | number,
    blockId: string | number
  ) => {
    return httpRequestService({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/blocks/${blockId}`,
      method: "DELETE",
    });
  },

  reorderBlocks: async (
    workspaceId: string | number,
    reportId: string | number,
    order: ReorderBlockItem[]
  ) => {
    return httpRequestService({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/blocks/reorder`,
      method: "POST",
      data: { order },
    });
  },

  // Resolver data
  getBlockData: async (
    workspaceId: string | number,
    reportId: string | number,
    blockId: string | number
  ) => {
    const res = await httpRequestService<{ data: any }>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/blocks/${blockId}/data`,
      method: "GET",
    });
    return res.data;
  },

  getAllData: async (workspaceId: string | number, reportId: string | number) => {
    const res = await httpRequestService<{ data: Record<string, any> }>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/data`,
      method: "GET",
    });
    return res.data;
  },

  // Plantillas
  listTemplates: async (workspaceId: string | number) => {
    const res = await httpRequestService<{ data: ReportTemplate[] }>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/templates`,
      method: "GET",
    });
    return res.data;
  },

  applyTemplate: async (
    workspaceId: string | number,
    reportId: string | number,
    template: string
  ) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/apply-template`,
      method: "POST",
      data: { template },
    });
    return mapReport(res.data);
  },

  // Snapshots / Versionado Histórico
  listSnapshots: async (workspaceId: string | number, reportId: string | number) => {
    const res = await httpRequestService<JsonApiListResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/snapshots`,
      method: "GET",
    });
    return res.data.map(mapSnapshot);
  },

  createSnapshot: async (
    workspaceId: string | number,
    reportId: string | number,
    payload: CreateSnapshotPayload
  ) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/snapshots`,
      method: "POST",
      data: payload,
    });
    return mapSnapshot(res.data);
  },

  getSnapshot: async (
    workspaceId: string | number,
    reportId: string | number,
    snapshotId: string | number
  ) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/snapshots/${snapshotId}`,
      method: "GET",
    });
    return mapSnapshot(res.data);
  },

  deleteSnapshot: async (
    workspaceId: string | number,
    reportId: string | number,
    snapshotId: string | number
  ) => {
    return httpRequestService({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/snapshots/${snapshotId}`,
      method: "DELETE",
    });
  },

  restoreSnapshot: async (
    workspaceId: string | number,
    reportId: string | number,
    snapshotId: string | number
  ) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/snapshots/${snapshotId}/restore`,
      method: "POST",
    });
    return mapReport(res.data);
  },

  // Público
  getPublic: async (token: string) => {
    const res = await httpRequestService<JsonApiResponse<any>>({
      url: `${API_BASE_URL}/public/workspace-reports/${token}`,
      method: "GET",
    });
    return mapReport(res.data);
  },

  // Exportación Server-Side (Fase 5)
  getExportPdfUrl: (workspaceId: string | number, reportId: string | number) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const rawToken = token ? JSON.parse(token) : null;
    const base = `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/export/pdf`;
    return rawToken ? `${base}?token=${encodeURIComponent(rawToken)}` : base;
  },

  getExportPngUrl: (workspaceId: string | number, reportId: string | number) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const rawToken = token ? JSON.parse(token) : null;
    const base = `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/export/png`;
    return rawToken ? `${base}?token=${encodeURIComponent(rawToken)}` : base;
  },

  getPublicExportPdfUrl: (token: string) => {
    return `${API_BASE_URL}/public/workspace-reports/${token}/export/pdf`;
  },

  getPublicExportPngUrl: (token: string) => {
    return `${API_BASE_URL}/public/workspace-reports/${token}/export/png`;
  },

  downloadPdf: async (workspaceId: string | number, reportId: string | number, title?: string) => {
    const url = `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/export/pdf`;
    const blob = await httpRequestService<Blob>({
      url,
      method: "GET",
      responseType: "blob",
    });
    const filename = `${title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "report"}.pdf`;
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },

  downloadPng: async (workspaceId: string | number, reportId: string | number, title?: string) => {
    const url = `${API_BASE_URL}/workspaces/${workspaceId}/workspace-reports/${reportId}/export/png`;
    const blob = await httpRequestService<Blob>({
      url,
      method: "GET",
      responseType: "blob",
    });
    const filename = `${title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "report"}.png`;
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },

  downloadPublicPdf: async (token: string, title?: string) => {
    const url = `${API_BASE_URL}/public/workspace-reports/${token}/export/pdf`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error al exportar PDF");
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "report"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },

  downloadPublicPng: async (token: string, title?: string) => {
    const url = `${API_BASE_URL}/public/workspace-reports/${token}/export/png`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error al exportar PNG");
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "report"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },
};
