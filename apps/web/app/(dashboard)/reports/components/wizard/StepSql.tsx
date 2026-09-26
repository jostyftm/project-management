"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BaseIcon from "@/components/ui/base-icon";
import { X, Plus } from "lucide-react";
import { SqlEditor } from "@/components/ui/sql-editor";
import { Report } from "@/types/report-type";
import { useListConnections } from "../../../setting/connections/hooks/use-list-connections";
import { useReportPreview } from "../../hooks/use-dry-run";
import { useReportActions } from "../../hooks/use-report-actions";
import { useReportWizardStore } from "@/hooks/zustand/use-report-wizard-store";
import { useSchema } from "@/hooks/use-schema";
import { useExecuteQuery } from "../../hooks/use-execute-query";
import { toast } from "sonner";
import {
  extractSqlParameters,
  detectMalformedSqlParameters,
  mergeDetectedParams,
} from "../../utils/sql-param-utils";
import { DetectedParam, QueryParamType } from "../../types/query-execute-type";
import { QueryParamsModal } from "./QueryParamsModal";
import { QueryResultsTable } from "./QueryResultsTable";
import { ReportImpactModal } from "./ReportImpactModal";
import {
  getReportImpactService,
  ReportImpactData,
} from "../../services/report-service";

interface Props {
  report?: Report | null;
}

const isUpdate = (report: Report | null | undefined) => !!report?.id;

