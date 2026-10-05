"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectMemberService, PublicInvitationDetails } from "@/services/plane/projectMemberService";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { storage } from "@/lib/storage";
import { ACCESS_TOKEN, CURRENT_WORKSPACE } from "@/config/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Mail,
  Building2,
  Shield,
  Sparkles,
  Lock,
  Layers,
  FolderKanban,
  Check,
  Eye,
  EyeOff,
  User,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// Background decoration wrapper
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/60 dark:bg-slate-950 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="w-full max-w-lg z-10">{children}</div>
    </div>
  );
}

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token);
  const { user, login, refreshUser, isLoading: authLoading } = useAuth();
  const { setCurrentWorkspace } = useWorkspaceStore();

  const [invitation, setInvitation] = useState<PublicInvitationDetails["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success celebration state
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [destinationProjectId, setDestinationProjectId] = useState<string>("");

  useEffect(() => {
    async function loadInvitation() {
      try {
        const data = await projectMemberService.getInvitationByToken(token);
        setInvitation(data);
        if (data.project?.id) {
          setDestinationProjectId(data.project.id);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "La invitación no es válida, ya fue utilizada o ha expirado.");
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadInvitation();
    }
  }, [token]);

  // Countdown timer for automatic redirection upon success
  useEffect(() => {
    if (!isSuccess || !destinationProjectId) return;

    if (countdown <= 0) {
      router.push(`/projects/${destinationProjectId}`);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isSuccess, countdown, destinationProjectId, router]);

  // Handle invitation acceptance for already-logged-in user
  const handleAcceptLoggedIn = async () => {
    setIsSubmitting(true);
    try {
      const res = await projectMemberService.acceptInvitation(token);
      toast.success("¡Te has unido exitosamente al proyecto!");
      setDestinationProjectId(res.project.id);
      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al aceptar la invitación");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle onboarding for unregistered users (create account + auto-accept)
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPassword) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (regPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await projectMemberService.onboardAndAccept(token, {
        name: regName.trim(),
        password: regPassword,
      });

      storage.set(ACCESS_TOKEN, res.token);
      if (res.current_workspace) {
        storage.set(CURRENT_WORKSPACE, res.current_workspace.id);
        setCurrentWorkspace(res.current_workspace);
      }

      await refreshUser();

      toast.success("¡Cuenta creada y agregado al proyecto con éxito!");
      setDestinationProjectId(res.data.project.id);
      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al crear la cuenta");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle login for existing user arriving via invitation link
  const handleExistingUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation?.email || !loginPassword) return;

    setIsSubmitting(true);
    try {
      await login({
        email: invitation.email,
        password: loginPassword,
      });

      const res = await projectMemberService.acceptInvitation(token);
      toast.success("¡Sesión iniciada y agregado al proyecto con éxito!");
      setDestinationProjectId(res.project.id);
      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Contraseña incorrecta o error al iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading state
  if (isLoading || authLoading) {
    return (
      <PageWrapper>
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 animate-pulse">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">Verificando invitación...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Estamos consultando los detalles del proyecto y tus credenciales de acceso.
            </p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  // 2. Error / Expired state
  if (error || !invitation) {
    return (
      <PageWrapper>
        <Card className="border border-red-200 dark:border-red-950/60 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="h-1.5 bg-red-500" />
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto size-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-3 border border-red-100 dark:border-red-900/40 shadow-xs">
              <AlertTriangle className="size-7" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">Enlace no disponible</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-sm mx-auto">
              {error || "Este enlace de invitación no existe, ha caducado o ya ha sido procesado por otro usuario."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-4 pb-6 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full sm:w-auto text-xs"
            >
              Ir a la Página Principal
            </Button>
            <Button
              onClick={() => router.push("/login")}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              Iniciar Sesión
            </Button>
          </CardFooter>
        </Card>
      </PageWrapper>
    );
  }

  // 3. Success / Celebration state
  if (isSuccess) {
    return (
      <PageWrapper>
        <Card className="border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto size-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-md shadow-emerald-500/10">
              <Sparkles className="size-8" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              ¡Bienvenido al Equipo!
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Te has incorporado con éxito al proyecto
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Proyecto</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                    {invitation.project.identifier}
                  </span>
                  {invitation.project.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Espacio de Trabajo</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{invitation.project.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Rol</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-[11px]">
                  {invitation.role}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-center text-xs text-indigo-700 dark:text-indigo-300">
              Redirigiendo a las tareas del proyecto en <span className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">{countdown}</span> segundos...
            </div>
          </CardContent>

          <CardFooter className="pt-1 pb-6">
            <Button
              onClick={() => router.push(`/projects/${destinationProjectId}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <span>Entrar al Proyecto Ahora</span>
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      </PageWrapper>
    );
  }

  // 4. Case 1: User already authenticated
  if (user) {
    return (
      <PageWrapper>
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="h-2 bg-indigo-600" />
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-xs">
              <Users className="size-7" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Invitación a Colaborar
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Has recibido una invitación para unirte como miembro de equipo
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Building2 className="size-3.5 text-slate-400" /> Espacio de Trabajo
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{invitation.project.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <FolderKanban className="size-3.5 text-slate-400" /> Proyecto
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                    {invitation.project.identifier}
                  </span>
                  <span>{invitation.project.name}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Shield className="size-3.5 text-slate-400" /> Rol Asignado
                </span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 text-[11px]">
                  {invitation.role}
                </span>
              </div>
              {invitation.inviter && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Invitado por</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{invitation.inviter.name}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-slate-400" />
              <span className="truncate">
                Conectado como <strong className="text-slate-900 dark:text-white font-semibold">{user.email}</strong>
              </span>
            </div>
          </CardContent>

          <CardFooter className="pb-6">
            <Button
              onClick={handleAcceptLoggedIn}
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Aceptar Invitación y Unirme
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </PageWrapper>
    );
  }

  // 5. Case 2: Existing unauthenticated user
  if (invitation.user_exists) {
    return (
      <PageWrapper>
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="h-2 bg-indigo-600" />
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-xs">
              <Users className="size-7" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Inicia Sesión para Unirte
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Tienes una cuenta asociada a <strong className="text-slate-800 dark:text-slate-200">{invitation.email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Proyecto:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                    {invitation.project.identifier}
                  </span>
                  {invitation.project.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Espacio de Trabajo:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{invitation.project.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Rol Asignado:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 text-[11px]">
                  {invitation.role}
                </span>
              </div>
            </div>

            <form onSubmit={handleExistingUserLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Correo Electrónico</Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={invitation.email}
                    disabled
                    className="bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed text-xs pl-8 font-mono"
                  />
                  <Lock className="size-3.5 absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-pass" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Contraseña
                  </Label>
                  <Link
                    href={`/forgot-password?email=${encodeURIComponent(invitation.email)}`}
                    className="text-[11px] text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="login-pass"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Introduce tu contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 text-xs mt-2 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Iniciar Sesión y Unirme al Proyecto
                    <ArrowRight className="size-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  // 6. Case 3: Guided onboarding for new user
  return (
    <PageWrapper>
      <div className="space-y-4">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Invitación para Colaborar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Únete a {invitation.project.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {invitation.inviter?.name || "Un administrador"} te ha invitado a colaborar en su equipo
          </p>
        </div>

        {/* Project Invitation Details Banner */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 shadow-md backdrop-blur">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[11px] font-medium">Espacio de Trabajo</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                {invitation.project.workspace.name}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[11px] font-medium">Proyecto</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1 truncate">
                <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1 rounded font-bold">
                  {invitation.project.identifier}
                </span>
                <span className="truncate">{invitation.project.name}</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[11px] font-medium">Rol Asignado</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {invitation.role}
              </span>
            </div>
          </div>
        </div>

        {/* Account Creation Card */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Crea tu cuenta para comenzar
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">
              Tu cuenta se vinculará de forma segura al proyecto y espacio de trabajo
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleOnboardingSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nombre Completo <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="onboard-name"
                    type="text"
                    placeholder="Ej. Carlos Mendoza"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    className="text-xs pl-8"
                  />
                  <User className="size-3.5 absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="onboard-email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Correo Electrónico
                  </Label>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <Lock className="size-3" /> Fijo por invitación
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="onboard-email"
                    type="email"
                    value={invitation.email}
                    disabled
                    className="bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed text-xs font-mono pl-8"
                  />
                  <Mail className="size-3.5 absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="onboard-pass" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Contraseña <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="onboard-pass"
                    type={showRegPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Debe contener al menos 8 caracteres.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 text-xs gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <span>Crear Cuenta y Unirme al Proyecto</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-0 pb-5 border-t border-slate-100 dark:border-slate-800 flex justify-center text-xs text-slate-500">
            <span>¿Ya tienes otra cuenta?</span>
            <Link
              href={`/login?redirect=/invitations/${token}`}
              className="ml-1.5 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-semibold"
            >
              Iniciar Sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </PageWrapper>
  );
}
