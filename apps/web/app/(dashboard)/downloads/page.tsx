"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/search-input";
import { DataTable } from "@/components/ui/data-table";
import { CardHomePage } from "@/components/ui/card-home-page";
import { useResetPageOnEmpty } from "@/hooks/useResetPageOnEmpty";
import useDebounce from "@/hooks/use-debounce";
import { useListDownloads } from "./hooks/use-list-downloads";
import { ColumnsDownload } from "./components/(table)/ColumnsDownload";
import { DownloadCloud, FileBarChart, RefreshCw, SearchX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

const PageDownloads = () => {
  const [search, setSearch] = useState<string>("");
  const [fileType, setFileType] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  const debouncedSearch = useDebounce(search, 400);

  const filterParams: Record<string, any> = {};
  if (debouncedSearch) {
    filterParams.file_name = debouncedSearch;
  }
  if (fileType && fileType !== "all") {
    filterParams.file_type = fileType;
  }

  const params = {
    filter: filterParams,
    paginate: true,
    page: page,
    limit: 10,
    sort: "-created_at",
  };

  const { data, isLoading, meta, refetch, isFetching } = useListDownloads({
    params: { params },
  });

  useResetPageOnEmpty({ data, currentPage: page, onPageChange: setPage });

  const hasNoDownloads = !isLoading && (!data || data.length === 0);

  return (
    <PermissionGuard action="view" unauthorizedComponent={<Unauthorized />}>
      <CardHomePage title="Descargas de Reportes">
        <div className="px-4 space-y-4 mt-2">
          {/* Caso 1: Aún no tiene descargas */}
          {hasNoDownloads && !debouncedSearch && fileType === "all" ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                  <DownloadCloud className="w-12 h-12 stroke-[1.5]" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                No tienes descargas registradas
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                Cuando generes un reporte con opción de descarga directa, podrás consultar su progreso y descargarlo aquí en cualquier momento.
              </p>

              <Button asChild size="lg" className="gap-2 px-8 h-12 text-sm font-semibold shadow-md">
                <Link href="/my-reports">
                  <FileBarChart className="w-4 h-4" />
                  <span>Explorar mis reportes asignados</span>
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Barra de filtros y acciones */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1 max-w-2xl">
                  <div className="w-full sm:w-80">
                    <SearchInput
                      placeholder="Buscar por nombre de archivo..."
                      onChangeDebounced={setSearch}
                    />
                  </div>

                  <div className="w-full sm:w-44">
                    <Select value={fileType} onValueChange={setFileType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Formato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los formatos</SelectItem>
                        <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                        <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                        <SelectItem value="docx">Word (.docx)</SelectItem>
                        <SelectItem value="txt">Texto (.txt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 cursor-pointer border-slate-300"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : ""}`}
                    />
                    <span>Actualizar</span>
                  </Button>
                </div>
              </div>

              {/* Caso 2: Búsqueda sin coincidencias */}
              {hasNoDownloads && (debouncedSearch || fileType !== "all") ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                  <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
                    <SearchX className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-800">
                    No se encontraron descargas
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    No hay archivos que coincidan con los filtros seleccionados.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFileType("all");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              ) : (
                /* Caso 3: Tabla con descargas */
                <DataTable
                  columns={ColumnsDownload()}
                  data={data ?? []}
                  isLoading={isLoading}
                  onPressPage={setPage}
                  metaPagination={meta}
                />
              )}
            </>
          )}
        </div>
      </CardHomePage>
    </PermissionGuard>
  );
};

export default PageDownloads;
