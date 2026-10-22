import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { DailyStandup } from "@/types/plane-types";

export const standupService = {
  getDailyStandup: async (projectId: string | number, params?: { date?: string; cycle_id?: number | string }) => {
    const res = await httpRequestService<{ data: DailyStandup }>({
      url: `${API_BASE_URL}/projects/${projectId}/daily-standup`,
      method: "GET",
      params,
    });
    return res.data;
  },
};
