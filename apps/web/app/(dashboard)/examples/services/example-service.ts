import { API_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";;
import { ExampleType } from "@/types/example-type";
import { ExampleFormValues } from "../types/example-types";

const endpoint = API_URL("audit", "v1");
const path = "scraper-data-sources";


export const requestAllExamples = ({ params }: PaginateResourcesProps) =>
  httpRequestService<PaginatedResponse<ExampleType>>({
    url: `${endpoint}/${path}`,
    method: "GET",
    params: params,
  });

export const saveExampleService = (data: ExampleFormValues) =>
  httpRequestService<{ data: ExampleType }>({
    url: `${endpoint}/${path}`,
    method: "POST",
    data,
  });

export const updateExampleService = (data: ExampleFormValues) =>
  httpRequestService<{ data: ExampleType }>({
    url: `${endpoint}/${path}/${data.id}`,
    method: "PUT",
    data,
  });

export const getExampleByIdService = (exampleId: string) =>
  httpRequestService<{ data: ExampleType }>({
    url: `${endpoint}/${path}/${exampleId}`,
    method: "GET",
  });

export const deleteExampleService = (exampleId: string, force: boolean) =>
  httpRequestService({
    url: `${endpoint}/${path}/${exampleId}`,
    method: "DELETE",
    params: { force },
  });
