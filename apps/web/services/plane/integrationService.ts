import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { Integration } from "@/types/plane-types";

export const integrationService = {
  list: async (): Promise<Integration[]> => {
    return await httpRequestService<Integration[]>({
      url: `${API_BASE_URL}/integrations`,
      method: "GET",
    });
  },

  save: async (payload: {
    provider: "SLACK" | "GITHUB" | "CUSTOM";
    name: string;
    config: Record<string, any>;
    events_subscribed?: string[];
    project_id?: number | null;
  }): Promise<Integration> => {
    return await httpRequestService<Integration>({
      url: `${API_BASE_URL}/integrations`,
      method: "POST",
      data: payload,
    });
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return await httpRequestService<{ message: string }>({
      url: `${API_BASE_URL}/integrations/${id}`,
      method: "DELETE",
    });
  },

  test: async (id: number): Promise<{ success: boolean; message: string; latency_ms?: number }> => {
    return await httpRequestService<{ success: boolean; message: string; latency_ms?: number }>({
      url: `${API_BASE_URL}/integrations/${id}/test`,
      method: "POST",
    });
  },

  testWebhook: async (id: number | string): Promise<{ success: boolean; message: string; latency_ms?: number; status_code?: number }> => {
    return await httpRequestService<{ success: boolean; message: string; latency_ms?: number; status_code?: number }>({
      url: `${API_BASE_URL}/webhooks/${id}/test`,
      method: "POST",
    });
  },
};
