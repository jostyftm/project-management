"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { prepareDownloadService } from "../../downloads/services/download-service";
import { requestGenerateReport } from "../services/my-report-service";
import {
  DeliveryType,
  MyReportItem,
  ReportFormat,
} from "../types/my-report-types";
import { resolveFilenamePattern } from "@/lib/filename-pattern-resolver";

interface GenerateParams {
  report: MyReportItem;
  params: Record<string, unknown>;
  format: ReportFormat;
  deliveryType: DeliveryType;
  destinationEmail?: string;
  selectedColumns?: string[];
  filenamePattern?: string;
}

export const useGenerateReport = () => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const router = useRouter();
  const { user } = useAuth();

  const generateReport = async ({
    report,
    params,
    format,
    deliveryType,
    destinationEmail,
    selectedColumns,
    filenamePattern,
  }: GenerateParams) => {
    setIsGenerating(true);
    const toastId = toast.loading("Iniciando solicitud de reporte...");

    try {
      const now = new Date();
      const pattern = filenamePattern || report.attributes.filename_pattern;
      const fileName = resolveFilenamePattern(pattern, report.attributes.name, format, now);

      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const filePath = `reports/${y}/${m}/${d}/${fileName}`;

      let downloadId: number | undefined = undefined;

      if (deliveryType === "download") {
        try {
          const prepRes = await prepareDownloadService({
            file_name: fileName,
            file_path: filePath,
            file_type: format,
            type: "report",
            disk: "s3",
            bucket_name: "test",
          });

          if (prepRes?.data?.id) {
            downloadId = Number(prepRes.data.id);
          }
        } catch (prepErr) {
          console.warn(
            "No se pudo pre-registrar en auth-service, el backend lo intentará:",
            prepErr
          );
        }
      }

      await requestGenerateReport(
        report.id,
        {
          params,
          format,
          delivery_type: deliveryType,
          destination_email: destinationEmail || user?.attributes?.email,
          download_id: downloadId,
          file_path: filePath,
          selected_columns: selectedColumns,
          filename_pattern: pattern || undefined,
        },
        user?.id
      );

      if (deliveryType === "download") {
        toast.success("¡Generación en proceso!", {
          id: toastId,
          description:
            "El archivo se está procesando en segundo plano. Puedes monitorear su estado en Descargas.",
          action: {
            label: "Ver descargas",
            onClick: () => router.push("/downloads"),
          },
          duration: 8000,
        });
      } else {
        toast.success("¡Reporte encolado!", {
          id: toastId,
          description: `El reporte se enviará a ${
            destinationEmail || user?.attributes?.email
          } una vez finalice.`,
          duration: 6000,
        });
      }

      return true;
    } catch (err: unknown) {
      toast.error("Error al solicitar el reporte", {
        id: toastId,
        description:
          (err as Error)?.message ||
          "No fue posible procesar la solicitud. Verifica los parámetros e intenta nuevamente.",
        duration: 6000,
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateReport,
    isGenerating,
  };
};
