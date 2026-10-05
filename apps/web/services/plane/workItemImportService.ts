import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { CsvImportResult, CsvPreviewData } from "@/types/plane-types";

export const workItemImportService = {
  preview: async (
    projectId: string | number,
    payload: { csv_content?: string; file?: File; delimiter?: string }
  ): Promise<CsvPreviewData> => {
    if (payload.file) {
      const formData = new FormData();
      formData.append("file", payload.file);
      if (payload.delimiter) formData.append("delimiter", payload.delimiter);

      return await httpRequestService<CsvPreviewData>({
        url: `${API_BASE_URL}/projects/${projectId}/import/csv/preview`,
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    return await httpRequestService<CsvPreviewData>({
      url: `${API_BASE_URL}/projects/${projectId}/import/csv/preview`,
      method: "POST",
      data: {
        csv_content: payload.csv_content,
        delimiter: payload.delimiter,
      },
    });
  },

  import: async (
    projectId: string | number,
    payload: { rows: Record<string, string>[]; column_mapping: Record<string, string> }
  ): Promise<CsvImportResult> => {
    return await httpRequestService<CsvImportResult>({
      url: `${API_BASE_URL}/projects/${projectId}/import/csv`,
      method: "POST",
      data: payload,
    });
  },

  downloadTemplate: (): string => {
    return `${API_BASE_URL}/import/csv/template`;
  },
};
