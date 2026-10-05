"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { projectService } from "@/services/plane/projectService";
import { Project } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectMembersModal } from "@/components/plane/projects/ProjectMembersModal";
import { ProjectMembersTab } from "@/components/plane/projects/ProjectMembersTab";
import { ProjectNotFoundView } from "@/components/plane/ProjectNotFoundView";
import { ProjectGitHubSettingsTab } from "@/components/plane/integrations/ProjectGitHubSettingsTab";
import { SlackSettingsTab } from "@/components/plane/integrations/SlackSettingsTab";
import {
  Sliders,
  Loader2,
  Save,
  Check,
  Users,
  Github,
  MessageSquare,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ESTIMATE_OPTIONS = [
  {
    id: "FIBONACCI",
    title: "Puntos Fibonacci",
    description: "Escala estándar de la industria ágil",
    values: ["0", "1", "2", "3", "5", "8", "13", "21"],
  },
  {
    id: "TSHIRT",
    title: "Tallas de Camiseta",
    description: "Estimación cualitativa por tallas de esfuerzo",
    values: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    id: "NUMERIC",
    title: "Numérico Libre",
    description: "Cualquier valor numérico continuo",
    values: ["1", "2", "3", "..."],
  },
  {
    id: "NONE",
    title: "Sin Estimación",
    description: "No solicitar estimación de esfuerzo en los work items",
    values: [],
  },
];

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [description, setDescription] = useState("");
  const [estimateSystem, setEstimateSystem] = useState<string>("FIBONACCI");
  const [membersModalOpen, setMembersModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await projectService.get(projectId);
        setProject(data);
        setName(data.name);
        setIdentifier(data.identifier);
        setDescription(data.description || "");
        setEstimateSystem(data.estimate_system || "FIBONACCI");
      } catch {
        toast.error("Error al cargar la configuración del proyecto");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await projectService.update(projectId, {
        name,
        description,
        estimate_system: estimateSystem as any,
      });
      toast.success("Configuración actualizada correctamente");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al guardar cambios");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando configuración...</p>
      </div>
    );
  }

  if (project && project.current_user_role !== "ADMIN") {
    return (
      <ProjectNotFoundView
        title="Acceso Restringido"
        description="Solo los administradores del proyecto pueden acceder y modificar la configuración."
        actionText="Volver al Proyecto"
        actionHref={`/projects/${projectId}`}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración del Proyecto</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ajusta las preferencias generales, miembros, repositorios GitHub multi-repo e integraciones con Slack.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="general" className="text-xs gap-1.5">
            <Settings className="size-3.5" />
            General y Estimaciones
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs gap-1.5">
            <Users className="size-3.5" />
            Miembros del Proyecto
          </TabsTrigger>
          <TabsTrigger value="github" className="text-xs gap-1.5">
            <Github className="size-3.5" />
            GitHub (Multi-Repo)
          </TabsTrigger>
          <TabsTrigger value="slack" className="text-xs gap-1.5">
            <MessageSquare className="size-3.5" />
            Slack y Webhooks
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General & Estimates */}
        <TabsContent value="general" className="space-y-6 mt-0">
          <form onSubmit={handleSave} className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Detalles Generales</CardTitle>
                <CardDescription>Información identificativa del proyecto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proj-name">Nombre del Proyecto</Label>
                    <Input
                      id="proj-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proj-id">Identificador</Label>
                    <Input
                      id="proj-id"
                      value={identifier}
                      disabled
                      className="bg-slate-100 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proj-desc">Descripción</Label>
                  <Textarea
                    id="proj-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Sistema de Estimaciones</CardTitle>
                <CardDescription>
                  Selecciona cómo tu equipo estimará el esfuerzo en los work items (Fibonacci, Tallas o Numérico)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ESTIMATE_OPTIONS.map((opt) => {
                    const isSelected = estimateSystem === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setEstimateSystem(opt.id)}
                        className={cn(
                          "relative p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="font-semibold text-sm text-slate-900">{opt.title}</h4>
                            {isSelected && (
                              <div className="size-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                <Check className="size-3" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mb-3">{opt.description}</p>
                        </div>

                        {opt.values.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                            {opt.values.map((v) => (
                              <span
                                key={v}
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded",
                                  isSelected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                  Guardar Cambios
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* Tab 2: Project Members */}
        <TabsContent value="members" className="space-y-6 mt-0">
          <ProjectMembersTab projectId={projectId} />
        </TabsContent>

        {/* Tab 3: GitHub Multi-Repo */}
        <TabsContent value="github" className="mt-0">
          <ProjectGitHubSettingsTab projectId={projectId} />
        </TabsContent>

        {/* Tab 4: Slack & Webhooks */}
        <TabsContent value="slack" className="mt-0">
          <SlackSettingsTab projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Project Members Dialog */}
      <ProjectMembersModal
        projectId={projectId}
        open={membersModalOpen}
        onOpenChange={setMembersModalOpen}
      />
    </div>
  );
}
