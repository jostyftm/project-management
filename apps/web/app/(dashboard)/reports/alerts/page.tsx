"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardHomePage } from "@/components/ui/card-home-page";
import SearchInput from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useDebounce from "@/hooks/use-debounce";
import { useAlerts, useAlertActions } from "@/hooks/use-alerts";
import { AlertMetricsCards } from "./components/AlertMetricsCards";
import { AlertsTable } from "./components/AlertsTable";
import { AlertDialogComponent } from "./components/AlertDialog";
import { AlertIncidentsDrawer } from "./components/AlertIncidentsDrawer";
import { ReportAlert } from "@/types/alert-types";
import { PlusCircle, RefreshCw, Filter, ShieldAlert } from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

export default function ReportsAlertsPage() {
  const [search, setSearch] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  // Modales
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingAlert, setEditingAlert] = useState<ReportAlert | null>(null);
  const [incidentsAlert, setIncidentsAlert] = useState<ReportAlert | null>(null);
  const [incidentsOpen, setIncidentsOpen] = useState<boolean>(false);

  const params: Record<string, any> = {
    limit: 15,
    page,
    ...(search ? { search } : {}),
    ...(severityFilter !== "all" ? { severity: severityFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { alerts, isLoading, isFetching, refetch } = useAlerts(params);
  const { createAlert, updateAlert, deleteAlert, toggleAlert, isCreating, isUpdating } =
    useAlertActions();

  const handleOpenCreate = () => {
    setEditingAlert(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (alert: ReportAlert) => {
    setEditingAlert(alert);
    setDialogOpen(true);
  };

  const handleOpenIncidents = (alert: ReportAlert) => {
    setIncidentsAlert(alert);
    setIncidentsOpen(true);
  };

  const handleFormSubmit = async (payload: any) => {
    if (editingAlert) {
      await updateAlert({ id: editingAlert.id, payload });
    } else {
      await createAlert(payload);
    }
  };

  return (
    <PermissionGuard
      action="view"
      unauthorizedComponent={<Unauthorized />}
    >
      <CardHomePage title="Alertas de Datos">
        <div className="space-y-6">
          {/* 1. Tarjetas de métricas de resumen */}
          <AlertMetricsCards alerts={alerts} />

          {/* 2. Barra de herramientas, filtros y botón de acción */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="w-full sm:w-64">
                <SearchInput
                  value={search}
                  onChangeDebounced={setSearch}
                  placeholder="Buscar por nombre o reporte..."
                />
              </div>

              {/* Filtro por Severidad */}
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-9 w-[130px] text-xs">
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas severidades</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="warning">Advertencia</SelectItem>
                  <SelectItem value="info">Informativa</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por Estado */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[120px] text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estados</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="triggered">Disparadas</SelectItem>
                  <SelectItem value="paused">Pausadas</SelectItem>
                </SelectContent>
              </Select>

              {/* Botón Refrescar */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-9 px-2.5 text-xs"
                title="Refrescar listado"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`}
                />
              </Button>
            </div>

            {/* Botón Crear Alerta */}
            <PermissionGuard action="create">
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="h-9 text-xs px-3.5 gap-1.5 shrink-0"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Nueva Regla de Alerta</span>
              </Button>
            </PermissionGuard>
          </div>

          {/* 3. Tabla interactiva de alertas */}
          <AlertsTable
            alerts={alerts}
            isLoading={isLoading}
            onEdit={handleOpenEdit}
            onDelete={deleteAlert}
            onToggle={toggleAlert}
            onViewIncidents={handleOpenIncidents}
          />

          {/* 4. Modal asistente de Creación y Edición */}
          <AlertDialogComponent
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            alert={editingAlert}
            onSubmit={handleFormSubmit}
            isSubmitting={isCreating || isUpdating}
          />

          {/* 5. Drawer lateral de historial de incidentes y logs */}
          <AlertIncidentsDrawer
            open={incidentsOpen}
            onClose={() => setIncidentsOpen(false)}
            alert={incidentsAlert}
          />
        </div>
      </CardHomePage>
    </PermissionGuard>
  );
}
