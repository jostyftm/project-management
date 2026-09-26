"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CardHomePage } from "@/components/ui/card-home-page";
import SearchInput from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListDocuments, useDocumentActions } from "./hooks/use-documents";
import { ScheduleDialog } from "@/app/(dashboard)/reports/schedule/components/ScheduleDialog";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { DocumentItem } from "@/types/document-type";
import useDebounce from "@/hooks/use-debounce";
import {
  Plus,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  CalendarClock,
  FileDown,
  FileType,
  Loader2,
  Layout,
  User as UserIcon,
} from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

export default function DocumentsDashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const fetchCatalogs = useCatalogStore((state) => state.fetchCatalogs);

  React.useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const { data: documents, isLoading, refetch } = useListDocuments({
    params: {
      params: {
        filter: { name: debouncedSearch },
        paginate: false,
      },
    },
  });

  const { deleteDocument, downloadPdf, downloadWord } = useDocumentActions();

  const handleOpenSchedule = (docId: number) => {
    setSelectedTemplateId(docId);
    setScheduleModalOpen(true);
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (confirm(`¿Estás seguro de eliminar el documento "${doc.attributes.name}"?`)) {
      await deleteDocument(doc.id);
      refetch();
    }
  };

  return (
    <PermissionGuard action="view" unauthorizedComponent={<Unauthorized />}>
      <CardHomePage title="Doc Studio: Plantillas y Documentos">
        <div className="px-4 space-y-4 mt-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:max-w-md">
              <SearchInput
                placeholder="Buscar plantilla de documento..."
                onChangeDebounced={setSearch}
              />
            </div>
            <PermissionGuard action="create">
              <Button
                className="w-full sm:w-auto cursor-pointer gap-2"
                onClick={() => router.push("/documents/studio")}
              >
                <Plus className="w-4 h-4" />
                <span>Crear documento</span>
              </Button>
            </PermissionGuard>
          </div>

          {/* Documents Content */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm">Cargando documentos...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              <Layout className="w-12 h-12 mb-3 text-slate-300 stroke-[1.5]" />
              <h3 className="text-base font-semibold text-slate-800">
                {search ? "No se encontraron documentos" : "No tienes documentos creados"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                {search
                  ? "Prueba buscando con otro término o limpia el buscador."
                  : "Diseña documentos ejecutivos con columnas, texto enriquecido, imágenes, gráficas y tablas dinámicas exportables a PDF o Word."}
              </p>
              <PermissionGuard action="create">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 cursor-pointer"
                  onClick={() => router.push("/documents/studio")}
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear mi primer documento</span>
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {documents.map((doc) => {
                const settings = doc.attributes.page_settings || {};
                const sizeLabel = (settings.size || "A4").toUpperCase();
                const orientationLabel =
                  settings.orientation === "landscape" ? "Horizontal" : "Vertical";
                const rowsCount = doc.attributes.content?.rows?.length || 0;

                return (
                  <Card
                    key={doc.id}
                    className="hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="font-bold text-sm text-slate-900 truncate hover:underline cursor-pointer"
                            onClick={() => router.push(`/documents/studio/${doc.id}`)}
                            title={doc.attributes.name}
                          >
                            {doc.attributes.name}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {doc.attributes.description || "Sin descripción"}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <PermissionGuard action="update">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => router.push(`/documents/studio/${doc.id}`)}
                            >
                              <Edit className="w-3.5 h-3.5 mr-2 text-primary" />
                              <span>Editar en Studio</span>
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard action="view">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => downloadPdf(doc.id, doc.attributes.name)}
                            >
                              <FileDown className="w-3.5 h-3.5 mr-2 text-rose-600" />
                              <span>Exportar PDF</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => downloadWord(doc.id, doc.attributes.name)}
                            >
                              <FileType className="w-3.5 h-3.5 mr-2 text-blue-600" />
                              <span>Exportar Word (.docx)</span>
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard action="update">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleOpenSchedule(doc.id)}
                            >
                              <CalendarClock className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                              <span>Programar envío</span>
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard action="delete">
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 cursor-pointer"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              <span>Eliminar</span>
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 pb-3">
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {sizeLabel} {orientationLabel}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {rowsCount} {rowsCount === 1 ? "fila" : "filas"}
                        </Badge>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0 border-t flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {doc.relationships?.user && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded max-w-[120px] truncate"
                            title={`Creado por: ${doc.relationships.user.name} (${doc.relationships.user.email})`}
                          >
                            <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.relationships.user.name}</span>
                          </span>
                        )}
                        <span className="shrink-0">
                          {doc.attributes.created_at
                            ? new Date(doc.attributes.created_at).toLocaleDateString()
                            : "Reciente"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <PermissionGuard action="update">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary cursor-pointer"
                            onClick={() => router.push(`/documents/studio/${doc.id}`)}
                          >
                            Abrir Studio
                          </Button>
                        </PermissionGuard>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {scheduleModalOpen && (
          <ScheduleDialog
            open={scheduleModalOpen}
            onOpenChange={setScheduleModalOpen}
            defaultDocumentTemplateId={selectedTemplateId}
          />
        )}
      </CardHomePage>
    </PermissionGuard>
  );
}
