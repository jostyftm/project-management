"use client";

import React, { useState, useEffect } from "react";
import {
  instanceAdminService,
  InstanceSettings,
  SystemHealthData,
  InstanceUser,
} from "@/services/plane/instanceAdminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShieldCheck,
  Server,
  Mail,
  Users,
  Activity,
  Database,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Save,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { NotFoundView } from "@/components/common/NotFoundView";

export default function InstanceAdminPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [settings, setSettings] = useState<InstanceSettings | null>(null);
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [users, setUsers] = useState<InstanceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  // SMTP test state
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Pagination for users
  const [userPage, setUserPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [settingsData, healthData, usersData] = await Promise.all([
        instanceAdminService.getSettings(),
        instanceAdminService.getHealth(),
        instanceAdminService.getUsers(1, 25),
      ]);

      setSettings(settingsData);
      setHealth(healthData);
      setUsers(usersData.data || []);
      setTotalPages(usersData.last_page || 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Acceso denegado o error cargando módulo de administración");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (user?.is_instance_admin) {
        loadAll();
      } else {
        setIsLoading(false);
      }
    }
  }, [isAuthLoading, user]);

  const handleRefreshHealth = async () => {
    setIsRefreshingHealth(true);
    try {
      const data = await instanceAdminService.getHealth();
      setHealth(data);
      toast.success("Diagnóstico de salud actualizado");
    } catch {
      toast.error("Error al obtener diagnóstico del sistema");
    } finally {
      setIsRefreshingHealth(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const updated = await instanceAdminService.updateSettings(settings);
      setSettings(updated);
      toast.success("Configuración de la instancia guardada con éxito");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al actualizar configuración");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress.trim()) return;

    setIsTestingEmail(true);
    try {
      const res = await instanceAdminService.testEmail(testEmailAddress.trim());
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al enviar correo de prueba");
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleToggleAdmin = async (userId: number, currentStatus: boolean) => {
    try {
      await instanceAdminService.toggleUserAdmin(userId, !currentStatus);
      toast.success("Permisos de usuario actualizados");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_instance_admin: !currentStatus } : u))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al modificar permisos");
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Validando permisos de acceso...</p>
      </div>
    );
  }

  if (!user?.is_instance_admin) {
    return (
      <NotFoundView
        title="Página no encontrada"
        description="La consola de gobernanza no existe o no cuentas con los privilegios de administrador necesarios para acceder a ella."
        actionText="Volver al Home"
        actionHref="/overview"
      />
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Cargando consola de gobernanza...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gobernanza de Instancia (Instance Admin)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Control centralizado de configuración, directivas de registro, servidores de correo, salud del sistema y gestión de usuarios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshHealth}
            disabled={isRefreshingHealth}
            className="text-xs gap-1.5 h-8"
          >
            <RefreshCw className={cn("size-3.5", isRefreshingHealth && "animate-spin")} />
            Diagnóstico
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 max-w-xl">
          <TabsTrigger value="general" className="text-xs font-semibold gap-1.5">
            <Server className="size-3.5" /> General
          </TabsTrigger>
          <TabsTrigger value="smtp" className="text-xs font-semibold gap-1.5">
            <Mail className="size-3.5" /> Correo SMTP
          </TabsTrigger>
          <TabsTrigger value="health" className="text-xs font-semibold gap-1.5">
            <Activity className="size-3.5" /> Salud y Diagnóstico
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs font-semibold gap-1.5">
            <Users className="size-3.5" /> Usuarios ({health?.statistics?.users_count ?? users.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. General Settings Tab */}
        <TabsContent value="general">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Parámetros Principales de la Instancia</CardTitle>
                <CardDescription>
                  Identidad corporativa, dominios y enlaces raíz para todos los inquilinos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inst-name">Nombre de la Instancia</Label>
                    <Input
                      id="inst-name"
                      value={settings.instance_name}
                      onChange={(e) => setSettings({ ...settings, instance_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-name">Organización / Empresa</Label>
                    <Input
                      id="comp-name"
                      value={settings.company_name || ""}
                      onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-url">URL Pública de la Aplicación</Label>
                    <Input
                      id="app-url"
                      value={settings.app_url || ""}
                      onChange={(e) => setSettings({ ...settings, app_url: e.target.value })}
                      placeholder="http://localhost:8000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-upload">Tamaño Máximo de Subida (MB)</Label>
                    <Input
                      id="max-upload"
                      type="number"
                      min={1}
                      max={500}
                      value={settings.max_upload_size_mb}
                      onChange={(e) =>
                        setSettings({ ...settings, max_upload_size_mb: Number(e.target.value) || 25 })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Políticas de Registro y Acceso</CardTitle>
                <CardDescription>
                  Define si los usuarios pueden registrarse libremente o requieren invitación explícita.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-slate-800">Permitir Nuevos Registros</Label>
                    <p className="text-xs text-slate-500">
                      Cualquier visitante puede crear una cuenta en esta instancia autohospedada.
                    </p>
                  </div>
                  <Switch
                    checked={settings.allow_signups}
                    onCheckedChange={(checked) => setSettings({ ...settings, allow_signups: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-slate-800">Modo Exclusivo por Invitación</Label>
                    <p className="text-xs text-slate-500">
                      Solo los usuarios que hayan recibido un enlace de invitación pueden registrarse.
                    </p>
                  </div>
                  <Switch
                    checked={settings.invite_only}
                    onCheckedChange={(checked) => setSettings({ ...settings, invite_only: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-slate-800">Telemetría Anónima</Label>
                    <p className="text-xs text-slate-500">
                      Compartir estadísticas de rendimiento para mejorar la plataforma de manera segura.
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_telemetry}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_telemetry: checked })}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 flex justify-end">
                <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {isSaving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />}
                  Guardar Cambios
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* 2. SMTP Settings Tab */}
        <TabsContent value="smtp">
          <div className="space-y-6">
            <form onSubmit={handleSaveSettings}>
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Configuración del Servidor SMTP</CardTitle>
                  <CardDescription>
                    Parámetros de conexión para el envío de invitaciones, restablecimiento de contraseñas y notificaciones.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="smtp-host">Host SMTP</Label>
                      <Input
                        id="smtp-host"
                        value={settings.smtp_host || ""}
                        onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                        placeholder="smtp.example.com o 127.0.0.1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Puerto</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={settings.smtp_port || 587}
                        onChange={(e) =>
                          setSettings({ ...settings, smtp_port: Number(e.target.value) || 587 })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">Usuario SMTP</Label>
                      <Input
                        id="smtp-user"
                        value={settings.smtp_username || ""}
                        onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-pass">Contraseña SMTP</Label>
                      <Input
                        id="smtp-pass"
                        type="password"
                        value={settings.smtp_password || ""}
                        onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-from-email">Correo Remitente (From Address)</Label>
                      <Input
                        id="smtp-from-email"
                        type="email"
                        value={settings.smtp_from_email || ""}
                        onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                        placeholder="noreply@plane.local"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-from-name">Nombre Remitente</Label>
                      <Input
                        id="smtp-from-name"
                        value={settings.smtp_from_name || ""}
                        onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                        placeholder="Plane Notification"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-enc">Cifrado</Label>
                      <Select
                        value={settings.smtp_encryption || "tls"}
                        onValueChange={(val: any) => setSettings({ ...settings, smtp_encryption: val })}
                      >
                        <SelectTrigger id="smtp-enc">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="none">Ninguno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-100 flex justify-end">
                  <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                    {isSaving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />}
                    Guardar Configuración SMTP
                  </Button>
                </CardFooter>
              </Card>
            </form>

            {/* Test Email Card */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Probar Envío de Correo</CardTitle>
                <CardDescription>
                  Verifica que los parámetros SMTP sean funcionales enviando un correo de prueba en tiempo real.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="destinatario@ejemplo.com"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="pl-9 h-9 text-xs"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isTestingEmail || !testEmailAddress}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
                  >
                    {isTestingEmail ? (
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Send className="size-3.5 mr-1.5" />
                    )}
                    Enviar Correo de Prueba
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. System Health Tab */}
        <TabsContent value="health">
          <div className="space-y-6">
            {health && (
              <>
                {/* Status Banner */}
                <div
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border",
                    health.status === "healthy"
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                      : "bg-amber-50/70 border-amber-200 text-amber-950"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {health.status === "healthy" ? (
                      <CheckCircle2 className="size-6 text-emerald-600" />
                    ) : (
                      <AlertCircle className="size-6 text-amber-600" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        Estado de la Instancia:{" "}
                        {health.status === "healthy" ? "Completamente Operativa" : "Advertencia de Rendimiento"}
                      </h4>
                      <p className="text-xs opacity-80">
                        Última verificación: {new Date(health.system.server_time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/70 border">
                    {health.status}
                  </span>
                </div>

                {/* Component Diagnostics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Database */}
                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Database className="size-4 text-indigo-600" /> Base de Datos
                        </CardTitle>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {health.components.database.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Driver</span>
                        <span className="font-semibold text-slate-800 uppercase">{health.components.database.driver}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Latencia de Consulta</span>
                        <span className="font-semibold text-slate-800">{health.components.database.latency_ms} ms</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cache */}
                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Cpu className="size-4 text-purple-600" /> Sistema de Caché
                        </CardTitle>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {health.components.cache.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Driver Activo</span>
                        <span className="font-semibold text-slate-800 uppercase">{health.components.cache.driver}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Memoria PHP Usada</span>
                        <span className="font-semibold text-slate-800">{health.system.memory_usage_mb} MB</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Storage */}
                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <HardDrive className="size-4 text-blue-600" /> Disco y Almacenamiento
                        </CardTitle>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {health.components.storage.disk_used_percent}% usado
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Espacio Disponible</span>
                        <span className="font-semibold text-slate-800">{health.components.storage.disk_free_gb} GB</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Capacidad Total</span>
                        <span className="font-semibold text-slate-800">{health.components.storage.disk_total_gb} GB</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Statistics Counter Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{health.statistics.users_count}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Usuarios Totales</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
                    <p className="text-2xl font-bold text-slate-800">{health.statistics.workspaces_count}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Espacios de Trabajo</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
                    <p className="text-2xl font-bold text-slate-800">{health.statistics.projects_count}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Proyectos Activos</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{health.statistics.work_items_count}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Work Items Creados</p>
                  </div>
                </div>

                {/* System Environment Details */}
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Detalles del Servidor y Entorno</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Versión PHP</span>
                      <p className="font-mono font-semibold text-slate-800 mt-0.5">{health.system.php_version}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Versión Framework</span>
                      <p className="font-mono font-semibold text-slate-800 mt-0.5">{health.system.laravel_version}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Entorno (APP_ENV)</span>
                      <p className="font-mono font-semibold text-slate-800 mt-0.5 uppercase">{health.system.environment}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Hora del Servidor</span>
                      <p className="font-mono font-semibold text-slate-800 mt-0.5">
                        {new Date(health.system.server_time).toLocaleTimeString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* 4. Users Governance Tab */}
        <TabsContent value="users">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Usuarios Registrados en la Instancia</CardTitle>
              <CardDescription>
                Administra los permisos de superadministrador de la instancia y supervisa las cuentas existentes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Usuario</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Workspaces</th>
                      <th className="p-3">SuperAdmin de Instancia</th>
                      <th className="p-3">Fecha de Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{u.email}</td>
                        <td className="p-3 text-slate-600">{u.workspaces_count} asignados</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(u.id, u.is_instance_admin)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[10px] cursor-pointer transition-colors border",
                              u.is_instance_admin
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            )}
                          >
                            <ShieldCheck className="size-3" />
                            {u.is_instance_admin ? "SuperAdmin" : "Usuario Estándar"}
                          </button>
                        </td>
                        <td className="p-3 text-slate-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
