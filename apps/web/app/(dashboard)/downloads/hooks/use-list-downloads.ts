"use client";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaginateResourcesProps } from "@/types/paginate";
import { DownloadType, FilterDownloadType } from "../types/download-types";
import { requestAllDownloads } from "../services/download-service";
import { useDownloadActions } from "./use-download-actions";

interface UseListDownloadsProps {
  params?: PaginateResourcesProps<FilterDownloadType>;
}

export const useListDownloads = ({ params }: UseListDownloadsProps) => {
  const { handleDownload } = useDownloadActions();
  const prevProcessingIdsRef = useRef<Set<string | number>>(new Set());
  const safeParams = params ?? { params: {} };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["downloads", safeParams],
    queryFn: async () => {
      const response = await requestAllDownloads(safeParams);
      return response;
    },
    refetchInterval: (query) => {
      const downloads = query.state.data?.data as DownloadType[] | undefined;
      const hasProcessing = downloads?.some(
        (d) => String(d.attributes.status_code) === "0"
      );
      return hasProcessing ? 4000 : false;
    },
    refetchOnWindowFocus: true,
  });

  const downloadList = (data?.data ?? []) as DownloadType[];

  // Monitorear finalización de descargas que estaban en proceso
  useEffect(() => {
    if (!downloadList || downloadList.length === 0) return;

    const currentProcessingIds = new Set<string | number>();

    downloadList.forEach((item) => {
      const code = String(item.attributes.status_code);
      const itemId = item.id;

      if (code === "0") {
        currentProcessingIds.add(itemId);
      } else if (prevProcessingIdsRef.current.has(itemId) && code === "2") {
        // El archivo acaba de completarse
        toast.success("¡Reporte listo para descargar!", {
          description: `El archivo ${item.attributes.file_name} ha finalizado su generación.`,
          action: {
            label: "Descargar",
            onClick: () => handleDownload(item),
          },
          duration: 10000,
        });
      }
    });

    prevProcessingIdsRef.current = currentProcessingIds;
  }, [downloadList, handleDownload]);

  return {
    data: downloadList,
    meta: data?.meta,
    links: data?.links,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
};
