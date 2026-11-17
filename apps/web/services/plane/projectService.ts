import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Label, Project, State } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const projectService = {
  list: async () => {
    const res = await httpRequestService<{ data: JsonApiItem<Project>[] }>({
      url: `${API_BASE_URL}/projects`,
      method: "GET",
    });
    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      ...item.relationships,
    }));
  },

  create: async (payload: { name: string; identifier: string; description?: string; icon?: string }) => {
    const res = await httpRequestService<{ data: JsonApiItem<Project> }>({
      url: `${API_BASE_URL}/projects`,
      method: "POST",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
      ...res.data.relationships,
    };
  },

  get: async (id: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<Project> }>({
      url: `${API_BASE_URL}/projects/${id}`,
      method: "GET",
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
      ...res.data.relationships,
    };
  },

  update: async (id: string | number, payload: Partial<Project>) => {
    const res = await httpRequestService<{ data: JsonApiItem<Project> }>({
      url: `${API_BASE_URL}/projects/${id}`,
      method: "PUT",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  delete: async (id: string | number) => {
    return await httpRequestService({
      url: `${API_BASE_URL}/projects/${id}`,
      method: "DELETE",
    });
  },


  getStates: async (projectId: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<State>[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/states`,
      method: "GET",
    });
    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
    }));
  },

  listStates: async (projectId: string | number) => {
    return projectService.getStates(projectId);
  },

  createState: async (projectId: string | number, payload: { name: string; color: string; group: string; sequence?: number; wip_limit?: number | null }) => {
    const res = await httpRequestService<{ data: JsonApiItem<State> }>({
      url: `${API_BASE_URL}/projects/${projectId}/states`,
      method: "POST",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  updateState: async (projectId: string | number, stateId: string | number, payload: Partial<State>) => {
    const res = await httpRequestService<{ data: JsonApiItem<State> }>({
      url: `${API_BASE_URL}/projects/${projectId}/states/${stateId}`,
      method: "PUT",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  getLabels: async (projectId: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<Label>[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/labels`,
      method: "GET",
    });
    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
    }));
  },

  listLabels: async (projectId: string | number) => {
    return projectService.getLabels(projectId);
  },

  createLabel: async (projectId: string | number, payload: { name: string; color: string; description?: string }) => {
    const res = await httpRequestService<{ data: JsonApiItem<Label> }>({
      url: `${API_BASE_URL}/projects/${projectId}/labels`,
      method: "POST",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  exportProject: async (projectId: string | number, defaultIdentifier?: string) => {
    const res = await httpRequestService<Blob>({
      url: `${API_BASE_URL}/projects/${projectId}/export`,
      method: "GET",
      responseType: "blob",
    });
    const blob = new Blob([res as any], { type: "application/json" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${defaultIdentifier || "project"}-export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  importProject: async (file: File, options?: { name?: string; identifier?: string; force?: boolean }) => {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.name) formData.append("name", options.name);
    if (options?.identifier) formData.append("identifier", options.identifier);
    if (options?.force) formData.append("force", "1");

    return await httpRequestService<any>({
      url: `${API_BASE_URL}/projects/import`,
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
