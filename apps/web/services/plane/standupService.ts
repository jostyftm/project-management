import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { DailyStandup, DailyStandupRangeReport } from "@/types/plane-types";

export const standupService = {
  getDailyStandup: async (projectId: string | number, params?: { date?: string; cycle_id?: number | string }) => {
    const res = await httpRequestService<{ data: DailyStandup }>({
      url: `${API_BASE_URL}/projects/${projectId}/daily-standup`,
      method: "GET",
      params,
    });
    return res.data;
  },

  getDailyStandupHistory: async (
    projectId: string | number,
    params?: { start_date?: string; end_date?: string; user_id?: string | number }
  ) => {
    const res = await httpRequestService<{ data: DailyStandupRangeReport }>({
      url: `${API_BASE_URL}/projects/${projectId}/daily-standup/history`,
      method: "GET",
      params,
    });
    return res.data;
  },
};
