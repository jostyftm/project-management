import { httpRequestService } from "@/lib/request";
import { API_URL } from "@/config/enviroments";
import { PaginateResourcesProps } from "@/types/paginate";

const url = API_URL("company", "v1");

export const requestEmployeeContractId = (userId: number | string) =>
  httpRequestService<{ employee_contract_id: string }>({
    url: `${url}/users/${userId}/employee-contract`,
    method: "GET",
  });

export const requestEmployeeDepartments = (
  { params }: PaginateResourcesProps,
  contractId: number | string
) =>
  httpRequestService({
    url: `${url}/employee-contracts/${contractId}/departments`,
    method: "GET",
    params,
  });
