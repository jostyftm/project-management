"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { ModalsNameConnection } from "@/app/(dashboard)/setting/connections/constants/connection-constants";
import { ModalsNameCategory } from "@/app/(dashboard)/setting/categories/constants/category-constants";
import { DatabaseConnection } from "@/types/connection-type";
import { ReportCategory } from "@/types/report-category-type";
import {
  Database,
  FolderTree,
  Plus,
  CheckCircle2,
  Lock,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

interface ReportPrerequisitesWizardProps {
  connections: DatabaseConnection[];
  categories: ReportCategory[];
}

export const ReportPrerequisitesWizard: React.FC<ReportPrerequisitesWizardProps> = ({
  connections,
  categories,
}) => {
  const openModal = useModalActionStore((state) => state.openModal);

  const hasConnections = connections.length > 0;
  const hasCategories = categories.length > 0;

  return (
    <div className="max-w-4xl mx-auto py-6 px-2 sm:px-4 space-y-8">
      {/* Encabezado explicativo */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Requisitos previos requeridos</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Antes de crear tu primer reporte
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Para diseñar reportes dinámicos interactivos, tu entorno necesita contar con al menos
          una conexión a base de datos y al menos una categoría organizativa.
        </p>
      </div>

      {/* Stepper visual de 3 fases */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Paso 1: Conexión */}
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
              hasConnections
                ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                : "bg-blue-50/60 border-blue-200 text-blue-950 ring-2 ring-blue-500/20"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                hasConnections
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {hasConnections ? <CheckCircle2 className="w-5 h-5" /> : "1"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Paso 1
                </span>
                <Badge
                  variant={hasConnections ? "default" : "outline"}
                  className={`text-[10px] px-1.5 py-0 h-4 ${
                    hasConnections
                      ? "bg-emerald-600 text-white"
                      : "border-blue-300 text-blue-700 bg-white"
                  }`}
                >
                  {hasConnections ? "Listo" : "Requerido"}
                </Badge>
              </div>
              <p className="text-sm font-semibold truncate">Conexión a BD</p>
            </div>
          </div>

          {/* Paso 2: Categoría */}
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
              hasCategories
                ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                : "bg-purple-50/60 border-purple-200 text-purple-950 ring-2 ring-purple-500/20"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                hasCategories
                  ? "bg-emerald-600 text-white"
                  : "bg-purple-600 text-white"
              }`}
            >
              {hasCategories ? <CheckCircle2 className="w-5 h-5" /> : "2"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Paso 2
                </span>
                <Badge
                  variant={hasCategories ? "default" : "outline"}
                  className={`text-[10px] px-1.5 py-0 h-4 ${
                    hasCategories
                      ? "bg-emerald-600 text-white"
                      : "border-purple-300 text-purple-700 bg-white"
                  }`}
                >
                  {hasCategories ? "Listo" : "Requerido"}
                </Badge>
              </div>
              <p className="text-sm font-semibold truncate">Categoría</p>
            </div>
          </div>

          {/* Paso 3: Asistente de Reporte */}
          <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 text-slate-600 flex items-center gap-3 opacity-80">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-200 text-slate-500 font-bold text-sm shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Paso 3
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-slate-500 bg-white">
                  Bloqueado
                </Badge>
              </div>
              <p className="text-sm font-semibold truncate">Creador de Reporte</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de acción para los requisitos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Tarjeta Requisito 1: Conexión */}
        <Card
          className={`flex flex-col justify-between transition-all ${
            !hasConnections
              ? "border-blue-200 shadow-md bg-linear-to-b from-blue-50/30 to-white ring-1 ring-blue-100"
              : "border-emerald-200 bg-emerald-50/20"
          }`}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center border transition-all ${
                  hasConnections
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-blue-100 text-blue-600 border-blue-200 shadow-inner"
                }`}
              >
                <Database className="w-10 h-10 stroke-[1.5]" />
              </div>
              {!hasConnections ? (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                1. Conexión a base de datos
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hasConnections
                  ? `Tienes ${connections.length} conexión(es) configurada(s). Tus reportes se conectarán a estos orígenes de datos.`
                  : "Conecta tu motor PostgreSQL, MySQL u Oracle para permitir que el generador ejecute consultas SQL y obtenga los datos."}
              </p>
            </div>

            <div className="pt-2 w-full">
              {!hasConnections ? (
                <Button
                  className="w-full gap-2 h-11 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow"
                  onClick={() =>
                    openModal("create", ModalsNameConnection.createConnection)
                  }
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear mi primera conexión</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  onClick={() =>
                    openModal("create", ModalsNameConnection.createConnection)
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar otra conexión</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Requisito 2: Categoría */}
        <Card
          className={`flex flex-col justify-between transition-all ${
            !hasCategories
              ? "border-purple-200 shadow-md bg-linear-to-b from-purple-50/30 to-white ring-1 ring-purple-100"
              : "border-emerald-200 bg-emerald-50/20"
          }`}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center border transition-all ${
                  hasCategories
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-purple-100 text-purple-600 border-purple-200 shadow-inner"
                }`}
              >
                <FolderTree className="w-10 h-10 stroke-[1.5]" />
              </div>
              {!hasCategories ? (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                2. Categoría de reportes
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hasCategories
                  ? `Tienes ${categories.length} categoría(s) registrada(s). Organiza tus reportes jerárquicamente.`
                  : "Crea tu primera categoría para organizar, indexar y gestionar tus reportes dinámicos de manera estructurada."}
              </p>
            </div>

            <div className="pt-2 w-full">
              {!hasCategories ? (
                <Button
                  className="w-full gap-2 h-11 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow"
                  onClick={() =>
                    openModal("create", ModalsNameCategory.createCategory)
                  }
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear mi primera categoría</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  onClick={() =>
                    openModal("create", ModalsNameCategory.createCategory)
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar otra categoría</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nota informativa inferior */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-600 text-sm">
        <Sparkles className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1">
          <span className="font-semibold text-slate-800">Detección automática: </span>
          Al completar la creación de la conexión y la categoría en el modal emergente, esta pantalla
          desbloqueará inmediatamente el asistente de creación de reportes sin necesidad de recargar.
        </div>
      </div>
    </div>
  );
};
