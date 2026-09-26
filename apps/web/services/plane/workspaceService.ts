import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Workspace, WorkspaceMember } from "@/types/plane-types";

interface JsonApiItem<T> {
  id: string;
  type: string;
  attributes: Omit<T, "id">;
  relationships?: any;
}

export const workspaceService = {
  list: async () => {
    const res = await httpRequestService<{ data: JsonApiItem<Workspace>[] }>({
      url: `${API_BASE_URL}/workspaces`,
      method: "GET",
    });
    return res.data.map((item) => ({
      id: item.id,
      ...item.attributes,
      ...item.relationships,
    }));
  },

  create: async (payload: { name: string; slug?: string; logo_url?: string }) => {
    const res = await httpRequestService<{ data: JsonApiItem<Workspace> }>({
      url: `${API_BASE_URL}/workspaces`,
      method: "POST",
      data: payload,
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
    };
  },

  get: async (id: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<Workspace> }>({
      url: `${API_BASE_URL}/workspaces/${id}`,
      method: "GET",
    });
    return {
      id: res.data.id,
      ...res.data.attributes,
      ...res.data.relationships,
    };
  },

  addMember: async (workspaceId: string | number, payload: { email: string; role: string }) => {
    return httpRequestService<{ data: WorkspaceMember }>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/members`,
      method: "POST",
      data: payload,
    });
  },

  listMembers: async (workspaceId: string | number) => {
    const res = await httpRequestService<{ data: JsonApiItem<any>[] }>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/members`,
      method: "GET",
    });
    return res.data.map((item) => ({
      id: item.id,
      role: item.attributes.role,
      user: item.relationships?.user?.data,
    }));
  },
};
