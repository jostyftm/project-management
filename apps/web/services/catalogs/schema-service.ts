import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import { ConnectionSchema } from "@/types/schema-type";

const url = API_URL('report', 'v1');

export const requestConnectionSchema = (connectionId: string | number) =>
  reportRequestService<{ data: ConnectionSchema }>({
    url: `${url}/database-connections/${connectionId}/schema`,
    method: "GET",
  });