import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import {
  KpiPeriod,
  ProjectKpiOverview,
  VelocityTrendCycle,
  CycleTimeStats,
  TeamMemberKpi,
  MemberKpiDetail,
} from "@/types/analytics-types";

interface ApiResponse<T> {
  data: T;
}

export const projectAnalyticsService = {
  getOverview: async (
    projectId: string | number,
    params?: { period?: KpiPeriod; cycle_id?: string | number }
  ): Promise<ProjectKpiOverview> => {
    const res = await httpRequestService<ApiResponse<ProjectKpiOverview>>({
      url: `${API_BASE_URL}/projects/${projectId}/analytics/overview`,
      method: "GET",
      params,
    });
    return res.data;
  },

  getVelocityTrend: async (
    projectId: string | number,
    limit: number = 6
  ): Promise<VelocityTrendCycle[]> => {
    const res = await httpRequestService<ApiResponse<VelocityTrendCycle[]>>({
      url: `${API_BASE_URL}/projects/${projectId}/analytics/velocity`,
      method: "GET",
      params: { limit },
    });
    return res.data;
  },

  getCycleTimeStats: async (
    projectId: string | number,
    params?: { period?: KpiPeriod }
  ): Promise<CycleTimeStats> => {
    const res = await httpRequestService<ApiResponse<CycleTimeStats>>({
      url: `${API_BASE_URL}/projects/${projectId}/analytics/cycle-time`,
      method: "GET",
      params,
    });
    return res.data;
  },

  getTeamPerformanceMatrix: async (
    projectId: string | number,
    params?: { period?: KpiPeriod }
  ): Promise<TeamMemberKpi[]> => {
    const res = await httpRequestService<ApiResponse<TeamMemberKpi[]>>({
      url: `${API_BASE_URL}/projects/${projectId}/analytics/members`,
      method: "GET",
      params,
    });
    return res.data;
  },

  getMemberDetail: async (
    projectId: string | number,
    userId: string | number,
    params?: { period?: KpiPeriod }
  ): Promise<MemberKpiDetail> => {
    const res = await httpRequestService<ApiResponse<MemberKpiDetail>>({
      url: `${API_BASE_URL}/projects/${projectId}/analytics/members/${userId}`,
      method: "GET",
      params,
    });
    return res.data;
  },
};
