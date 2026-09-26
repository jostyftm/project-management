"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/search-input";
import { CardHomePage } from "@/components/ui/card-home-page";
import PaginationButtons from "@/components/ui/pagination-buttons";
import { useResetPageOnEmpty } from "@/hooks/useResetPageOnEmpty";
import useDebounce from "@/hooks/use-debounce";
import { useMyReports } from "./hooks/use-my-reports";
import { ReportGridCard } from "./components/ReportGridCard";
import { GenerateReportModal } from "./components/GenerateReportModal";
import { MyReportItem } from "./types/my-report-types";
import {
  DownloadCloud,
  FileBarChart,
  RefreshCw,
  SearchX,
  ShieldAlert,
} from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

const PageMyReports = () => {
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [selectedReport, setSelectedReport] = useState<MyReportItem | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    filter: {
      ...(debouncedSearch ? { name: debouncedSearch } : {}),
    },
    paginate: true,
    page: page,
    limit: 12,
  };

  const { data, isLoading, meta, refetch, isFetching } = useMyReports({
    params: { params },
  });

  useResetPageOnEmpty({ data, currentPage: page, onPageChange: setPage });

  const handleOpenGenerate = (report: MyReportItem) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const hasNoReports = !isLoading && (!data || data.length === 0);

  return (
    <PermissionGuard action="view" unauthorizedComponent={<Unauthorized />}>
      <CardHomePage title="Mis Reportes">
        <div className="px-4 space-y-4 mt-2">
          {/* Caso 1: El usuario no tiene ningún reporte asignado */}
          {hasNoReports && !debouncedSearch ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-inner border border-amber-500/20">
                  <FileBarChart className="w-12 h-12 stroke-[1.5]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                No tienes reportes asignados
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                Los administradores configuran los reportes y asignan los permisos correspondientes. Si requieres acceso a un reporte específico, contacta al administrador del sistema.
              </p>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="gap-2 px-6 h-11 text-sm font-semibold border-slate-300"
              >
                <Link href="/downloads">
                  <DownloadCloud className="w-4 h-4 text-primary" />
                  <span>Ver historial de descargas</span>
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Barra superior de búsqueda y acceso a descargas */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:max-w-md">
                  <SearchInput
                    placeholder="Buscar reporte por nombre..."
                    onChangeDebounced={setSearch}
                  />
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

                  <Button asChild size="sm" className="gap-2 cursor-pointer font-semibold shadow-sm">
                    <Link href="/downloads">
                      <DownloadCloud className="w-4 h-4" />
                      <span>Mis Descargas</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Caso 2: Búsqueda sin coincidencias */}
              {hasNoReports && debouncedSearch ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                  <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
                    <SearchX className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-800">
                    No se encontraron reportes
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    No hay reportes asignados que coincidan con &quot;{debouncedSearch}&quot;.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                /* Caso 3: Grid de reportes asignados */
                <div className="space-y-6">
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-44 rounded-xl border border-slate-200 bg-slate-100/60 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data?.map((report) => (
                          <ReportGridCard
                            key={report.id}
                            report={report}
                            onGenerate={handleOpenGenerate}
                          />
                        ))}
                      </div>

                      {/* Paginación */}
                      {meta && (
                        <div className="flex justify-end pt-2">
                          <PaginationButtons meta={meta} onPressPage={setPage} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Modal de generación de reportes */}
          <GenerateReportModal
            report={selectedReport}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedReport(null);
            }}
          />
        </div>
      </CardHomePage>
    </PermissionGuard>
  );
};

export default PageMyReports;
