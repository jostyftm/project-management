"use client";

import React, { useState, useEffect } from "react";
import { integrationService } from "@/services/plane/integrationService";
import { Integration } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Trash2,
  Plus,
  Radio,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string | number;
}

const AVAILABLE_EVENTS = [
  { id: "work_item.created", label: "Nueva tarea creada" },
  { id: "work_item.status_changed", label: "Cambio de estado en tarea" },
  { id: "pr.merged", label: "Pull Request mezclado en GitHub" },
  { id: "release.published", label: "Nueva versión publicada" },
  { id: "cycle.completed", label: "Ciclo de Sprint finalizado" },
];

export function SlackSettingsTab({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [savingSlack, setSavingSlack] = useState(false);

  // Slack state
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackChannel, setSlackChannel] = useState("#general");
  const [slackSubscribedEvents, setSlackSubscribedEvents] = useState<string[]>([
    "work_item.created",
    "work_item.status_changed",
    "pr.merged",
  ]);
  const [slackActive, setSlackActive] = useState(true);
  const [existingSlackIntegration, setExistingSlackIntegration] = useState<Integration | null>(null);

  // Custom Webhook modal state
  const [isCustomWebhookOpen, setIsCustomWebhookOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customEvents, setCustomEvents] = useState<string[]>(["work_item.status_changed"]);
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const list = await integrationService.list();
      setIntegrations(list || []);

      const slack = list?.find(
        (i) => i.provider === "SLACK" && (!i.project_id || String(i.project_id) === String(projectId))
      );

      if (slack) {
        setExistingSlackIntegration(slack);
        setSlackWebhookUrl(slack.config?.webhook_url || "");
        setSlackChannel(slack.config?.channel || "#general");
        setSlackSubscribedEvents(slack.events_subscribed || ["work_item.created", "work_item.status_changed"]);
        setSlackActive(slack.is_active);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al cargar integraciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, [projectId]);

  const handleSaveSlack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slackWebhookUrl.trim()) {
      toast.error("Ingresa la URL del Webhook de Slack");
      return;
    }

    setSavingSlack(true);
    try {
      await integrationService.save({
        provider: "SLACK",
        name: `Slack - ${slackChannel || "Notificaciones"}`,
        project_id: Number(projectId),
        config: {
          webhook_url: slackWebhookUrl.trim(),
          channel: slackChannel.trim(),
        },
        events_subscribed: slackSubscribedEvents,
      });

      toast.success("Configuración de Slack guardada con éxito");
      loadIntegrations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al guardar Slack");
    } finally {
      setSavingSlack(false);
    }
  };

  const handleTestIntegration = async (id: number) => {
    setTestingId(id);
    try {
      const res = await integrationService.test(id);
      if (res.success) {
        toast.success(`Mensaje enviado con éxito (${res.latency_ms || 120} ms)`, {
          description: res.message,
        });
      } else {
        toast.warning(res.message || "La prueba respondió con observaciones");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Fallo en la prueba de webhook");
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteIntegration = async (id: number) => {
    if (!confirm("¿Deseas eliminar esta integración?")) return;
    try {
      await integrationService.delete(id);
      toast.success("Integración eliminada");
      if (existingSlackIntegration?.id === id) {
        setExistingSlackIntegration(null);
        setSlackWebhookUrl("");
      }
      loadIntegrations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al eliminar");
    }
  };

  const handleCreateCustomWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) {
      toast.error("Ingresa la URL del Webhook");
      return;
    }

    setIsSavingCustom(true);
    try {
      await integrationService.save({
        provider: "CUSTOM",
        name: customName.trim() || "Webhook Externo",
        project_id: Number(projectId),
        config: {
          url: customUrl.trim(),
        },
        events_subscribed: customEvents,
      });

      toast.success("Webhook registrado exitosamente");
      setIsCustomWebhookOpen(false);
      setCustomName("");
      setCustomUrl("");
      loadIntegrations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al registrar webhook");
    } finally {
      setIsSavingCustom(false);
    }
  };

  const customIntegrations = integrations.filter((i) => i.provider === "CUSTOM");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="size-7 text-indigo-600 animate-spin mb-2" />
        <p className="text-xs text-slate-500">Cargando integraciones y webhooks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Slack Integration Section */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-[#4A154B] text-white flex items-center justify-center font-bold">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Integración con Slack (Incoming Webhook)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Envía notificaciones ricas con formato Block Kit a tus canales de Slack al crearse o actualizarse tareas.
                </CardDescription>
              </div>
            </div>
            {existingSlackIntegration && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Conectado
              </span>
            )}
          </div>
        </CardHeader>

        <form onSubmit={handleSaveSlack}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Slack Webhook URL *
              </Label>
              <Input
                required
                type="url"
                placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Obtén esta URL creando una "Incoming Webhook" app en{" "}
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  api.slack.com/apps <ExternalLink className="size-2.5" />
                </a>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Canal por defecto</Label>
              <Input
                placeholder="#proyectos o #alertas"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="max-w-xs h-9 text-xs"
              />
            </div>

            {/* Subscribed events */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold text-slate-700">Eventos a Notificar</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_EVENTS.map((evt) => {
                  const isChecked = slackSubscribedEvents.includes(evt.id);
                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        if (isChecked) {
                          setSlackSubscribedEvents(slackSubscribedEvents.filter((e) => e !== evt.id));
                        } else {
                          setSlackSubscribedEvents([...slackSubscribedEvents, evt.id]);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs select-none",
                        isChecked
                          ? "bg-indigo-50/50 border-indigo-200 text-indigo-950 font-medium"
                          : "border-slate-100 hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <Checkbox checked={isChecked} />
                      <span>{evt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-slate-100 flex items-center justify-between">
            <div>
              {existingSlackIntegration && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testingId === existingSlackIntegration.id}
                  onClick={() => handleTestIntegration(existingSlackIntegration.id)}
                  className="text-xs text-slate-700 hover:text-indigo-600 gap-1.5"
                >
                  {testingId === existingSlackIntegration.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Probar Conexión (Ping a Slack)
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {existingSlackIntegration && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteIntegration(existingSlackIntegration.id)}
                  className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Eliminar Integración
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={savingSlack}
                className="bg-[#4A154B] hover:bg-[#3b113c] text-white text-xs gap-1.5"
              >
                {savingSlack ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                Guardar Configuración Slack
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Outgoing Webhooks Section */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Radio className="size-5 text-indigo-600" />
              Webhooks Salientes Personalizados (Outgoing Webhooks)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Envía payloads JSON HTTP POST en tiempo real a endpoints externos (CI/CD, Zapier, Dokploy, automatizaciones propias).
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsCustomWebhookOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" />
            Nuevo Webhook
          </Button>
        </CardHeader>
        <CardContent>
          {customIntegrations.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Radio className="size-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-700">No hay webhooks salientes configurados</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                Registra URLs HTTPS para recibir notificaciones automáticas cuando ocurran eventos en tus work items.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCustomWebhookOpen(true)}
                className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Plus className="size-3 mr-1" />
                Registrar primer webhook
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {customIntegrations.map((ci) => (
                <div
                  key={ci.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      <Activity className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{ci.name}</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="size-2.5" /> Activo
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-md">
                        {ci.config?.url}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(ci.events_subscribed || []).map((e) => (
                          <span
                            key={e}
                            className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testingId === ci.id}
                      onClick={() => handleTestIntegration(ci.id)}
                      className="text-xs gap-1 h-8"
                    >
                      {testingId === ci.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Send className="size-3" />
                      )}
                      Enviar Ping
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteIntegration(ci.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 size-8"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Custom Webhook Dialog */}
      <Dialog open={isCustomWebhookOpen} onOpenChange={setIsCustomWebhookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Radio className="size-5 text-indigo-600" />
              Nuevo Webhook Saliente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura un endpoint receptor para recibir eventos HTTP POST en formato JSON.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomWebhook} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nombre descriptivo *</Label>
              <Input
                required
                placeholder="ej. Dokploy Webhook o Zapier Pipeline"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">URL del Endpoint Receptor (HTTPS) *</Label>
              <Input
                required
                type="url"
                placeholder="https://servidor-externo.com/api/webhooks"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Eventos suscritos</Label>
              <div className="space-y-1.5">
                {AVAILABLE_EVENTS.map((evt) => {
                  const isChecked = customEvents.includes(evt.id);
                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        if (isChecked) {
                          setCustomEvents(customEvents.filter((e) => e !== evt.id));
                        } else {
                          setCustomEvents([...customEvents, evt.id]);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs select-none",
                        isChecked ? "bg-indigo-50 border-indigo-200 font-medium" : "border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <Checkbox checked={isChecked} />
                      <span>{evt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomWebhookOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingCustom}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
              >
                {isSavingCustom ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Guardar Webhook
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
