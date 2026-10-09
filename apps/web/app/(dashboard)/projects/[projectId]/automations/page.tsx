"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { projectService } from "@/services/plane/projectService";
import { automationService } from "@/services/plane/automationService";
import { Project, RecurringWorkItem, AutomationRule, WorkItem } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Repeat,
  Plus,
  Play,
  Trash2,
  ChevronRight,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Terminal,
  Bot,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ProjectAutomationsPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);

  useDocumentTitle(`Automatizaciones - ${project?.name || "Proyecto"}`);
  const [loading, setLoading] = useState(true);

  // Recurring Work Items state
  const [recurringItems, setRecurringItems] = useState<RecurringWorkItem[]>([]);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [runningRecurringId, setRunningRecurringId] = useState<number | null>(null);
  const [isSavingRecurring, setIsSavingRecurring] = useState(false);

  // New Recurring Item form
  const [recTitle, setRecTitle] = useState("");
  const [recDescription, setRecDescription] = useState("");
  const [recPriority, setRecPriority] = useState<string>("MEDIUM");
  const [recFrequency, setRecFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM">("DAILY");
  const [recCron, setRecCron] = useState("0 9 * * 1-5");

  // Automation Rules state
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [testingRuleId, setTestingRuleId] = useState<number | null>(null);
  const [isSavingRule, setIsSavingRule] = useState(false);

  // New Rule form
  const [ruleName, setRuleName] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState("work_item.status_changed");
  const [ruleActionType, setRuleActionType] = useState("set_priority");
  const [ruleActionValue, setRuleActionValue] = useState("HIGH");

  const loadAll = async () => {
    try {
      setLoading(true);
      const [projData, recurringData, rulesData] = await Promise.all([
        projectService.get(projectId),
        automationService.listRecurring(projectId),
        automationService.listRules(projectId),
      ]);
      setProject(projData);
      setRecurringItems(recurringData || []);
      setRules(rulesData || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al cargar automatizaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [projectId]);

  // Handle frequency preset change
  const handleFrequencyChange = (freq: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM") => {
    setRecFrequency(freq);
    if (freq === "DAILY") {
      setRecCron("0 9 * * 1-5");
    } else if (freq === "WEEKLY") {
      setRecCron("0 9 * * 1");
    } else if (freq === "MONTHLY") {
      setRecCron("0 9 1 * *");
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitle.trim()) {
      toast.error("Ingresa el título de la tarea periódica");
      return;
    }

    setIsSavingRecurring(true);
    try {
      await automationService.createRecurring(projectId, {
        frequency: recFrequency,
        cron_expression: recCron.trim(),
        work_item_template: {
          title: recTitle.trim(),
          description: recDescription.trim() || undefined,
          priority: recPriority,
        },
        is_active: true,
      });

      toast.success("Tarea recurrente programada exitosamente");
      setIsAddRecurringOpen(false);
      setRecTitle("");
      setRecDescription("");
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al programar tarea recurrente");
    } finally {
      setIsSavingRecurring(false);
    }
  };

  const handleRunRecurringNow = async (id: number) => {
    setRunningRecurringId(id);
    try {
      const res = await automationService.runRecurringNow(id);
      toast.success(res?.message || "Tarea recurrente ejecutada", {
        description: `Se ha creado el Work Item: ${res?.work_item?.identifier || "Nuevo"}`,
      });
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al ejecutar tarea periódica");
    } finally {
      setRunningRecurringId(null);
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!confirm("¿Deseas eliminar esta tarea periódica programada?")) return;
    try {
      await automationService.deleteRecurring(id);
      toast.success("Tarea periódica eliminada");
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al eliminar");
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      toast.error("Ingresa el nombre de la regla");
      return;
    }

    setIsSavingRule(true);
    try {
      let actions: Record<string, any> = {};
      if (ruleActionType === "set_priority") {
        actions = { update: { priority: ruleActionValue } };
      } else if (ruleActionType === "auto_close_stale") {
        actions = { auto_close: true, after_days: 14 };
      }

      await automationService.createRule(projectId, {
        name: ruleName.trim(),
        trigger_event: ruleTrigger,
        trigger_conditions: {
          event: ruleTrigger,
        },
        actions,
        is_active: true,
      });

      toast.success("Regla de automatización creada");
      setIsAddRuleOpen(false);
      setRuleName("");
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al crear regla");
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleToggleRuleActive = async (rule: AutomationRule) => {
    try {
      await automationService.updateRule(rule.id, {
        is_active: !rule.is_active,
      });
      toast.success(`Regla ${!rule.is_active ? "activada" : "pausada"}`);
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al cambiar estado");
    }
  };

  const handleTestRule = async (id: number) => {
    setTestingRuleId(id);
    try {
      const res = await automationService.testRule(id);
      toast.success(res?.message || "Regla evaluada exitosamente", {
        description: `Work items afectados: ${res?.applied_count ?? 0}`,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al probar regla");
    } finally {
      setTestingRuleId(null);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("¿Deseas eliminar esta regla de automatización?")) return;
    try {
      await automationService.deleteRule(id);
      toast.success("Regla eliminada");
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al eliminar");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando motor de automatizaciones...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <ProjectBreadcrumb
            projectId={projectId}
            projectName={project?.name || "Proyecto"}
            sectionTitle="Automatizaciones"
          />
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Automatizaciones y Tareas Periódicas
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 gap-1">
              <Zap className="size-3" /> Motor Activo
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Automatiza tareas repetitivas (reuniones diarias, rotaciones, checklists de release) y define reglas reactivas para mantener tu tablero siempre al día.
          </p>
        </div>
      </div>

      <Tabs defaultValue="recurring" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="recurring" className="text-xs gap-1.5">
            <Repeat className="size-3.5" />
            Tareas Periódicas ({recurringItems.length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs gap-1.5">
            <SlidersHorizontal className="size-3.5" />
            Reglas Automáticas ({rules.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Recurring Work Items */}
        <TabsContent value="recurring" className="space-y-6 mt-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Tareas Programadas Recurrentes</h2>
              <p className="text-xs text-slate-500">
                Se crean automáticamente en base a su expresión Cron o pueden dispararse bajo demanda con "Ejecutar Ahora".
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddRecurringOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
            >
              <Plus className="size-3.5" />
              Nueva Tarea Recurrente
            </Button>
          </div>

          {recurringItems.length === 0 ? (
            <Card className="border-dashed border-slate-200 bg-slate-50/50">
              <CardContent className="text-center py-12">
                <Repeat className="size-10 text-slate-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-semibold text-slate-800">No hay tareas periódicas configuradas</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Crea plantillas para tus Daily Standups, revisiones semanales de métricas o chequeos de infraestructura.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsAddRecurringOpen(true)}
                  className="bg-indigo-600 text-white text-xs gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Programar primera tarea periódica
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recurringItems.map((item) => (
                <Card key={item.id} className="border-slate-200 bg-white flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border",
                              item.frequency === "DAILY"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : item.frequency === "WEEKLY"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            )}
                          >
                            {item.frequency === "DAILY"
                              ? "Diaria (L-V)"
                              : item.frequency === "WEEKLY"
                              ? "Semanal (Lun)"
                              : item.frequency === "MONTHLY"
                              ? "Mensual"
                              : "Custom Cron"}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {item.cron_expression}
                          </span>
                        </div>
                        <CardTitle className="text-sm font-semibold text-slate-900">
                          {item.work_item_template?.title}
                        </CardTitle>
                      </div>

                      <span
                        className={cn(
                          "size-2 rounded-full",
                          item.is_active ? "bg-emerald-500" : "bg-slate-300"
                        )}
                        title={item.is_active ? "Activa" : "Pausada"}
                      />
                    </div>
                    {item.work_item_template?.description && (
                      <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {item.work_item_template.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="py-2 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 text-slate-400" />
                      <span>
                        Última ejecución:{" "}
                        <strong className="text-slate-600">
                          {item.last_run_at
                            ? new Date(item.last_run_at).toLocaleString()
                            : "Aún no ejecutada"}
                        </strong>
                      </span>
                    </div>
                    {item.next_run_at && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-slate-400" />
                        <span>
                          Próxima:{" "}
                          <strong className="text-slate-600">
                            {new Date(item.next_run_at).toLocaleString()}
                          </strong>
                        </span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={runningRecurringId === item.id}
                      onClick={() => handleRunRecurringNow(item.id)}
                      className="text-xs gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                    >
                      {runningRecurringId === item.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Play className="size-3 fill-indigo-600 text-indigo-600" />
                      )}
                      Ejecutar Ahora
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRecurring(item.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 size-8"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Automation Rules */}
        <TabsContent value="rules" className="space-y-6 mt-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Reglas de Automatización de Flujos</h2>
              <p className="text-xs text-slate-500">
                Disparan acciones reactivas inmediatas (asignación de responsables, escalado de prioridad, auto-cierre) ante eventos de tareas.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddRuleOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
            >
              <Plus className="size-3.5" />
              Nueva Regla
            </Button>
          </div>

          {rules.length === 0 ? (
            <Card className="border-dashed border-slate-200 bg-slate-50/50">
              <CardContent className="text-center py-12">
                <Bot className="size-10 text-slate-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-semibold text-slate-800">No hay reglas de automatización activas</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Crea reglas para auto-asignar prioridad alta ante cambios de estado o cerrar tareas obsoletas.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsAddRuleOpen(true)}
                  className="bg-indigo-600 text-white text-xs gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Crear primera regla
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{rule.name}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {rule.trigger_event}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>
                          Acción:{" "}
                          <strong className="text-slate-700 font-mono">
                            {JSON.stringify(rule.actions || {})}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-500">
                        {rule.is_active ? "Activa" : "Pausada"}
                      </Label>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleRuleActive(rule)}
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testingRuleId === rule.id}
                      onClick={() => handleTestRule(rule.id)}
                      className="text-xs gap-1 h-8"
                    >
                      {testingRuleId === rule.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Play className="size-3" />
                      )}
                      Testear
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 size-8"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Artisan Worker Info Card */}
      <Card className="border-slate-200 bg-slate-900 text-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-emerald-400" />
            <CardTitle className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Plane Automation Worker &amp; Cron Engine
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400">
            El motor procesa periódicamente las tareas pendientes y reglas programadas en segundo plano mediante Artisan:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-2.5 rounded bg-slate-950 font-mono text-xs text-emerald-300 flex items-center justify-between border border-slate-800">
            <code>php artisan plane:run-automations</code>
            <span className="text-[10px] text-slate-500">Programado vía crontab cada minuto</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Nueva Tarea Recurrente */}
      <Dialog open={isAddRecurringOpen} onOpenChange={setIsAddRecurringOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Repeat className="size-5 text-indigo-600" />
              Programar Tarea Recurrente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Genera automáticamente un nuevo work item con esta plantilla según la periodicidad elegida.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRecurring} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Título de la plantilla *</Label>
              <Input
                required
                placeholder="ej. Daily Standup Sync o Revisión Semanal de SRE"
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Descripción inicial</Label>
              <Textarea
                placeholder="Agenda, checklist o detalles que contendrá la tarea creada..."
                rows={3}
                value={recDescription}
                onChange={(e) => setRecDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Periodicidad</Label>
                <Select
                  value={recFrequency}
                  onValueChange={(val: any) => handleFrequencyChange(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Diaria (Lunes a Viernes)</SelectItem>
                    <SelectItem value="WEEKLY">Semanal (Cada Lunes)</SelectItem>
                    <SelectItem value="MONTHLY">Mensual (Día 1)</SelectItem>
                    <SelectItem value="CUSTOM">Expresión Cron Libre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Prioridad</Label>
                <Select value={recPriority} onValueChange={setRecPriority}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="NONE">Ninguna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Expresión Cron</Label>
              <Input
                value={recCron}
                onChange={(e) => setRecCron(e.target.value)}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[10px] text-slate-400">
                Formato standard de 5 campos (minuto hora día mes día_de_semana).
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddRecurringOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingRecurring}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
              >
                {isSavingRecurring ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Guardar Tarea Recurrente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Nueva Regla de Automatización */}
      <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Bot className="size-5 text-indigo-600" />
              Nueva Regla de Automatización
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define qué condición debe cumplirse y qué acción debe ejecutarse automáticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRule} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nombre de la regla *</Label>
              <Input
                required
                placeholder="ej. Escalar a Alta prioridad si pasa a QA"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Disparador (Trigger)</Label>
              <Select value={ruleTrigger} onValueChange={setRuleTrigger}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work_item.status_changed">
                    Cuando cambia el estado de una tarea
                  </SelectItem>
                  <SelectItem value="work_item.created">
                    Cuando se crea un nuevo work item
                  </SelectItem>
                  <SelectItem value="pr.merged">
                    Cuando se mezcla un Pull Request en GitHub
                  </SelectItem>
                  <SelectItem value="scheduled.stale_check">
                    Chequeo periódico de tareas inactivas (Stale)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Acción a realizar</Label>
              <Select value={ruleActionType} onValueChange={setRuleActionType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set_priority">Actualizar Prioridad</SelectItem>
                  <SelectItem value="auto_close_stale">Cerrar automáticamente tareas obsoletas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ruleActionType === "set_priority" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nueva Prioridad</Label>
                <Select value={ruleActionValue} onValueChange={setRuleActionValue}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="LOW">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddRuleOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingRule}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
              >
                {isSavingRule ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Crear Regla
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
