"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { useAuth } from "@/hooks/use-auth";
import { NotFoundView } from "@/components/common/NotFoundView";
import { githubService, VerifyGitHubResponse } from "@/services/plane/githubService";
import { WorkspaceGitHubIntegration, WorkspaceDiscoveredRepo } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { SlackSettingsTab } from "@/components/plane/integrations/SlackSettingsTab";
import {
  Building2,
  Github,
  Check,
  RefreshCw,
  Trash2,
  ExternalLink,
  Plus,
  Loader2,
  GitBranch,
  ShieldCheck,
  Copy,
  Zap,
  Lock,
  Globe,
  MessageSquare,
  Search,
  Key,
  Layers,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function WorkspaceSettingsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { user, isLoading: isAuthLoading } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const isWorkspaceOwner = Boolean(
    currentWorkspace && user && (Number(currentWorkspace.owner_id) === Number(user.id) || user.is_instance_admin)
  );

  useDocumentTitle("Ajustes del Workspace");

  const [loading, setLoading] = useState(true);
  const [gitHubData, setGitHubData] = useState<WorkspaceGitHubIntegration | null>(null);

  // Search filter for discovered repos
  const [repoSearch, setRepoSearch] = useState("");

  // Connect Modal State
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectTab, setConnectTab] = useState<"pat" | "dokploy_app">("pat");
  const [accessToken, setAccessToken] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string>("ALL");
  const [customOrgName, setCustomOrgName] = useState("");
  const [appId, setAppId] = useState("");
  const [installationId, setInstallationId] = useState("");

  // Token Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState<VerifyGitHubResponse | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const res = await githubService.getWorkspaceGitHub(workspaceId);
      setGitHubData(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al cargar integración de GitHub del workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && !isAuthLoading && isWorkspaceOwner) {
      loadData();
    } else if (!isAuthLoading && !isWorkspaceOwner) {
      setLoading(false);
    }
  }, [workspaceId, isAuthLoading, isWorkspaceOwner]);

  const handleVerifyToken = async () => {
    if (!accessToken.trim() || !workspaceId) {
      toast.error("Ingresa un Personal Access Token de GitHub primero");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await githubService.verifyWorkspaceGitHub(workspaceId, accessToken.trim());
      setVerificationData(res);
      toast.success(`Token válido verificado: @${res.user.login}`, {
        description: `Se detectaron ${res.organizations.length} organizaciones accesibles.`,
      });
      // Default to user's first org or ALL
      setSelectedTarget("ALL");
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.access_token?.[0] ||
        err?.response?.data?.message ||
        "Error al validar el token de GitHub";
      toast.error(msg);
      setVerificationData(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setIsConnecting(true);
    try {
      let targetOrg = "";
      let accountType: "Organization" | "User" | "All" = "Organization";

      if (connectTab === "pat") {
        if (!accessToken.trim()) {
          toast.error("El Personal Access Token es obligatorio para conectar repositorios reales");
          setIsConnecting(false);
          return;
        }

        if (selectedTarget === "ALL") {
          targetOrg = verificationData?.user?.login || customOrgName.trim() || "all";
          accountType = "All";
        } else if (selectedTarget === "USER") {
          targetOrg = verificationData?.user?.login || customOrgName.trim();
          accountType = "User";
        } else if (selectedTarget === "CUSTOM") {
          targetOrg = customOrgName.trim();
          accountType = "Organization";
        } else {
          // One of the organizations
          targetOrg = selectedTarget;
          accountType = "Organization";
        }

        const res = await githubService.connectWorkspaceGitHub(workspaceId, {
          org_name: targetOrg,
          access_token: accessToken.trim(),
          account_type: accountType,
          auth_method: "token",
        });

        toast.success(res.message);
      } else {
        // Dokploy App style
        if (!installationId.trim()) {
          toast.error("Ingresa el Installation ID de tu GitHub App");
          setIsConnecting(false);
          return;
        }

        const res = await githubService.connectWorkspaceGitHub(workspaceId, {
          org_name: customOrgName.trim() || "dokploy-app",
          access_token: accessToken.trim() || undefined,
          app_id: appId.trim() || undefined,
          installation_id: installationId.trim(),
          auth_method: "app",
        });

        toast.success(res.message);
      }

      setIsConnectOpen(false);
      setAccessToken("");
      setVerificationData(null);
      setCustomOrgName("");
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.access_token?.[0] ||
        err?.response?.data?.errors?.org_name?.[0] ||
        err?.response?.data?.message ||
        "Error al conectar con GitHub";
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncRepos = async () => {
    if (!workspaceId) return;
    setIsSyncing(true);
    try {
      const res = await githubService.syncWorkspaceGitHub(workspaceId);
      toast.success(res?.message || "Repositorios sincronizados exitosamente", {
        description: `Se descubrieron ${res?.repositories_count ?? 0} repositorios reales.`,
      });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al sincronizar repositorios");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectOrg = async () => {
    if (!workspaceId) return;
    if (
      !confirm(
        "¿Deseas desconectar esta cuenta/organización de GitHub del workspace? Los proyectos ya no podrán mapear repositorios de esta cuenta."
      )
    ) {
      return;
    }

    try {
      await githubService.disconnectWorkspaceGitHub(workspaceId);
      toast.success("GitHub desconectado del workspace");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al desconectar");
    }
  };

  const webhookEndpoint =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/integrations/github/webhook`
      : "http://localhost:8000/api/v1/integrations/github/webhook";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedWebhook(true);
    toast.success("URL del webhook unificado copiada al portapapeles");
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const filteredRepositories = (gitHubData?.repositories || []).filter((repo: WorkspaceDiscoveredRepo) => {
    if (!repoSearch.trim()) return true;
    const term = repoSearch.toLowerCase();
    return (
      repo.name.toLowerCase().includes(term) ||
      repo.full_name.toLowerCase().includes(term) ||
      (repo.description && repo.description.toLowerCase().includes(term))
    );
  });

  if (isAuthLoading || (loading && !currentWorkspace)) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando workspace...</p>
      </div>
    );
  }

  if (!isWorkspaceOwner) {
    return (
      <NotFoundView
        title="Página no encontrada"
        description="La configuración del espacio de trabajo es accesible exclusivamente para el propietario del workspace."
        actionText="Volver al Home"
        actionHref="/overview"
      />
    );
  }

  if (!currentWorkspace || !workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando workspace...</p>
      </div>
    );
  }


  return (
    <div className="w-full space-y-6">
      {/* Header & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/your-work" className="hover:text-indigo-600 transition-colors">
            {currentWorkspace?.name || "Workspace"}
          </Link>
          <ChevronRight className="size-3 text-slate-300" />
          <span className="text-slate-800 font-medium">Ajustes del Workspace &amp; Integraciones</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Ajustes del Workspace &amp; Integraciones
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Conecta tu Organización de GitHub una sola vez para que todos tus proyectos (Backend, Frontend) descubran y vinculen sus repositorios reales.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="github" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="github" className="text-xs gap-1.5">
            <Github className="size-3.5" />
            GitHub (Organización y Repos)
          </TabsTrigger>
          <TabsTrigger value="slack" className="text-xs gap-1.5">
            <MessageSquare className="size-3.5" />
            Slack y Webhooks
          </TabsTrigger>
          <TabsTrigger value="general" className="text-xs gap-1.5">
            <Building2 className="size-3.5" />
            Detalles Generales
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: GitHub Organization Integration */}
        <TabsContent value="github" className="space-y-6 mt-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="size-7 text-indigo-600 animate-spin mb-2" />
              <p className="text-xs text-slate-500">Cargando integración de GitHub...</p>
            </div>
          ) : gitHubData?.connected ? (
            <>
              {/* Connected Organization Card */}
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {gitHubData.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={gitHubData.avatar_url}
                          alt={gitHubData.org_name || "GitHub"}
                          className="size-12 rounded-xl border border-slate-200 object-cover shadow-2xs"
                        />
                      ) : (
                        <div className="size-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                          <Github className="size-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold text-slate-900">
                            {gitHubData.org_name}
                          </CardTitle>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <Check className="size-3" /> Conectado en Workspace
                          </span>
                        </div>
                        <CardDescription className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                          <span>Tipo: {gitHubData.account_type || "Organización"}</span>
                          <span>•</span>
                          <span>
                            {gitHubData.repositories_count ?? gitHubData.repositories?.length ?? 0} repositorios reales descubiertos
                          </span>
                          {gitHubData.last_sync_at && (
                            <>
                              <span>•</span>
                              <span>Sincronizado: {new Date(gitHubData.last_sync_at).toLocaleTimeString()}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSyncing}
                        onClick={handleSyncRepos}
                        className="text-xs gap-1.5 text-slate-700 hover:text-indigo-600"
                      >
                        {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                        Sincronizar Repositorios
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDisconnectOrg}
                        className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 p-2"
                        title="Desconectar organización"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Catálogo de Repositorios Reales
                        </h3>
                        <p className="text-xs text-slate-500">
                          Repositorios disponibles para vincular en cada proyecto (Backend, Frontend) sin duplicar configuraciones.
                        </p>
                      </div>

                      {/* Search input */}
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                        <Input
                          placeholder="Buscar repositorio..."
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                          className="h-8 pl-8 text-xs bg-slate-50"
                        />
                      </div>
                    </div>

                    {filteredRepositories.length > 0 ? (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-88 overflow-y-auto">
                        {filteredRepositories.map((repo: WorkspaceDiscoveredRepo) => (
                          <div
                            key={repo.id}
                            className="flex items-center justify-between p-3 hover:bg-slate-50/80 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-4">
                              <div className="size-7 rounded bg-slate-100 text-slate-600 shrink-0 flex items-center justify-center font-bold">
                                <GitBranch className="size-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 truncate">{repo.full_name}</span>
                                  {repo.is_private ? (
                                    <span className="shrink-0 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                      <Lock className="size-2.5" /> Privado
                                    </span>
                                  ) : (
                                    <span className="shrink-0 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                      <Globe className="size-2.5" /> Público
                                    </span>
                                  )}
                                </div>
                                {repo.description && (
                                  <p className="text-slate-400 text-[11px] truncate mt-0.5">{repo.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {repo.default_branch || "main"}
                              </span>
                              {repo.repo_url && (
                                <a
                                  href={repo.repo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 p-1"
                                  title="Ver en GitHub"
                                >
                                  <ExternalLink className="size-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed rounded-xl text-center space-y-2 bg-slate-50/50">
                        <AlertCircle className="size-6 text-slate-400 mx-auto" />
                        <p className="text-xs font-medium text-slate-700">
                          {repoSearch
                            ? `No se encontraron repositorios que coincidan con "${repoSearch}"`
                            : "No se encontraron repositorios en esta cuenta u organización."}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          Asegúrate de que tu Personal Access Token tenga los permisos "repo" y acceso autorizado para esta organización en GitHub.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Global Organization Webhook Guide */}
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Zap className="size-4 text-amber-500" />
                    Webhook Global de Organización (Plane GitHub Sync)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Registra esta URL única en tu Organización de GitHub (Organization Settings &gt; Webhooks) para que los eventos de Pull Requests y Commits de todos los repositorios se enruten automáticamente a sus respectivos proyectos en Plane.
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
                        onClick={copyToClipboard}
                        className="shrink-0 text-xs gap-1"
                      >
                        {copiedWebhook ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                        {copiedWebhook ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-800 block mb-0.5">Content type:</span>
                      <code className="text-indigo-600 font-mono">application/json</code>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-800 block mb-0.5">Eventos requeridos:</span>
                      <span>Pull requests, Pushes, Deployments, Workflow runs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Disconnected State: Connect Organization CTA */
            <Card className="border-dashed border-slate-300 bg-slate-50/50">
              <CardContent className="text-center py-16 space-y-4">
                <div className="size-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-slate-800">
                  <Github className="size-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Conectar Organización de GitHub
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Conecta tu Organización o Cuenta de GitHub a nivel de Workspace. Plane descubrirá automáticamente tus repositorios reales para que puedas seleccionarlos fácilmente en cada proyecto (Backend, Frontend) sin duplicar credenciales.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsConnectOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 shadow-sm"
                >
                  <Plus className="size-3.5" />
                  Conectar GitHub al Workspace
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Slack & Custom Webhooks */}
        <TabsContent value="slack" className="mt-0">
          <SlackSettingsTab projectId={workspaceId} />
        </TabsContent>

        {/* Tab 3: Workspace General Details */}
        <TabsContent value="general" className="mt-0">
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Detalles del Workspace</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Información de identidad del espacio de trabajo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Nombre del Workspace</Label>
                  <Input value={currentWorkspace.name} disabled className="bg-slate-50 h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Slug / Identificador</Label>
                  <Input value={`/${currentWorkspace.slug}`} disabled className="bg-slate-50 font-mono h-9 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Organization Modal */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Github className="size-5" />
              Conectar Cuenta u Organización de GitHub
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mapea tus repositorios reales directamente desde GitHub hacia este Workspace.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={connectTab} onValueChange={(val: any) => setConnectTab(val)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full h-9">
              <TabsTrigger value="pat" className="text-xs gap-1.5">
                <Key className="size-3.5" />
                Personal Access Token (PAT)
              </TabsTrigger>
              <TabsTrigger value="dokploy_app" className="text-xs gap-1.5">
                <Layers className="size-3.5" />
                GitHub App (Dokploy Style)
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleConnect} className="space-y-4 pt-3">
              {connectTab === "pat" ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        GitHub Personal Access Token (PAT) *
                      </Label>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,read:org,admin:repo_hook&description=Plane-Workspace-Integration"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        Generar token en GitHub <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        required
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx o github_pat_..."
                        value={accessToken}
                        onChange={(e) => {
                          setAccessToken(e.target.value);
                          setVerificationData(null);
                        }}
                        className="h-9 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isVerifying || !accessToken.trim()}
                        onClick={handleVerifyToken}
                        className="shrink-0 text-xs gap-1 h-9"
                      >
                        {isVerifying ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3.5 text-indigo-600" />}
                        Validar
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Requiere los scopes <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">repo</code> y <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">read:org</code> para listar repositorios privados y de organización.
                    </p>
                  </div>

                  {/* Verification Badge & Target selector */}
                  {verificationData ? (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2.5">
                        {verificationData.user.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={verificationData.user.avatar_url}
                            alt={verificationData.user.login}
                            className="size-8 rounded-full border border-emerald-300"
                          />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-emerald-950 flex items-center gap-1">
                            <Check className="size-3 text-emerald-600" />
                            Autenticado como @{verificationData.user.login} ({verificationData.user.name})
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            {verificationData.organizations.length} organizaciones disponibles
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-medium text-emerald-950">
                          ¿Qué repositorios deseas descubrir e importar al Workspace?
                        </Label>
                        <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                          <SelectTrigger className="h-8 text-xs bg-white border-emerald-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">
                              🌟 Todas mis cuentas y organizaciones (Recomendado)
                            </SelectItem>
                            <SelectItem value="USER">
                              👤 Solo mi cuenta personal (@{verificationData.user.login})
                            </SelectItem>
                            {verificationData.organizations.map((org) => (
                              <SelectItem key={org.login} value={org.login}>
                                🏢 Organización: {org.login}
                              </SelectItem>
                            ))}
                            <SelectItem value="CUSTOM">
                              ✍️ Especificar otra organización manualmente...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTarget === "CUSTOM" && (
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-emerald-950">Nombre de la Organización</Label>
                          <Input
                            placeholder="ej. mi-empresa"
                            value={customOrgName}
                            onChange={(e) => setCustomOrgName(e.target.value)}
                            className="h-8 text-xs bg-white border-emerald-300"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Organización o Usuario de GitHub (Opcional si validas el token)
                      </Label>
                      <Input
                        placeholder="ej. ganebyd o mi-organizacion (deja vacío para autodetectar)"
                        value={customOrgName}
                        onChange={(e) => setCustomOrgName(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </>
              ) : (
                /* Dokploy GitHub App Mode */
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-blue-600" />
                      Modelo de Instalación Dokploy
                    </p>
                    <p className="text-[11px] text-blue-700">
                      En Dokploy, creas una GitHub App y seleccionas qué repositorios autorizar durante la instalación. Al ingresar tu Installation ID, Plane consultará directamente los repositorios concedidos.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Installation ID de GitHub *
                    </Label>
                    <Input
                      required
                      placeholder="ej. 12345678"
                      value={installationId}
                      onChange={(e) => setInstallationId(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-slate-400">
                      Lo encuentras en la URL de instalación de GitHub: <code className="font-mono">github.com/settings/installations/<strong>12345678</strong></code>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      App ID (Opcional)
                    </Label>
                    <Input
                      placeholder="ej. 987654"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Installation Access Token o Token de GitHub
                    </Label>
                    <Input
                      type="password"
                      placeholder="ghs_xxxxxxxxxxxx o ghp_xxxxxxxxxxxx"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConnectOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isConnecting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                >
                  {isConnecting ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                  Conectar y Descubrir Repositorios
                </Button>
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
