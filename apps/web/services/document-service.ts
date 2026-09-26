import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import {
  ApiResponse,
  PaginatedResponse,
  PaginateResourcesProps,
} from "@/types/paginate";
import { DocumentItem, DocumentSchema } from "@/types/document-type";

const endpoint = API_URL("report", "v1");
const path = "documents";

export const requestAllDocuments = ({ params }: PaginateResourcesProps) =>
  reportRequestService<PaginatedResponse<DocumentItem>>({
    url: `${endpoint}/${path}`,
    method: "GET",
    params,
  });

export const getDocumentById = (id: string | number) =>
  reportRequestService<ApiResponse<DocumentItem>>({
    url: `${endpoint}/${path}/${id}`,
    method: "GET",
  });

export const saveDocument = (data: Partial<DocumentSchema>) =>
  reportRequestService<ApiResponse<DocumentItem>>({
    url: `${endpoint}/${path}`,
    method: "POST",
    data,
  });

export const updateDocument = (
  id: string | number,
  data: Partial<DocumentSchema>
) =>
  reportRequestService<ApiResponse<DocumentItem>>({
    url: `${endpoint}/${path}/${id}`,
    method: "PUT",
    data,
  });

export const deleteDocument = (id: string | number) =>
  reportRequestService({
    url: `${endpoint}/${path}/${id}`,
    method: "DELETE",
  });

export const exportDocumentPdf = (id: string | number) =>
  reportRequestService<Blob>({
    url: `${endpoint}/${path}/${id}/export-pdf`,
    method: "GET",
    responseType: "blob",
  });

export const exportDocumentWord = (id: string | number) =>
  reportRequestService<Blob>({
    url: `${endpoint}/${path}/${id}/export-word`,
    method: "GET",
    responseType: "blob",
  });

export const previewDocumentPdf = (data: DocumentSchema) =>
  reportRequestService<Blob>({
    url: `${endpoint}/${path}/preview-pdf`,
    method: "POST",
    data,
    responseType: "blob",
  });

export const previewDocumentWord = (data: DocumentSchema) =>
  reportRequestService<Blob>({
    url: `${endpoint}/${path}/preview-word`,
    method: "POST",
    data,
    responseType: "blob",
  });

export interface UploadedImageResponse {
  path: string;
  url: string;
  filename: string;
  size: number;
  mime_type?: string;
}

export const uploadDocumentImage = (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  return reportRequestService<ApiResponse<UploadedImageResponse>>({
    url: `${endpoint}/${path}/upload-image`,
    method: "POST",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
