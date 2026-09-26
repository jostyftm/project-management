import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import { DashboardOverviewData } from "@/types/dashboard-types";

const endpoint = API_URL("report", "v1");

export const requestDashboardOverview = () =>
  reportRequestService<{ data: DashboardOverviewData }>({
    url: `${endpoint}/dashboard/overview`,
    method: "GET",
  });
