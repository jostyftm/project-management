import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { AutomationRule, RecurringWorkItem, WorkItem } from "@/types/plane-types";

export const automationService = {
  // Tareas periódicas
  listRecurring: async (projectId: string | number): Promise<RecurringWorkItem[]> => {
    return await httpRequestService<RecurringWorkItem[]>({
      url: `${API_BASE_URL}/projects/${projectId}/recurring-work-items`,
      method: "GET",
    });
  },

  createRecurring: async (
    projectId: string | number,
    payload: {
      frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
      cron_expression?: string;
      work_item_template: {
        title: string;
        description?: string;
        priority?: string;
        state_id?: number | null;
        type_id?: number | null;
        estimate_points?: number | null;
      };
      is_active?: boolean;
    }
  ): Promise<RecurringWorkItem> => {
    return await httpRequestService<RecurringWorkItem>({
      url: `${API_BASE_URL}/projects/${projectId}/recurring-work-items`,
      method: "POST",
      data: payload,
    });
  },

  deleteRecurring: async (id: number): Promise<{ message: string }> => {
    return await httpRequestService<{ message: string }>({
      url: `${API_BASE_URL}/recurring-work-items/${id}`,
      method: "DELETE",
    });
  },

  runRecurringNow: async (id: number): Promise<{ message: string; work_item: WorkItem }> => {
    return await httpRequestService<{ message: string; work_item: WorkItem }>({
      url: `${API_BASE_URL}/recurring-work-items/${id}/execute`,
      method: "POST",
    });
  },

  // Reglas automáticas
  listRules: async (projectId: string | number): Promise<AutomationRule[]> => {
    return await httpRequestService<AutomationRule[]>({
      url: `${API_BASE_URL}/projects/${projectId}/automation-rules`,
      method: "GET",
    });
  },

  createRule: async (
    projectId: string | number,
    payload: {
      name: string;
      trigger_event: string;
      trigger_conditions?: Record<string, any>;
      actions: Record<string, any>;
      is_active?: boolean;
    }
  ): Promise<AutomationRule> => {
    return await httpRequestService<AutomationRule>({
      url: `${API_BASE_URL}/projects/${projectId}/automation-rules`,
      method: "POST",
      data: payload,
    });
  },

  updateRule: async (id: number, payload: Partial<AutomationRule>): Promise<AutomationRule> => {
    return await httpRequestService<AutomationRule>({
      url: `${API_BASE_URL}/automation-rules/${id}`,
      method: "PUT",
      data: payload,
    });
  },

  deleteRule: async (id: number): Promise<{ message: string }> => {
    return await httpRequestService<{ message: string }>({
      url: `${API_BASE_URL}/automation-rules/${id}`,
      method: "DELETE",
    });
  },

  testRule: async (id: number): Promise<{ message: string; applied_count: number }> => {
    return await httpRequestService<{ message: string; applied_count: number }>({
      url: `${API_BASE_URL}/automation-rules/${id}/test`,
      method: "POST",
    });
  },
};
