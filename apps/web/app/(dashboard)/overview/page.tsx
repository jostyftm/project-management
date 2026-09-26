"use client";

import React, { useState } from "react";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { DashboardHeader } from "./components/dashboard-header";
import { OverviewKpiCards } from "./components/overview-kpi-cards";
import { ExecutionTrendChart } from "./components/execution-trend-chart";
import { CategoryDonutChart } from "./components/category-donut-chart";
import { FormatDistributionCard } from "./components/format-distribution-card";
import { UpcomingSchedulesCard } from "./components/upcoming-schedules-card";
import { RecentExecutionsTable } from "./components/recent-executions-table";
import { ConnectionsHealthCard } from "./components/connections-health-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

export default function OverviewPage() {
  const [refreshInterval, setRefreshInterval] = useState<number | false>(false);

  const { overview, isLoading, isFetching, error, refetch } = useDashboardOverview({
    refetchInterval: refreshInterval,
  });

  return (
    <PermissionGuard action="view" unauthorizedComponent={<Unauthorized />}>
      <div className="space-y-6 pb-12">
      {/* 1. Encabezado interactivo con controles en vivo */}
      <DashboardHeader
        isFetching={isFetching}
        onRefresh={() => refetch()}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
      />

      {/* Manejo de estado de error */}
      {error && !overview && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-rose-700 dark:text-rose-300">
            Error al sincronizar el panel ejecutivo
          </h3>
          <p className="text-xs text-rose-600/80 max-w-md mx-auto">
            No se pudieron recuperar las métricas operativas del servidor. Por favor, verifica tu conexión e intenta nuevamente.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 text-xs border-rose-500/40 hover:bg-rose-500/20"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {/* Estado de carga inicial con esqueletos elegantes */}
      {isLoading && !overview && (
        <div className="space-y-6">
          {/* Skeleton KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>

          {/* Skeleton Fila Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Skeleton className="col-span-1 lg:col-span-3 h-80 rounded-xl" />
            <Skeleton className="col-span-1 lg:col-span-2 h-80 rounded-xl" />
          </div>

          {/* Skeleton Fila Operativa */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Skeleton className="col-span-1 lg:col-span-2 h-64 rounded-xl" />
            <Skeleton className="col-span-1 lg:col-span-3 h-64 rounded-xl" />
          </div>

          {/* Skeleton Tabla Reciente */}
          <Skeleton className="h-72 rounded-xl" />
        </div>
      )}

      {/* Vista principal con datos reales */}
      {overview && (
        <div className="space-y-6">
          {/* 2. Tarjetas KPI de resumen */}
          <OverviewKpiCards kpis={overview.kpis} />

          {/* 3. Fila de Gráficos Analíticos (Tendencia 14 días + Donut de Categorías) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <ExecutionTrendChart trend={overview.executions_trend} />
            <CategoryDonutChart
              categories={overview.reports_by_category}
              totalReports={overview.kpis.total_reports}
            />
          </div>

          {/* 4. Fila Operativa (Distribución de formatos + Programaciones activas) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <FormatDistributionCard formats={overview.formats_distribution} />
            <UpcomingSchedulesCard schedules={overview.upcoming_schedules} />
          </div>

          {/* 5. Salud de Conexiones a BD (mejora 4.3) */}
          <ConnectionsHealthCard connections={overview.connections_health} />

          {/* 6. Tabla de Actividad Reciente y Descargas */}
          <RecentExecutionsTable executions={overview.recent_executions} />
        </div>
      )}
      </div>
    </PermissionGuard>
  );
}
