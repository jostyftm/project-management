"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DownloadType } from "../types/download-types";
import {
  deleteDownloadById,
  requestDownloadById,
} from "../services/download-service";

export const useDownloadActions = () => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const handleDownload = async (item: DownloadType) => {
    setIsDownloading(true);
    const fileName = item.attributes.file_name;
    const toastId = toast.loading(`Descargando ${fileName}...`);

    try {
      const response = await requestDownloadById(item.id);
      const blob = new Blob([response as any]);
      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      globalThis.URL.revokeObjectURL(url);

      toast.success("Descarga exitosa", {
        id: toastId,
        description: `El archivo ${fileName} se descargó correctamente.`,
        duration: 4000,
      });
    } catch (error: any) {
      toast.error("Error al descargar archivo", {
        id: toastId,
        description:
          error?.message ||
          "No se pudo descargar el archivo. Intenta de nuevo más tarde.",
        duration: 5000,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    setIsDeleting(true);
    try {
      await deleteDownloadById(id);
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      toast.success("Descarga eliminada correctamente.");
    } catch (error: any) {
      toast.error("Error al eliminar", {
        description:
          error?.message || "No se pudo eliminar el registro de descarga.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleDownload,
    handleDelete,
    isDownloading,
    isDeleting,
  };
};
