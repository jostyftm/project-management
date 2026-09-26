import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { ReportSchedule } from "@/types/schedule-type";
import {
  requestAllSchedules,
  getScheduleByIdService,
} from "../services/schedule-service";

interface ListProps {
  reportId?: number;
  params?: PaginateResourcesProps;
}

export const useListSchedules = ({ reportId, params }: ListProps) => {
  const safeParams = params ?? { params: {} };
  const baseFilter = (params?.params?.filter ?? {}) as Record<string, string>;
  const filter: Record<string, string> = reportId
    ? { ...baseFilter, report_id: String(reportId) }
    : baseFilter;

  const queryKey = ["report-schedules", { ...safeParams, reportId }];
  const { data, error, refetch, isPending } = useQuery<
    PaginatedResponse<ReportSchedule>
  >({
    queryKey,
    queryFn: async () =>
      requestAllSchedules({ params: { ...safeParams.params, filter } }),
    placeholderData: keepPreviousData,
  });

  return {
    data: data?.data ?? [],
    meta: data?.meta,
    links: data?.links,
    isLoading: isPending,
    errors: (error as { data?: unknown })?.data ?? {},
    refetch,
  };
};

export const useScheduleById = (scheduleId?: string | number) => {
  const { data, error, refetch, isPending } = useQuery<ReportSchedule>({
    queryKey: ["report-schedule", scheduleId],
    queryFn: async () => {
      if (scheduleId === undefined) throw new Error("scheduleId required");
      return getScheduleByIdService(scheduleId);
    },
    enabled: scheduleId !== undefined,
  });

  return {
    data,
    isLoading: isPending,
    errors: (error as { data?: unknown })?.data ?? {},
    refetch,
  };
};
