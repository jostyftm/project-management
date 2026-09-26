"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CardHomePage } from "@/components/ui/card-home-page";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResetPageOnEmpty } from "@/hooks/useResetPageOnEmpty";
import { ReportExecution } from "@/types/execution-type";
import { useListExecutions } from "./hooks/use-list-executions";
import { ColumnsExecution } from "./components/ColumnsExecution";
import ErrorLogModal from "./components/ErrorLogModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import BaseIcon from "@/components/ui/base-icon";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "success", label: "Exitoso" },
  { value: "processing", label: "Procesando" },
  { value: "failed", label: "Fallido" },
  { value: "skipped", label: "Omitido" },
];

const TRIGGER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos los tipos" },
  { value: "manual", label: "Manual" },
  { value: "scheduled", label: "Programado" },
];

const PageExecutions = () => {
  const searchParams = useSearchParams();

  // Filtros
  const [status, setStatus] = useState<string>("");
  const [triggerType, setTriggerType] = useState<string>("");
  const [reportId, setReportId] = useState<string>(
    searchParams.get("report_id") ?? ""
  );
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  // Modales
  const [errorExecution, setErrorExecution] = useState<ReportExecution | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sincronizar report_id desde query params (mejora 1.1)
  useEffect(() => {
    const id = searchParams.get("report_id");
    if (id) setReportId(id);
  }, [searchParams]);

  const filter: Record<string, string> = {};
  if (status) filter.status = status;
  if (triggerType) filter.trigger_type = triggerType;
  if (reportId) filter.report_id = reportId;
  if (dateFrom) filter.date_from = dateFrom;
  if (dateTo) filter.date_to = dateTo;

  const params = {
    filter,
    paginate: true,
    page,
    sort: "-created_at",
  };

  const { data, isLoading, meta } = useListExecutions({
    params: { params },
  });

  useResetPageOnEmpty({ data, currentPage: page, onPageChange: setPage });

  const handleViewError = (execution: ReportExecution) => {
    setErrorExecution(execution);
    setModalOpen(true);
  };

  const handleClearFilters = () => {
    setStatus("");
    setTriggerType("");
    setReportId("");
    setDateFrom("");
    setDateTo("");
  };

  // Cuenta de filtros activos para el badge del botón
  const activeFiltersCount = [status, triggerType, reportId, dateFrom, dateTo].filter(Boolean).length;

  return (
    <PermissionGuard
      action="view"
      unauthorizedComponent={<Unauthorized />}
    >
      <CardHomePage title="Historial de ejecuciones">
        <div className="px-4 space-y-4 mt-2">
          <div className="flex items-center justify-end gap-2">
            {/* Badge de reporte filtrado (mejora 1.1) */}
            {reportId && (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <BaseIcon name="Filter" size={12} />
                  Reporte #{reportId}
                  <button
                    onClick={() => setReportId("")}
                    className="ml-0.5 hover:text-destructive transition-colors"
                  >
                    <BaseIcon name="X" size={12} />
                  </button>
                </Badge>
              </div>
            )}

            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 relative">
                  <BaseIcon name="Filter" size={15} />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  {/* Estado */}
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Tipo de disparo */}
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filtro por ID de reporte (mejora 1.1) */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ID de Reporte</Label>
                    <Input
                      type="number"
                      placeholder="Ej: 5"
                      value={reportId}
                      onChange={(e) => setReportId(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Rango de fechas (mejora 2.2) */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Desde</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hasta</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      handleClearFilters();
                      setFiltersOpen(false);
                    }}
                  >
                    <BaseIcon name="RotateCcw" size={14} className="mr-1.5" />
                    Restablecer filtros
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <DataTable
            columns={ColumnsExecution({ onViewError: handleViewError })}
            data={data ?? []}
            isLoading={isLoading || !data}
            onPressPage={setPage}
            metaPagination={meta}
            defaultPageSize={15}
          />

          {errorExecution && (
            <ErrorLogModal
              execution={errorExecution}
              open={modalOpen}
              onOpenChange={setModalOpen}
            />
          )}
        </div>
      </CardHomePage>
    </PermissionGuard>
  );
};

export default PageExecutions;
