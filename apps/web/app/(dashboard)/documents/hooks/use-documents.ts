import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  requestAllDocuments,
  getDocumentById,
  saveDocument,
  updateDocument,
  deleteDocument,
  exportDocumentPdf,
  exportDocumentWord,
  downloadBlob,
} from "@/services/document-service";
import { DocumentItem, DocumentSchema } from "@/types/document-type";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { toast } from "sonner";

export const useListDocuments = ({ params }: { params?: PaginateResourcesProps }) => {
  const safeParams = params ?? { params: {} };
  const queryKey = ["documents", safeParams];

  const { data, error, refetch, isPending } = useQuery<PaginatedResponse<DocumentItem>>({
    queryKey,
    queryFn: async () => requestAllDocuments(safeParams),
  });

  return {
    data: data?.data ?? [],
    meta: data?.meta,
    links: data?.links,
    isLoading: isPending,
    error,
    refetch,
  };
};

export const useDocumentById = (id: string | number | undefined) => {
  return useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await getDocumentById(id);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useDocumentActions = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<DocumentSchema>) => saveDocument(data),
    onSuccess: (res) => {
      invalidate();
      toast.success("Documento guardado correctamente");
      return res;
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al guardar el documento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<DocumentSchema> }) =>
      updateDocument(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Documento actualizado correctamente");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al actualizar el documento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteDocument(id),
    onSuccess: () => {
      invalidate();
      toast.success("Documento eliminado correctamente");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al eliminar el documento");
    },
  });

  const downloadPdf = async (id: string | number, name?: string) => {
    try {
      toast.info("Generando PDF en servidor...");
      const blob = await exportDocumentPdf(id);
      const filename = `${(name || "documento").replace(/\s+/g, "_")}.pdf`;
      downloadBlob(blob, filename);
      toast.success("PDF descargado con éxito");
    } catch (err: any) {
      toast.error(err?.message || "Error al exportar PDF");
    }
  };

  const downloadWord = async (id: string | number, name?: string) => {
    try {
      toast.info("Generando archivo Word (.docx) en servidor...");
      const blob = await exportDocumentWord(id);
      const filename = `${(name || "documento").replace(/\s+/g, "_")}.docx`;
      downloadBlob(blob, filename);
      toast.success("Word descargado con éxito");
    } catch (err: any) {
      toast.error(err?.message || "Error al exportar Word");
    }
  };

  return {
    createDocument: createMutation.mutateAsync,
    updateDocument: updateMutation.mutateAsync,
    deleteDocument: deleteMutation.mutateAsync,
    downloadPdf,
    downloadWord,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
