"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { githubService, ProjectGitHubResponse } from "@/services/plane/githubService";
import {
  ProjectGithubRepository,
  ProjectGithubSettings,
  WorkspaceGitHubIntegration,
  WorkspaceDiscoveredRepo,
} from "@/types/plane-types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitBranch,
  Github,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Zap,
  ShieldCheck,
  Send,
  Building2,
  ArrowRight,
  Globe,
  Lock,
  Search,
  Filter,
  Layers,
  Sparkles,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";

interface Props {
  projectId: string | number;
}

interface SelectedRepoConfig {
  repo_full_name: string;
  label: string;
  default_branch: string;
  repo_url?: string;
}

const inferRepoLabel = (fullName: string): string => {
  const lower = fullName.toLowerCase();
  if (lower.includes("api") || lower.includes("back") || lower.includes("server") || lower.includes("service")) {
    return "Backend";
  }
  if (lower.includes("web") || lower.includes("front") || lower.includes("client") || lower.includes("ui") || lower.includes("portal")) {
    return "Frontend";
  }
  if (lower.includes("mobile") || lower.includes("ios") || lower.includes("android") || lower.includes("app")) {
    return "Mobile";
  }
  if (lower.includes("infra") || lower.includes("devops") || lower.includes("docker") || lower.includes("doc")) {
    return "Docs";
  }
  return "Fullstack";
};

