import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { ReportExecution } from "@/types/execution-type";

const endpoint = API_URL('report', 'v1');
const path = "report-executions";

export const requestAllExecutions = ({ params }: PaginateResourcesProps) =>
  reportRequestService<PaginatedResponse<ReportExecution>>({
    url: `${endpoint}/${path}`,
    method: "GET",
    params: params,
  });
