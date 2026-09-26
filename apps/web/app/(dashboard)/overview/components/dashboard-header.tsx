"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  PlusCircle,
  CalendarClock,
  FileSpreadsheet,
  Activity,
} from "lucide-react";

interface DashboardHeaderProps {
  isFetching: boolean;
  onRefresh: () => void;
  refreshInterval: number | false;
  onRefreshIntervalChange: (val: number | false) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  isFetching,
  onRefresh,
  refreshInterval,
  onRefreshIntervalChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Panel Ejecutivo y Métricas
          </h1>
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            En vivo
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoreo global del rendimiento, programaciones y salud operativa de reportes
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Selector de intervalo de actualización */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border/40">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Auto-recarga:</span>
          <Select
            value={refreshInterval === false ? "0" : String(refreshInterval)}
            onValueChange={(val) => {
              const num = parseInt(val, 10);
              onRefreshIntervalChange(num === 0 ? false : num);
            }}
          >
            <SelectTrigger className="h-7 w-[105px] text-xs border-0 bg-transparent shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="0">Manual</SelectItem>
              <SelectItem value="30000">30 seg</SelectItem>
              <SelectItem value="60000">1 min</SelectItem>
              <SelectItem value="300000">5 min</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botón de refresco manual */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="h-8 gap-1.5 px-3 text-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`}
          />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>

        {/* Acceso rápido a Mis Reportes */}
        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs">
          <Link href="/my-reports">
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" />
            Mis Reportes
          </Link>
        </Button>

        {/* Acceso rápido a Programaciones */}
        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs">
          <Link href="/reports/schedule">
            <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
            Programaciones
          </Link>
        </Button>

        {/* Acceso rápido a Crear Reporte */}
        <Button asChild size="sm" className="h-8 gap-1.5 px-3 text-xs">
          <Link href="/reports">
            <PlusCircle className="h-3.5 w-3.5" />
            Nuevo Reporte
          </Link>
        </Button>
      </div>
    </div>
  );
};
