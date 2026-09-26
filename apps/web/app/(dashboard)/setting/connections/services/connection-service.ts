import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import { ApiResponse, PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { DatabaseConnection } from "@/types/connection-type";

const endpoint = API_URL('report', 'v1');
const path = "database-connections";

export interface ConnectionFormValues {
  id?: string;
  name: string;
  database_driver_id: number;
  host?: string;
  port?: string;
  db_name?: string;
  schema?: string;
  username?: string;
  password?: string;
  tns_string?: string;
}

export interface ConnectionTestValues {
  id?: string | number;
  database_driver_id: number;
  host?: string;
  port?: string;
  db_name?: string;
  schema?: string;
  username?: string;
  password?: string;
  tns_string?: string;
}

export const testConnectionService = (data: ConnectionTestValues) =>
  reportRequestService<{ message: string }>({
    url: `${endpoint}/${path}/test`,
    method: "POST",
    data,
  });

export const requestAllConnections = ({ params }: PaginateResourcesProps) =>
  reportRequestService<PaginatedResponse<DatabaseConnection>>({
    url: `${endpoint}/${path}`,
    method: "GET",
    params: params,
  });

export const saveConnectionService = (data: ConnectionFormValues) =>
  reportRequestService<DatabaseConnection>({
    url: `${endpoint}/${path}`,
    method: "POST",
    data,
  });

export const updateConnectionService = (
  id: string | number,
  data: ConnectionFormValues
) =>
  reportRequestService<DatabaseConnection>({
    url: `${endpoint}/${path}/${id}`,
    method: "PUT",
    data,
  });

export const getConnectionByIdService = (connectionId: string | number) =>
  reportRequestService<ApiResponse<DatabaseConnection>>({
    url: `${endpoint}/${path}/${connectionId}`,
    method: "GET",
  });

export const deleteConnectionService = (connectionId: string | number) =>
  reportRequestService({
    url: `${endpoint}/${path}/${connectionId}`,
    method: "DELETE",
  });
