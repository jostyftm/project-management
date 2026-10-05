"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { githubService } from "@/services/plane/githubService";
import { WorkItemGitHubData } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  ExternalLink,
  Copy,
  Check,
  Rocket,
  Plus,
  RefreshCw,
  GitMerge,
  CircleDot,
  Loader2,
  Sparkles,
  Bug,
  Wrench,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkItemGitHubWidgetProps {
  workItemId: string | number;
  identifier?: string;
  title?: string;
  projectId?: string | number;
  className?: string;
  onWorkItemUpdated?: () => void;
  isBranchModalOpen?: boolean;
  onBranchModalOpenChange?: (open: boolean) => void;
}

const BRANCH_TYPES = [
  {
    id: "feature",
    name: "Feature",
    desc: "Nueva funcionalidad o mejora",
    icon: Sparkles,
    activeClass: "border-emerald-500 bg-emerald-50/80 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500/20",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "bugfix",
    name: "Bugfix",
    desc: "Corrección de error o falla",
    icon: Bug,
    activeClass: "border-rose-500 bg-rose-50/80 text-rose-950 dark:bg-rose-950/40 dark:text-rose-200 ring-2 ring-rose-500/20",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "chore",
    name: "Chore",
    desc: "Mantenimiento o refactor",
    icon: Wrench,
    activeClass: "border-amber-500 bg-amber-50/80 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200 ring-2 ring-amber-500/20",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

export function WorkItemGitHubWidget({
  workItemId,
  identifier = "PROJ-1",
  title = "Tarea",
  projectId,
  className,
  onWorkItemUpdated,
  isBranchModalOpen: controlledModalOpen,
  onBranchModalOpenChange,
}: WorkItemGitHubWidgetProps) {
  const [data, setData] = useState<WorkItemGitHubData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [internalBranchModalOpen, setInternalBranchModalOpen] = useState(false);
  const isBranchModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalBranchModalOpen;
  const setBranchModalOpen = (open: boolean) => {
    if (onBranchModalOpenChange) {
      onBranchModalOpenChange(open);
    }
    setInternalBranchModalOpen(open);
  };
  const [copied, setCopied] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Modal de ramas
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [branchType, setBranchType] = useState<string>("feature");
  const [customBranchSlug, setCustomBranchSlug] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await githubService.getWorkItemGitHub(workItemId);
      setData(res);
      if (res.available_repositories?.length > 0) {
        if (!selectedRepo || !res.available_repositories.some((r) => r.repo_full_name === selectedRepo)) {
          setSelectedRepo(res.available_repositories[0].repo_full_name);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workItemId) {
      loadData();
    }
  }, [workItemId]);

  const hasRepositories = Boolean(data?.available_repositories && data.available_repositories.length > 0);

  // Generación del nombre de rama
  const sanitizedTitle = (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 35);

  const defaultSlug = `${identifier.toLowerCase()}-${sanitizedTitle}`;
  const branchSlug = customBranchSlug.trim() || defaultSlug;
  const fullBranchName = `${branchType}/${branchSlug}`;
  const gitCommand = `git checkout -b ${fullBranchName}`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(gitCommand);
    setCopied(true);
    toast.success("Comando copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  // Creación directa de la rama en GitHub vía API
  const handleCreateBranchInGitHub = async () => {
    if (!projectId || !selectedRepo) {
      toast.error("Selecciona un repositorio de destino");
      return;
    }

    const selectedRepoObj = data?.available_repositories?.find(
      (r) => r.repo_full_name === selectedRepo
    );
    const baseBranch = selectedRepoObj?.default_branch || "main";

    setIsCreatingBranch(true);
    try {
      const res = await githubService.createBranch(projectId, {
        repo_full_name: selectedRepo,
        branch_name: fullBranchName,
        base_branch: baseBranch,
        work_item_id: workItemId,
      });

      toast.success(res.message || `Rama '${fullBranchName}' creada en GitHub`, {
        description: res.work_item_updated
          ? `Tarea movida automáticamente a '${res.new_state || "En Progreso"}'`
          : `Repositorio: ${selectedRepo}`,
      });

      setBranchModalOpen(false);
      loadData();
      if (onWorkItemUpdated) {
        onWorkItemUpdated();
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || "Error al crear la rama en GitHub";
      toast.error(errorMsg);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // Simulación de PR para pruebas locales inmediatas
  const handleSimulatePR = async () => {
    if (!projectId) return;
    try {
      await githubService.simulateWebhook(projectId, {
        event: "pull_request",
        payload: {
          action: "opened",
          pull_request: {
            number: Math.floor(Math.random() * 900) + 100,
            title: `[${identifier}] ${title}`,
            body: `Implementa la solución técnica.\nPreview activo en: https://preview-sdi-service-template-${Math.floor(Math.random() * 900) + 100}.ganebyd.com`,
            html_url: `https://github.com/${selectedRepo || "empresa/sdi-api"}/pull/${Math.floor(Math.random() * 900) + 100}`,
            state: "open",
            head: { ref: fullBranchName },
            base: { ref: "dev" },
            user: { login: "desarrollador", avatar_url: "https://github.com/github.png" },
          },
        },
      });
      toast.success("PR simulada enviada exitosamente");
      setBranchModalOpen(false);
      loadData();
      if (onWorkItemUpdated) {
        onWorkItemUpdated();
      }
    } catch {
      toast.error("Error al simular PR");
    }
  };

  const pullRequests = data?.pull_requests || [];
  const commits = data?.commits || [];

  return (
    <div className={cn("space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800", className)}>
      {/* Header del Widget */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-slate-700 dark:text-slate-300" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            GitHub & Desarrollo
          </h4>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={loadData}
            disabled={isLoading}
            className="size-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            title="Recargar información de GitHub"
          >
            <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBranchModalOpen(true)}
            disabled={isLoading}
            className="h-7 text-xs px-2.5 font-medium border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            title="Crear rama o copiar comando Git para terminal local"
          >
            <Plus className="size-3 mr-1" />
            Crear rama
          </Button>
        </div>
      </div>

      {/* Aviso cuando el proyecto no tiene repositorios vinculados */}
      {!hasRepositories && !isLoading && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
            <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Proyecto sin repositorios vinculados</span>
          </div>
          <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
            Para habilitar la creación de ramas, el rastreo de Pull Requests y las URLs de previsualización Dokploy, vincula al menos un repositorio en la configuración de GitHub de este proyecto.
          </p>
          {projectId && (
            <Link
              href={`/projects/${projectId}/settings`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:text-amber-700 dark:hover:text-amber-100 underline pt-0.5"
            >
              <span>Configurar Repositorios en Ajustes</span>
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      )}

      {/* Lista de Pull Requests con Badges Multi-Repo */}
      {pullRequests.length > 0 ? (
        <div className="space-y-2">
          {pullRequests.map((pr) => {
            const isMerged = pr.is_merged || pr.state === "merged";
            const isOpen = pr.state === "open";

            return (
              <div
                key={pr.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Badge de Repositorio (Backend vs Frontend) */}
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 shrink-0">
                      {pr.repository_label || pr.repository_name}
                    </span>

                    {/* Badge de Estado PR */}
                    {isMerged ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        <GitMerge className="size-2.5" />
                        Merged
                      </span>
                    ) : isOpen ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CircleDot className="size-2.5" />
                        Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        Closed
                      </span>
                    )}

                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      #{pr.pr_number}
                    </span>
                  </div>

                  {/* Enlace a GitHub */}
                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                    title="Ver Pull Request en GitHub"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>

                <p className="text-slate-600 dark:text-slate-400 truncate text-[11px]">
                  {pr.title}
                </p>

                {/* Botón Destacado: Preview Dokploy */}
                {pr.preview_url && (
                  <div className="pt-1 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Rocket className="size-3 text-indigo-500" />
                      Preview activo
                    </span>
                    <a
                      href={pr.preview_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>Abrir Dokploy</span>
                      <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : hasRepositories ? (
        <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 space-y-1">
          <p>Sin ramas o Pull Requests vinculadas a esta tarea.</p>
          <p className="text-[11px] text-slate-400/80">Haz clic en &quot;Crear rama&quot; para iniciar el desarrollo.</p>
        </div>
      ) : null}

      {/* Modal Asistente de Creación de Rama Ampliado y Adaptado */}
      <Dialog open={isBranchModalOpen} onOpenChange={setBranchModalOpen}>
        <DialogContent
          className="sm:max-w-xl md:max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto z-[80]"
          overlayClassName="z-[80]"
        >
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <GitBranch className="size-5 text-indigo-600 dark:text-indigo-400" />
              Crear Rama para {identifier}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configura y crea la rama en el repositorio de GitHub o copia el comando para tu consola local.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Selector de Repositorio de Destino */}
            {data?.available_repositories && data.available_repositories.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Repositorio de Destino
                  </Label>
                  <span className="text-[10px] text-slate-400">
                    {data.available_repositories.length} disponible(s)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  {data.available_repositories.map((repo) => {
                    const isSelected = selectedRepo === repo.repo_full_name;
                    return (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => setSelectedRepo(repo.repo_full_name)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 w-full overflow-hidden",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="font-semibold text-xs text-indigo-700 dark:text-indigo-400 truncate">
                            {repo.label || "Componente"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            base: {repo.default_branch || "main"}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate w-full" title={repo.repo_full_name}>
                          {repo.repo_full_name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Selector Visual de Tipos (Feature, Bug, Chore) con Colores e Iconos */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tipo de Rama
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                {BRANCH_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = branchType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setBranchType(type.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 w-full",
                        isSelected
                          ? type.activeClass
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className={cn("size-3.5", isSelected ? type.iconColor : "text-slate-400")} />
                          <span className="font-semibold text-xs">{type.name}</span>
                        </div>
                        <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded font-bold", type.badgeClass)}>
                          {type.id}/
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        {type.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Nombre e Identificador de la Rama */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Identificador de la Rama
                </Label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-sm">
                  Rama: <strong className="text-indigo-600 dark:text-indigo-400">{fullBranchName}</strong>
                </span>
              </div>
              <Input
                value={customBranchSlug}
                onChange={(e) => setCustomBranchSlug(e.target.value)}
                placeholder={defaultSlug}
                className="font-mono text-xs w-full bg-white dark:bg-slate-900"
              />
              <p className="text-[10px] text-slate-400">
                Puedes personalizar el texto después del prefijo o dejar el sugerido automáticamente.
              </p>
            </div>

            {/* 4. Comando Git para Terminal Local */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Comando Git en Terminal
              </Label>
              <div className="w-full rounded-xl bg-slate-900 text-slate-100 p-3 font-mono text-[11px] flex items-center justify-between gap-2 overflow-hidden border border-slate-800">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  <span className="text-emerald-400 select-none shrink-0">$</span>
                  <span className="truncate select-all text-slate-200">{gitCommand}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className="p-1.5 hover:bg-slate-800 rounded-md transition text-slate-400 hover:text-white shrink-0"
                  title="Copiar comando"
                >
                  {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Botón de simulación para desarrollo local */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSimulatePR}
                className="text-xs border-dashed text-slate-500 hover:text-indigo-600 dark:border-slate-800"
                title="Simular apertura de PR para pruebas"
              >
                <Sparkles className="size-3 mr-1" />
                Simular PR
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCommand}
                className="text-xs text-slate-700 dark:text-slate-300"
              >
                {copied ? <Check className="size-3.5 mr-1 text-emerald-500" /> : <Copy className="size-3.5 mr-1" />}
                {copied ? "¡Copiado!" : "Copiar Comando"}
              </Button>
            </div>

            {/* Botón Principal: Crear Rama Directamente en GitHub */}
            <Button
              type="button"
              onClick={handleCreateBranchInGitHub}
              disabled={isCreatingBranch || !selectedRepo}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 font-medium shadow-xs"
            >
              {isCreatingBranch ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Creando en GitHub...
                </>
              ) : (
                <>
                  <GitBranch className="size-3.5" />
                  Crear rama en GitHub
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