export function ProjectGitHubSettingsTab({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProjectGitHubResponse | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Settings form state (General project automation)
  const [autoMovePrOpened, setAutoMovePrOpened] = useState(true);
  const [autoClosePrMerged, setAutoClosePrMerged] = useState(true);
  const [previewDeploymentEnabled, setPreviewDeploymentEnabled] = useState(true);

  // Multi-Repo Link Modal State
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<Record<string, SelectedRepoConfig>>({});
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customRepoName, setCustomRepoName] = useState("");
  const [customRepoUrl, setCustomRepoUrl] = useState("");
  const [customRepoLabel, setCustomRepoLabel] = useState("Backend");
  const [customRepoBranch, setCustomRepoBranch] = useState("main");
  const [isAddingRepo, setIsAddingRepo] = useState(false);

  // Updating repo branch inline state
  const [updatingRepoId, setUpdatingRepoId] = useState<number | null>(null);

  // Branch caching & mapping per repository
  const [repoBranches, setRepoBranches] = useState<Record<string, string[]>>({});
  const [loadingBranches, setLoadingBranches] = useState<Record<string, boolean>>({});
  const [manualBranchMode, setManualBranchMode] = useState<Record<string, boolean>>({});

  const fetchBranchesForRepo = async (repoFullName: string, force = false) => {
    if (!repoFullName) return;
    if (!force && (repoBranches[repoFullName] || loadingBranches[repoFullName])) {
      return;
    }

    setLoadingBranches((prev) => ({ ...prev, [repoFullName]: true }));
    try {
      const branches = await githubService.getBranches(projectId, repoFullName);
      if (branches && branches.length > 0) {
        setRepoBranches((prev) => ({ ...prev, [repoFullName]: branches }));

        // Adjust selectedRepo's default_branch if needed
        setSelectedRepos((prev) => {
          const current = prev[repoFullName];
          if (!current) return prev;
          let branchToKeep = current.default_branch;
          if (!branches.includes(branchToKeep)) {
            branchToKeep = branches.includes("main")
              ? "main"
              : branches.includes("master")
              ? "master"
              : branches[0];
          }
          return {
            ...prev,
            [repoFullName]: {
              ...current,
              default_branch: branchToKeep,
            },
          };
        });
      }
    } catch (err: any) {
      console.warn(`No se pudieron cargar ramas para ${repoFullName}:`, err);
    } finally {
      setLoadingBranches((prev) => ({ ...prev, [repoFullName]: false }));
    }
  };

  // Webhook copy state
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Webhook Simulator state
  const [simEvent, setSimEvent] = useState<"pull_request.opened" | "pull_request.closed" | "push">("pull_request.opened");
  const [simRepo, setSimRepo] = useState("");
  const [simWorkItemId, setSimWorkItemId] = useState("");
  const [simPreviewUrl, setSimPreviewUrl] = useState("https://preview-pr-12.ganebyd.com");
  const [isSimulating, setIsSimulating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await githubService.getProjectGitHub(projectId);
      setData(res);
      if (res.settings) {
        setAutoMovePrOpened(Boolean(res.settings.auto_move_on_pr_opened ?? res.settings.auto_start_on_pr ?? true));
        setAutoClosePrMerged(Boolean(res.settings.auto_close_on_pr_merged ?? res.settings.auto_complete_on_pr_merge ?? true));
        setPreviewDeploymentEnabled(Boolean(res.settings.preview_deployment_enabled ?? true));
      }
      if (res.repositories?.length > 0) {
        if (!simRepo) {
          setSimRepo(res.repositories[0].repo_full_name);
        }
        res.repositories.forEach((repo) => {
          fetchBranchesForRepo(repo.repo_full_name);
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al cargar configuración de GitHub");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await githubService.updateSettings(projectId, {
        auto_move_on_pr_opened: autoMovePrOpened,
        auto_close_on_pr_merged: autoClosePrMerged,
        preview_deployment_enabled: previewDeploymentEnabled,
      });
      toast.success("Configuración de GitHub guardada");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al actualizar configuración");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateRepoBranch = async (repoId: number, newBranch: string) => {
    if (!newBranch.trim()) return;
    setUpdatingRepoId(repoId);
    try {
      const res = await githubService.updateRepository(projectId, repoId, {
        default_branch: newBranch.trim(),
      });
      toast.success(`Rama actualizada a '${newBranch.trim()}'`, {
        description: `Repositorio: ${res.repository.repo_full_name}`,
      });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al actualizar la rama");
    } finally {
      setUpdatingRepoId(null);
    }
  };

  const toggleRepoSelection = (repo: WorkspaceDiscoveredRepo) => {
    const isCurrentlySelected = Boolean(selectedRepos[repo.full_name]);
    setSelectedRepos((prev) => {
      const copy = { ...prev };
      if (copy[repo.full_name]) {
        delete copy[repo.full_name];
      } else {
        copy[repo.full_name] = {
          repo_full_name: repo.full_name,
          label: inferRepoLabel(repo.full_name),
          default_branch: repo.default_branch || "main",
          repo_url: repo.repo_url,
        };
      }
      return copy;
    });

    if (!isCurrentlySelected) {
      fetchBranchesForRepo(repo.full_name);
    }
  };

  const updateSelectedRepoField = (fullName: string, field: "label" | "default_branch", value: string) => {
    setSelectedRepos((prev) => {
      if (!prev[fullName]) return prev;
      return {
        ...prev,
        [fullName]: {
          ...prev[fullName],
          [field]: value,
        },
      };
    });
  };

  const handleSelectAllVisible = (visibleRepos: WorkspaceDiscoveredRepo[]) => {
    setSelectedRepos((prev) => {
      const next = { ...prev };
      visibleRepos.forEach((repo) => {
        if (!next[repo.full_name]) {
          next[repo.full_name] = {
            repo_full_name: repo.full_name,
            label: inferRepoLabel(repo.full_name),
            default_branch: repo.default_branch || "main",
            repo_url: repo.repo_url,
          };
        }
      });
      return next;
    });

    visibleRepos.forEach((repo) => {
      fetchBranchesForRepo(repo.full_name);
    });
  };

  const handleClearSelection = () => {
    setSelectedRepos({});
  };

  const handleAddRepositories = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCustomMode) {
      if (!customRepoName.trim()) {
        toast.error("Ingresa el nombre del repositorio");
        return;
      }

      setIsAddingRepo(true);
      try {
        await githubService.addRepository(projectId, {
          repo_full_name: customRepoName.trim(),
          label: customRepoLabel,
          default_branch: customRepoBranch.trim() || "main",
          repo_url: customRepoUrl.trim() || undefined,
        });

        toast.success(`Repositorio '${customRepoName.trim()}' vinculado al proyecto`);
        setIsAddRepoOpen(false);
        setCustomRepoName("");
        setCustomRepoUrl("");
        setIsCustomMode(false);
        loadData();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Error al vincular repositorio");
      } finally {
        setIsAddingRepo(false);
      }
      return;
    }

    const items = Object.values(selectedRepos);
    if (items.length === 0) {
      toast.error("Selecciona al menos un repositorio para vincular");
      return;
    }

    setIsAddingRepo(true);
    try {
      const res = await githubService.addRepository(projectId, {
        repositories: items,
      });

      toast.success(res?.message || `${items.length} repositorio(s) vinculados exitosamente`);
      setIsAddRepoOpen(false);
      setSelectedRepos({});
      setRepoSearchQuery("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al vincular repositorios");
    } finally {
      setIsAddingRepo(false);
    }
  };

  const handleRemoveRepository = async (repoId: number) => {
    if (!confirm("¿Deseas desvincular este repositorio del proyecto?")) return;
    try {
      await githubService.removeRepository(projectId, repoId);
      toast.success("Repositorio desvinculado");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al desvincular repositorio");
    }
  };

  const handleSimulateWebhook = async () => {
    if (!simRepo) {
      toast.error("Selecciona o ingresa un repositorio para simular");
      return;
    }
    setIsSimulating(true);
    try {
      const currentRepoObj = repositories.find((r) => r.repo_full_name === simRepo);
      const repoBranch = currentRepoObj?.default_branch || "main";

      let payload: Record<string, any> = {
        repository: { full_name: simRepo, html_url: `https://github.com/${simRepo}` },
      };

      const prNumber = Math.floor(Math.random() * 80) + 10;
      const refTag = simWorkItemId.trim() ? `[${simWorkItemId.trim()}]` : "[PROJ-1]";

      if (simEvent === "pull_request.opened") {
        payload = {
          action: "opened",
          repository: payload.repository,
          pull_request: {
            number: prNumber,
            title: `feat: implementación de funcionalidad ${refTag}`,
            body: `Closes ${refTag}\nPreview: ${simPreviewUrl}`,
            html_url: `https://github.com/${simRepo}/pull/${prNumber}`,
            head: { ref: `feature/${simWorkItemId || "proj-1"}-modulo` },
            base: { ref: repoBranch },
            state: "open",
            draft: false,
            merged: false,
          },
        };
      } else if (simEvent === "pull_request.closed") {
        payload = {
          action: "closed",
          repository: payload.repository,
          pull_request: {
            number: prNumber,
            title: `feat: implementación de funcionalidad ${refTag}`,
            body: `Closes ${refTag}\nPreview: ${simPreviewUrl}`,
            html_url: `https://github.com/${simRepo}/pull/${prNumber}`,
            head: { ref: `feature/${simWorkItemId || "proj-1"}-modulo` },
            base: { ref: repoBranch },
            state: "closed",
            draft: false,
            merged: true,
          },
        };
      } else {
        payload = {
          repository: payload.repository,
          ref: `refs/heads/${repoBranch}`,
          commits: [
            {
              id: "a1b2c3d4e5f67890" + Math.floor(Math.random() * 1000),
              message: `Fixes ${refTag}: resolución de requerimiento`,
              author: { name: "Lead Developer", username: "lead-dev" },
              url: `https://github.com/${simRepo}/commit/a1b2c3d`,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }

      await githubService.simulateWebhook(projectId, {
        event: simEvent.startsWith("pull_request") ? "pull_request" : "push",
        payload,
      });

      toast.success("Webhook procesado exitosamente por Plane", {
        description: `Evento: ${simEvent} para ${simRepo} (${repoBranch})`,
      });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al simular webhook");
    } finally {
      setIsSimulating(false);
    }
  };

  const webhookEndpoint =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/integrations/github/webhook`
      : "http://localhost:8000/api/v1/integrations/github/webhook";

  const handleCopyWebhook = async () => {
    const ok = await copyToClipboard(webhookEndpoint);
    if (ok) {
      setCopiedWebhook(true);
      toast.success("URL del webhook unificado copiada");
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      toast.error("No se pudo copiar la URL");
    }
  };

  const repositories = data?.repositories || [];
  const workspaceGitHub = data?.workspace_github;
  const isWorkspaceConnected = Boolean(workspaceGitHub?.connected);
  const unlinkedWorkspaceRepos = workspaceGitHub?.unlinked_repositories || [];

  // Filter unlinked repos based on search query
  const filteredUnlinkedRepos = useMemo(() => {
    if (!repoSearchQuery.trim()) return unlinkedWorkspaceRepos;
    const term = repoSearchQuery.toLowerCase().trim();
    return unlinkedWorkspaceRepos.filter((r) => {
      return (
        r.name.toLowerCase().includes(term) ||
        r.full_name.toLowerCase().includes(term) ||
        (r.description && r.description.toLowerCase().includes(term))
      );
    });
  }, [unlinkedWorkspaceRepos, repoSearchQuery]);

  const selectedCount = Object.keys(selectedRepos).length;

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando integración de GitHub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace GitHub Integration Status Banner */}
      {isWorkspaceConnected ? (
        <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {workspaceGitHub?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={workspaceGitHub.avatar_url}
                  alt={workspaceGitHub.org_name || "GitHub Org"}
                  className="size-10 rounded-xl border border-indigo-200 object-cover shadow-2xs"
                />
              ) : (
                <div className="size-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Github className="size-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{workspaceGitHub?.org_name}</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Check className="size-2.5" /> Workspace Conectado
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {workspaceGitHub?.repositories_count ?? 0} repositorios reales descubiertos disponibles para vincular a este proyecto.
                </p>
              </div>
            </div>

            <Link href="/workspace/settings">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 shrink-0">
                <Building2 className="size-3.5" />
                Administrar Workspace
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                <Github className="size-5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs text-amber-900">
                  Organización de GitHub no conectada en el Workspace
                </h4>
                <p className="text-[11px] text-amber-700/90 mt-0.5 max-w-xl">
                  Para seleccionar repositorios de tu organización con 1 clic (Backend, Frontend) sin ingresar URLs manuales, conecta tu cuenta de GitHub a nivel de Workspace.
                </p>
              </div>
            </div>

            <Link href="/workspace/settings">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5 shrink-0">
                <Plus className="size-3" />
                Conectar Organización en Workspace
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Connected Repositories Section */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Github className="size-5 text-slate-800" />
              Repositorios Vinculados a este Proyecto (Multi-Repo)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Vincula los repositorios de tu organización que componen este proyecto. Cada componente (Backend, Frontend, etc.) tiene su propia rama de trabajo independiente.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setIsAddRepoOpen(true);
              setSelectedRepos({});
              setRepoSearchQuery("");
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" />
            {isWorkspaceConnected ? "Vincular Repositorios del Workspace" : "Vincular Repositorio"}
          </Button>
        </CardHeader>
        <CardContent>
          {repositories.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Github className="size-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-700">No hay repositorios vinculados aún</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                {isWorkspaceConnected
                  ? "Selecciona los repositorios descubiertos de tu organización para sincronizar Pull Requests, Commits y Dokploy Previews automáticamente."
                  : "Vincula los repositorios de tu proyecto para sincronizar Pull Requests y Commits."}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddRepoOpen(true);
                  setSelectedRepos({});
                }}
                className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Plus className="size-3 mr-1" />
                Vincular repositorios
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      <GitBranch className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">{repo.repo_full_name}</span>
                        {repo.label && (
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border",
                              repo.label.toLowerCase() === "frontend"
                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                : repo.label.toLowerCase() === "backend"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : repo.label.toLowerCase() === "mobile"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            {repo.label}
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200 flex items-center gap-1">
                          <Check className="size-2.5" /> Vinculado
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        {/* Inline branch switcher per repository */}
                        <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 font-mono text-[11px] transition-colors">
                          <GitBranch className="size-3 text-indigo-600" />
                          <span className="text-slate-500">Rama base:</span>
                          <select
                            value={repo.default_branch || "main"}
                            onChange={(e) => handleUpdateRepoBranch(repo.id, e.target.value)}
                            className="bg-transparent font-semibold text-indigo-700 outline-none cursor-pointer text-xs"
                            disabled={updatingRepoId === repo.id}
                            title="Cambiar rama base de este repositorio"
                          >
                            {Array.from(
                              new Set([
                                repo.default_branch || "main",
                                ...(repoBranches[repo.repo_full_name] || []),
                                "main",
                                "master",
                                "dev",
                              ])
                            )
                              .filter(Boolean)
                              .map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                          </select>
                          {(updatingRepoId === repo.id || loadingBranches[repo.repo_full_name]) && (
                            <Loader2 className="size-2.5 animate-spin text-indigo-600" />
                          )}
                        </div>

                        <span>•</span>
                        <span>PRs vinculados: {repo.pull_requests_count ?? 0}</span>
                        <span>•</span>
                        <span>Commits: {repo.commits_count ?? 0}</span>
                        {repo.repo_url && (
                          <>
                            <span>•</span>
                            <a
                              href={repo.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                            >
                              Ver en GitHub <ExternalLink className="size-2.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRepository(repo.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 size-8"
                      title="Desvincular del proyecto"
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

      {/* GitHub Sync Automation Rules */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Comportamiento y Automatización de Estados</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Define cómo reaccionan las tareas ante eventos de Pull Requests en los repositorios vinculados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="space-y-0.5 pr-4">
              <Label className="text-sm font-medium text-slate-800">
                Mover a "En Progreso" al abrir Pull Request
              </Label>
              <p className="text-xs text-slate-500">
                Cuando se abra o desmarque un PR en borrador que mencione el ID de la tarea, transicionar automáticamente a estado En Progreso.
              </p>
            </div>
            <Switch
              checked={autoMovePrOpened}
              onCheckedChange={setAutoMovePrOpened}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="space-y-0.5 pr-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-slate-800">
                  Cerrar tarea solo cuando TODOS los PRs vinculados se mezclen (Gatekeeper)
                </Label>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                  Multi-PR Gatekeeper
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Si una historia involucra Frontend y Backend, no se cerrará hasta que ambos PRs hayan sido mergeados a sus respectivas ramas base.
              </p>
            </div>
            <Switch
              checked={autoClosePrMerged}
              onCheckedChange={setAutoClosePrMerged}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="space-y-0.5 pr-4">
              <Label className="text-sm font-medium text-slate-800">
                Detectar Despliegues Preview de Dokploy automáticamente
              </Label>
              <p className="text-xs text-slate-500">
                Extrae las URLs de preview generadas por GitHub Actions o Dokploy (ej. preview-pr-*.ganebyd.com) para abrirlas con 1 clic desde el detalle de la tarea.
              </p>
            </div>
            <Switch
              checked={previewDeploymentEnabled}
              onCheckedChange={setPreviewDeploymentEnabled}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <GitBranch className="size-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Configuración de Ramas:</strong> Cada repositorio vinculado administra su propia rama base de forma independiente en la tabla superior.
            </span>
          </div>
        </CardContent>
        <CardFooter className="border-t border-slate-100 flex justify-end">
          <Button
            size="sm"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
          >
            {savingSettings ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            Guardar Reglas de Automatización
          </Button>
        </CardFooter>
      </Card>

      {/* Webhook Configuration Guide */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            Webhook Unificado para este Proyecto
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Si conectaste la organización a nivel de Workspace, ya no necesitas registrar webhooks individuales. Si prefieres configurar webhook por repo, usa esta URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1 block">Payload URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookEndpoint}
                className="font-mono text-xs bg-slate-50 text-slate-800 border-slate-200"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyWebhook}
                className="shrink-0 text-xs gap-1"
              >
                {copiedWebhook ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copiedWebhook ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Simulator (Demo & Testing) */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              <Zap className="size-3.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-indigo-950">Simulador de Eventos GitHub</CardTitle>
              <CardDescription className="text-xs text-indigo-700/80">
                Prueba la integración y el Multi-PR Gatekeeper localmente sin necesidad de túneles ngrok.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Evento a simular</Label>
              <Select
                value={simEvent}
                onValueChange={(val: any) => setSimEvent(val)}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pull_request.opened">Pull Request Abierto</SelectItem>
                  <SelectItem value="pull_request.closed">Pull Request Mezclado (Merged)</SelectItem>
                  <SelectItem value="push">Push / Commit con Fixes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Repositorio</Label>
              {repositories.length > 0 ? (
                <Select value={simRepo} onValueChange={setSimRepo}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Selecciona repo" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((r) => (
                      <SelectItem key={r.id} value={r.repo_full_name}>
                        {r.repo_full_name} ({r.label || "Repo"}) - {r.default_branch || "main"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={simRepo}
                  onChange={(e) => setSimRepo(e.target.value)}
                  placeholder="ej. org/backend"
                  className="h-8 text-xs bg-white"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Tag de Tarea (Identifier)</Label>
              <Input
                placeholder="ej. PROJ-1"
                value={simWorkItemId}
                onChange={(e) => setSimWorkItemId(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Dokploy Preview Deployment URL</Label>
            <Input
              placeholder="https://preview-pr-12.ganebyd.com"
              value={simPreviewUrl}
              onChange={(e) => setSimPreviewUrl(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSimulateWebhook}
            disabled={isSimulating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
          >
            {isSimulating ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Disparar Webhook Simulado
          </Button>
        </CardFooter>
      </Card>

      {/* Modal: Vincular Repositorios con Buscador y Selección Múltiple */}
      <Dialog open={isAddRepoOpen} onOpenChange={setIsAddRepoOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Github className="size-5" />
              Vincular Repositorios al Proyecto
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isWorkspaceConnected
                ? `Busca y selecciona uno o varios repositorios de ${workspaceGitHub?.org_name || "tu organización"} para vincularlos a este proyecto.`
                : "Indica la ruta completa del repositorio para conectarlo a este proyecto."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRepositories} className="space-y-4 py-2">
            {isWorkspaceConnected && !isCustomMode ? (
              <div className="space-y-3">
                {/* Search Bar & Actions Header */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                    <Input
                      placeholder="Filtrar por nombre o descripción de repositorio..."
                      value={repoSearchQuery}
                      onChange={(e) => setRepoSearchQuery(e.target.value)}
                      className="h-8.5 pl-8 text-xs bg-slate-50"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">
                        {filteredUnlinkedRepos.length} disponibles
                      </span>
                      {selectedCount > 0 && (
                        <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 text-[11px]">
                          {selectedCount} seleccionado(s)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      {filteredUnlinkedRepos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSelectAllVisible(filteredUnlinkedRepos)}
                          className="text-indigo-600 hover:underline"
                        >
                          Seleccionar todos ({filteredUnlinkedRepos.length})
                        </button>
                      )}
                      {selectedCount > 0 && (
                        <>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={handleClearSelection}
                            className="text-slate-500 hover:text-red-600 hover:underline"
                          >
                            Limpiar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filterable Repositories List */}
                {filteredUnlinkedRepos.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white">
                    {filteredUnlinkedRepos.map((repo) => {
                      const isSelected = Boolean(selectedRepos[repo.full_name]);
                      const currentConfig = selectedRepos[repo.full_name];

                      return (
                        <div
                          key={repo.id}
                          className={cn(
                            "p-3 text-xs transition-colors",
                            isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRepoSelection(repo)}
                              className="mt-0.5"
                              id={`repo-chk-${repo.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`repo-chk-${repo.id}`}
                                className="cursor-pointer block"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-800">{repo.full_name}</span>
                                  {repo.is_private ? (
                                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded flex items-center gap-0.5">
                                      <Lock className="size-2.5" /> Privado
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded flex items-center gap-0.5">
                                      <Globe className="size-2.5" /> Público
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Rama: {repo.default_branch || "main"}
                                  </span>
                                </div>
                                {repo.description && (
                                  <p className="text-slate-400 text-[11px] truncate mt-0.5">{repo.description}</p>
                                )}
                              </label>

                              {/* Per-repository configuration when selected */}
                              {isSelected && currentConfig && (
                                <div className="mt-2.5 pt-2 border-t border-indigo-100/80 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/70 p-2 rounded-lg border">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-slate-600 block">
                                      Rol del Componente
                                    </Label>
                                    <Select
                                      value={currentConfig.label}
                                      onValueChange={(val) => updateSelectedRepoField(repo.full_name, "label", val)}
                                    >
                                      <SelectTrigger className="h-7 text-xs bg-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Backend">Backend (API / Servicio)</SelectItem>
                                        <SelectItem value="Frontend">Frontend (Web / UI)</SelectItem>
                                        <SelectItem value="Mobile">Mobile (iOS / Android)</SelectItem>
                                        <SelectItem value="Fullstack">Fullstack / Monorepo</SelectItem>
                                        <SelectItem value="Docs">Docs / Infraestructura</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                                        <GitBranch className="size-2.5 text-indigo-600" />
                                        Rama Base del Repositorio
                                      </Label>
                                      <div className="flex items-center gap-1.5">
                                        {loadingBranches[repo.full_name] ? (
                                          <span className="text-[9px] text-indigo-600 flex items-center gap-0.5">
                                            <Loader2 className="size-2 animate-spin" /> Mapeando...
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setManualBranchMode((prev) => ({
                                                ...prev,
                                                [repo.full_name]: !prev[repo.full_name],
                                              }))
                                            }
                                            className="text-[9px] text-indigo-600 hover:underline"
                                          >
                                            {manualBranchMode[repo.full_name] ? "Seleccionar de lista" : "Escribir manual"}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {loadingBranches[repo.full_name] ? (
                                      <div className="h-7 px-2 border rounded bg-slate-50 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                                        <Loader2 className="size-2.5 animate-spin text-indigo-600" />
                                        <span>Cargando ramas de GitHub...</span>
                                      </div>
                                    ) : manualBranchMode[repo.full_name] ? (
                                      <Input
                                        value={currentConfig.default_branch}
                                        onChange={(e) => updateSelectedRepoField(repo.full_name, "default_branch", e.target.value)}
                                        placeholder="ej. feature/login o main"
                                        className="h-7 text-xs font-mono bg-white"
                                      />
                                    ) : (
                                      <Select
                                        value={currentConfig.default_branch}
                                        onValueChange={(val) => updateSelectedRepoField(repo.full_name, "default_branch", val)}
                                      >
                                        <SelectTrigger className="h-7 text-xs font-mono bg-white">
                                          <SelectValue placeholder="Seleccionar rama..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-56">
                                          {Array.from(
                                            new Set([
                                              currentConfig.default_branch,
                                              ...(repoBranches[repo.full_name] || []),
                                              repo.default_branch,
                                              "main",
                                              "master",
                                            ])
                                          )
                                            .filter(Boolean)
                                            .map((branchName) => (
                                              <SelectItem key={branchName} value={branchName} className="font-mono text-xs">
                                                <div className="flex items-center gap-1.5">
                                                  <GitBranch className="size-3 text-indigo-500 shrink-0" />
                                                  <span>{branchName}</span>
                                                  {branchName === repo.default_branch && (
                                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-sans ml-1">
                                                      principal
                                                    </span>
                                                  )}
                                                </div>
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed rounded-xl text-center space-y-1.5 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-700">
                      {repoSearchQuery
                        ? `No se encontraron repositorios que coincidan con "${repoSearchQuery}"`
                        : "Todos los repositorios descubiertos ya están vinculados a este proyecto."}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Si necesitas un repositorio nuevo o de otra cuenta, sincroniza tu Workspace o ingrésalo manualmente.
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-slate-400">
                    Org: <strong>{workspaceGitHub?.org_name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className="text-indigo-600 hover:underline"
                  >
                    Ingresar otro repositorio manualmente
                  </button>
                </div>
              </div>
            ) : (
              /* Custom / Manual repository entry mode */
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Nombre del Repositorio (owner/repo) *
                  </Label>
                  <Input
                    required
                    placeholder="ej. ganebyd/api-service o acme/portal-web"
                    value={customRepoName}
                    onChange={(e) => setCustomRepoName(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Etiqueta de Componente</Label>
                    <Select value={customRepoLabel} onValueChange={setCustomRepoLabel}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Backend">Backend (API / Servicio)</SelectItem>
                        <SelectItem value="Frontend">Frontend (Web / UI)</SelectItem>
                        <SelectItem value="Mobile">Mobile (iOS / Android)</SelectItem>
                        <SelectItem value="Fullstack">Fullstack / Monorepo</SelectItem>
                        <SelectItem value="Docs">Docs / Infra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <GitBranch className="size-3 text-indigo-600" />
                        Rama Base
                      </Label>
                      {customRepoName.trim().includes("/") && (
                        <button
                          type="button"
                          onClick={() => fetchBranchesForRepo(customRepoName.trim(), true)}
                          disabled={loadingBranches[customRepoName.trim()]}
                          className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {loadingBranches[customRepoName.trim()] ? (
                            <>
                              <Loader2 className="size-2.5 animate-spin" /> Mapeando...
                            </>
                          ) : (
                            "Mapear ramas"
                          )}
                        </button>
                      )}
                    </div>

                    {loadingBranches[customRepoName.trim()] ? (
                      <div className="h-9 px-3 border rounded bg-slate-50 flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Loader2 className="size-3 animate-spin text-indigo-600" />
                        <span>Cargando ramas de GitHub...</span>
                      </div>
                    ) : repoBranches[customRepoName.trim()]?.length ? (
                      <Select value={customRepoBranch} onValueChange={setCustomRepoBranch}>
                        <SelectTrigger className="h-9 text-xs font-mono bg-white">
                          <SelectValue placeholder="Seleccionar rama..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {Array.from(new Set([customRepoBranch, ...repoBranches[customRepoName.trim()]])).map((b) => (
                            <SelectItem key={b} value={b} className="font-mono text-xs">
                              <div className="flex items-center gap-1.5">
                                <GitBranch className="size-3 text-indigo-500 shrink-0" />
                                <span>{b}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="main o dev"
                        value={customRepoBranch}
                        onChange={(e) => setCustomRepoBranch(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    URL de GitHub (Opcional)
                  </Label>
                  <Input
                    placeholder="https://github.com/..."
                    value={customRepoUrl}
                    onChange={(e) => setCustomRepoUrl(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {isWorkspaceConnected && (
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className="text-[11px] text-indigo-600 hover:underline block pt-1"
                  >
                    Volver a repositorios del workspace
                  </button>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddRepoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isAddingRepo || (!isCustomMode && selectedCount === 0)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
              >
                {isAddingRepo ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {isCustomMode
                  ? "Vincular Repositorio"
                  : selectedCount === 0
                  ? "Selecciona repositorio(s)"
                  : selectedCount === 1
                  ? "Vincular 1 repositorio"
                  : `Vincular ${selectedCount} repositorios`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