export const StepSql = ({ report }: Props) => {
  const storeConnectionId = useReportWizardStore((s) => s.connectionId);
  const storeSqlQuery = useReportWizardStore((s) => s.sqlQuery);
  const reportCategoryId = useReportWizardStore((s) => s.reportCategoryId);
  const name = useReportWizardStore((s) => s.name);
  const description = useReportWizardStore((s) => s.description);
  const filenamePattern = useReportWizardStore((s) => s.filenamePattern);
  const setSql = useReportWizardStore((s) => s.setSql);
  const setReportId = useReportWizardStore((s) => s.setReportId);
  const setStep = useReportWizardStore((s) => s.setStep);
  const discardedParameters = useReportWizardStore((s) => s.discardedParameters);
  const discardParameter = useReportWizardStore((s) => s.discardParameter);
  const restoreParameter = useReportWizardStore((s) => s.restoreParameter);

  const connectionId =
    storeConnectionId ?? report?.relationships.connection_id ?? null;
  const initialSql = storeSqlQuery || report?.attributes.sql_query || "";
  const [sql, setLocalSql] = useState<string>(initialSql);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Sincronizar si la consulta llega desde el reporte o store y el estado local aún está vacío
  React.useEffect(() => {
    const targetSql = storeSqlQuery || report?.attributes.sql_query || "";
    if (targetSql && !sql) {
      setLocalSql(targetSql);
      setSql(targetSql);
    }
  }, [storeSqlQuery, report?.attributes.sql_query, sql, setSql]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { data: connections } = useListConnections({
    params: { params: { paginate: false } },
  });

  const connection = connections?.find((c) => c.id === connectionId);
  const driverCode =
    connection?.relationships.driver?.laravel_driver ?? "mysql";

  const { schema, isLoading: isLoadingSchema } = useSchema(connectionId);

  const { runPreview, isLoading: isPreviewing } = useReportPreview();
  const { saveReport, isLoading: isSaving } = useReportActions();

  const [paramsState, setParamsState] = useState<
    Record<string, { type?: QueryParamType; value: string }>
  >({});
  const [isParamsModalOpen, setIsParamsModalOpen] = useState<boolean>(false);

  // Estados para validación de impacto sobre programaciones
  const [isImpactModalOpen, setIsImpactModalOpen] = useState<boolean>(false);
  const [isCheckingImpact, setIsCheckingImpact] = useState<boolean>(false);
  const [impactData, setImpactData] = useState<ReportImpactData | null>(null);
  const [diffParams, setDiffParams] = useState<{ removed: string[]; added: string[] }>({
    removed: [],
    added: [],
  });

  const {
    execute,
    result,
    errorMessage,
    isLoading: isExecuting,
    clearResult,
  } = useExecuteQuery();

  const rawDetectedParamNames = extractSqlParameters(sql);
  const malformedParamNames = detectMalformedSqlParameters(sql);

  // Separar parámetros activos vs descartados por el usuario
  const detectedParamNames = rawDetectedParamNames.filter(
    (p) => !discardedParameters.includes(p)
  );
  const discardedParamNames = rawDetectedParamNames.filter(
    (p) => discardedParameters.includes(p)
  );
  const detectedParams = mergeDetectedParams(sql, paramsState).filter(
    (p) => !discardedParameters.includes(p.name)
  );

  // Solo enviar al backend las variables descartadas que siguen presentes en el SQL
  const effectiveDiscarded = discardedParameters.filter((p) =>
    rawDetectedParamNames.includes(p)
  );

  const handleExecuteClick = () => {
    if (!connectionId || !sql.trim()) return;

    if (malformedParamNames.length > 0) {
      toast.error(
        malformedParamNames[0].startsWith("{{")
          ? `Error de sintaxis: la variable ${malformedParamNames[0]} no está cerrada con '}}'. Revisa la consulta.`
          : `Error de sintaxis: el parámetro :${malformedParamNames[0]} parece estar pegado a una columna sin operador (=). Revisa la consulta.`
      );
      return;
    }

    if (detectedParamNames.length > 0) {
      setIsParamsModalOpen(true);
    } else {
      execute(connectionId, sql, {}, 50, effectiveDiscarded);
    }
  };

  const handleExecuteWithParams = async (
    values: Record<string, unknown>,
    updatedParams: DetectedParam[]
  ) => {
    if (!connectionId) return;

    const nextMap: Record<string, { type: QueryParamType; value: string }> = {};
    updatedParams.forEach((p) => {
      nextMap[p.name] = { type: p.type, value: p.value };
    });
    setParamsState(nextMap);

    setIsParamsModalOpen(false);
    await execute(connectionId, sql, values, 50, effectiveDiscarded);
  };

  const proceedWithSaveAndValidate = async () => {
    if (!connectionId) return;
    if (!sql.trim()) return;

    if (malformedParamNames.length > 0) {
      toast.error(
        malformedParamNames[0].startsWith("{{")
          ? `Corrige la sintaxis de la variable ${malformedParamNames[0]} (falta cerrar con '}}') antes de continuar.`
          : `Corrige la sintaxis del parámetro :${malformedParamNames[0]} (falta operador como '=') antes de continuar.`
      );
      return;
    }

    // Extraer valores de parámetros activos ya introducidos si existen
    const paramValues: Record<string, unknown> = {};
    detectedParamNames.forEach((name) => {
      const val = paramsState[name]?.value;
      if (val !== undefined && val !== "") {
        paramValues[name] = val;
      }
    });

    const valid = await runPreview(
      connectionId,
      sql,
      Object.keys(paramValues).length > 0 ? paramValues : undefined,
      effectiveDiscarded
    );
    if (!valid) return;

    const saved = await saveReport(
      {
        name,
        description,
        database_connection_id: connectionId,
        report_category_id: reportCategoryId,
        sql_query: sql,
        discarded_parameters: effectiveDiscarded,
        filename_pattern: filenamePattern || report?.attributes.filename_pattern || undefined,
      },
      report?.id
    );
    if (!saved) return;

    setSql(sql);
    setReportId(String(saved.id));
    setStep("parameters");
  };

  const handleValidate = async () => {
    if (!connectionId) return;
    if (!sql.trim()) return;

    // Si es edición de un reporte existente, verificamos si los parámetros cambiaron
    if (isUpdate(report) && report?.id) {
      const currentParamNames =
        report.relationships?.parameters?.map((p) => p.attributes.param_name) ?? [];
      const newParamNames = extractSqlParameters(sql);

      const removed = currentParamNames.filter((p) => !newParamNames.includes(p));
      const added = newParamNames.filter((p) => !currentParamNames.includes(p));
      const hasChanges = removed.length > 0 || added.length > 0;

      if (hasChanges) {
        try {
          setIsCheckingImpact(true);
          const impactRes = await getReportImpactService(report.id);
          const data = impactRes.data;
          const count = data.schedules_count || data.schedules?.length || 0;

          if (count > 0) {
            setImpactData(data);
            setDiffParams({ removed, added });
            setIsImpactModalOpen(true);
            return;
          }
        } catch (err) {
          console.error("Error al verificar impacto del reporte:", err);
        } finally {
          setIsCheckingImpact(false);
        }
      }
    }

    await proceedWithSaveAndValidate();
  };

  const handleConfirmImpact = async () => {
    setIsImpactModalOpen(false);
    await proceedWithSaveAndValidate();
  };

  const driverLabel = connection?.relationships.driver?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Escribe la consulta SQL con variables opcionales{" "}
          <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-primary font-semibold">
            {"{{nombre}}"}
          </code>
          . El editor resalta la sintaxis y autocompleta tablas/columnas de la
          conexión.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BaseIcon name="Database" size={14} />
          {driverLabel}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <SqlEditor
          value={sql}
          onChange={(newSql) => {
            setLocalSql(newSql);
            setSql(newSql);
          }}
          dialect={driverCode}
          tables={schema?.tables ?? []}
          placeholder="SELECT id, nombre FROM clientes WHERE fecha >= {{fecha_desde}}"
          invalid={malformedParamNames.length > 0}
        />
      </div>

      {malformedParamNames.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          <BaseIcon
            name="AlertTriangle"
            size={16}
            className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
          />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              Posible error de sintaxis en variable SQL:
            </p>
            <p className="leading-relaxed">
              {malformedParamNames[0].startsWith("{{") ? (
                <>
                  Se detectó una variable sin cerrar con <code className="font-mono font-semibold bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded">{'}}'}</code>:{" "}
                  {malformedParamNames.map((p) => (
                    <code
                      key={p}
                      className="font-mono font-semibold bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded mr-1"
                    >
                      {p}
                    </code>
                  ))}
                </>
              ) : (
                <>
                  Se detectó un parámetro pegado a un identificador sin operador de separación:{" "}
                  {malformedParamNames.map((p) => (
                    <code
                      key={p}
                      className="font-mono font-semibold bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded mr-1"
                    >
                      :{p}
                    </code>
                  ))}
                </>
              )}
            </p>
            <p className="text-muted-foreground text-[11px]">
              Ejemplo correcto:{" "}
              <code className="font-mono font-semibold text-foreground">
                columna = {"{{fecha}}"}
              </code>
            </p>
          </div>
        </div>
      )}

      {/* Barra de herramientas para ejecución en caliente */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {detectedParamNames.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <BaseIcon name="Variable" size={13} />
              <span>Variables detectadas:</span>
              {detectedParamNames.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="font-mono text-[11px] py-0.5 pl-2 pr-1 flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border-primary/30 text-primary"
                >
                  <span>{`{{${p}}}`}</span>
                  <button
                    type="button"
                    onClick={() => discardParameter(p)}
                    className="hover:text-destructive hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full p-0.5 transition-colors cursor-pointer"
                    title={`Descartar variable {{${p}}}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </span>
          )}

          {discardedParamNames.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap ml-1">
              <span className="text-slate-400">Descartadas ({discardedParamNames.length}):</span>
              {discardedParamNames.map((p) => (
                <Badge
                  key={p}
                  variant="secondary"
                  className="line-through text-slate-400 font-mono text-[11px] py-0.5 pl-2 pr-1 flex items-center gap-1 bg-slate-100 dark:bg-slate-800"
                >
                  <span>{`{{${p}}}`}</span>
                  <button
                    type="button"
                    onClick={() => restoreParameter(p)}
                    className="hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 transition-colors cursor-pointer"
                    title={`Restaurar variable {{${p}}}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {detectedParamNames.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsParamsModalOpen(true)}
              disabled={isExecuting || !connectionId || !sql.trim()}
              className="h-8 gap-1.5 text-xs"
              title="Ingresar valores de prueba para la ejecución en caliente"
            >
              <BaseIcon name="SlidersHorizontal" size={13} />
              Valores de prueba
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExecuteClick}
            disabled={isExecuting || !connectionId || !sql.trim()}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <BaseIcon
              name={isExecuting ? "Loader" : "Play"}
              size={13}
              className={
                isExecuting ? "animate-spin text-primary" : "text-primary"
              }
            />
            {isExecuting ? "Ejecutando..." : "Ejecutar consulta"}
          </Button>
        </div>
      </div>

      {/* Tabla de resultados en caliente */}
      <QueryResultsTable
        result={result}
        errorMessage={errorMessage}
        isLoading={isExecuting}
        onClear={clearResult}
        onReopenParams={() => setIsParamsModalOpen(true)}
        hasParams={detectedParamNames.length > 0}
      />

      {/* Modal para solicitar parámetros dinámicos */}
      <QueryParamsModal
        open={isParamsModalOpen}
        onOpenChange={setIsParamsModalOpen}
        initialParams={detectedParams}
        onExecute={handleExecuteWithParams}
        isLoading={isExecuting}
      />

      {/* Modal de advertencia de impacto sobre programaciones */}
      <ReportImpactModal
        isOpen={isImpactModalOpen}
        onClose={() => setIsImpactModalOpen(false)}
        onConfirm={handleConfirmImpact}
        isLoading={isSaving || isPreviewing}
        impactData={impactData}
        removedParams={diffParams.removed}
        addedParams={diffParams.added}
      />

      <div className="flex gap-2 justify-between items-center">
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            setSql(sql);
            setStep("details");
          }}
          className="gap-2"
        >
          <BaseIcon name="ArrowLeft" size={15} />
          Atrás
        </Button>
        <div className="flex items-center gap-2">
          {isLoadingSchema && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <BaseIcon name="Loader" size={12} className="animate-spin" />
              Cargando esquema...
            </span>
          )}
          {isUpdate(report) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSql(sql);
                setStep("parameters");
              }}
              disabled={isPreviewing || isSaving || isCheckingImpact || !connectionId || !sql.trim()}
              className="gap-2"
            >
              Continuar
              <BaseIcon name="ArrowRight" size={15} />
            </Button>
          )}
          <Button
            type="button"
            onClick={handleValidate}
            disabled={isPreviewing || isSaving || isCheckingImpact || !connectionId || !sql.trim()}
            className="gap-2"
          >
            <BaseIcon
              name={isPreviewing || isCheckingImpact ? "Loader" : "Play"}
              className={isPreviewing || isCheckingImpact ? "animate-spin" : ""}
              size={15}
            />
            {isPreviewing
              ? "Validando..."
              : isCheckingImpact
              ? "Verificando..."
              : isUpdate(report)
              ? "Guardar y Validar"
              : "Crear y Validar"}
          </Button>
        </div>
      </div>
    </div>
  );
};