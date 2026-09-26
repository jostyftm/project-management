"use client";
import { useQuery } from "@tanstack/react-query";
import { requestMyReports } from "../services/my-report-service";
import { MyReportItem } from "../types/my-report-types";

import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";

interface UseMyReportsProps {
  params?: PaginateResourcesProps;
}

export const useMyReports = ({ params }: UseMyReportsProps) => {
  const safeParams = params ?? { params: {} };
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["my-reports", safeParams],
    queryFn: async () => {
      const response = await requestMyReports(safeParams);
      return response;
    },
    staleTime: 30000,
  });

  const reportsList = (data?.data ?? []) as MyReportItem[];

  return {
    data: reportsList,
    meta: data?.meta,
    links: data?.links,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
};
