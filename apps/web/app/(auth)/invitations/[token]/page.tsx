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
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  const [loginPassword, setLoginPassword] = useState("");
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
        setError(err?.response?.data?.message || "La invitación no es válida o ha expirado.");
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

      // Save token and workspace in storage
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

      // Once logged in, accept the invitation
      const res = await projectMemberService.acceptInvitation(token);
      toast.success("¡Sesión iniciada y agregado al proyecto con éxito!");
      setDestinationProjectId(res.project.id);
      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Contraseña incorrecta o error al ingresar");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="size-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400 font-medium">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="max-w-md w-full border-slate-800 shadow-2xl bg-slate-900/90 text-white">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto size-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-2 border border-red-500/20">
              <AlertTriangle className="size-6" />
            </div>
            <CardTitle className="text-lg font-bold">Invitación No Válida</CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              {error || "Este enlace de invitación no existe, ha expirado o ya fue procesado."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-4 flex justify-center">
            <Button
              onClick={() => router.push("/login")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              Ir a Iniciar Sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- CELEBRATION / SUCCESS SCREEN ---
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
        <Card className="max-w-md w-full border-emerald-500/30 bg-slate-900/95 shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 h-2" />
          <CardHeader className="text-center pb-3">
            <div className="mx-auto size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/10">
              <Sparkles className="size-8" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-white">
              ¡Bienvenido al Equipo!
            </CardTitle>
            <CardDescription className="text-slate-300 text-sm mt-1">
              Has sido agregado con éxito al proyecto
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Proyecto</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="font-mono text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                    {invitation.project.identifier}
                  </span>
                  {invitation.project.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Espacio de Trabajo</span>
                <span className="font-semibold text-slate-200">{invitation.project.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tu Rol</span>
                <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {invitation.role}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-center text-xs text-indigo-200">
              <p>Redirigiéndote a las tareas del proyecto en <span className="font-bold text-white text-sm">{countdown}</span> segundos...</p>
            </div>
          </CardContent>

          <CardFooter className="pt-1">
            <Button
              onClick={() => router.push(`/projects/${destinationProjectId}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 gap-2 cursor-pointer"
            >
              <span>Entrar al Proyecto Ahora</span>
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- CASO 1: USUARIO YA AUTENTICADO ---
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
        <Card className="max-w-md w-full border-slate-800 shadow-2xl bg-slate-900/90 text-white overflow-hidden">
          <div className="bg-indigo-600 h-2" />
          <CardHeader className="text-center pb-3">
            <div className="mx-auto size-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Users className="size-7" />
            </div>
            <CardTitle className="text-xl font-bold">¡Invitación a Colaborar!</CardTitle>
            <CardDescription className="text-slate-400">
              Has sido invitado a unirte a este proyecto en Plane
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-slate-500" /> Espacio de Trabajo
                </span>
                <span className="font-semibold text-slate-200">{invitation.project.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FolderKanban className="size-3.5 text-slate-500" /> Proyecto
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <span className="font-mono text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">
                    {invitation.project.identifier}
                  </span>
                  <span>{invitation.project.name}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="size-3.5 text-slate-500" /> Rol Asignado
                </span>
                <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {invitation.role}
                </span>
              </div>
              {invitation.inviter && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Invitado por</span>
                  <span className="text-slate-300 font-medium">{invitation.inviter.name}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-indigo-950/30 border border-indigo-800/30 rounded-lg text-xs text-indigo-200 flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-indigo-400" />
              <span>Conectado como <strong className="text-white">{user.email}</strong></span>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleAcceptLoggedIn}
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Aceptar Invitación y Entrar
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- CASO 2: USUARIO NO AUTENTICADO PERO YA TIENE CUENTA ---
  if (invitation.user_exists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
        <Card className="max-w-md w-full border-slate-800 shadow-2xl bg-slate-900/90 text-white overflow-hidden">
          <div className="bg-indigo-600 h-2" />
          <CardHeader className="text-center pb-3">
            <div className="mx-auto size-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Users className="size-7" />
            </div>
            <CardTitle className="text-xl font-bold">Inicia Sesión para Unirte</CardTitle>
            <CardDescription className="text-slate-400">
              Has sido invitado al proyecto <strong className="text-slate-200">{invitation.project.name}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Espacio de Trabajo:</span>
                <span className="font-semibold text-slate-200">{invitation.project.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rol:</span>
                <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {invitation.role}
                </span>
              </div>
            </div>

            <form onSubmit={handleExistingUserLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Correo Electrónico</Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={invitation.email}
                    disabled
                    className="bg-slate-800/70 border-slate-700 text-slate-300 cursor-not-allowed text-xs pl-8"
                  />
                  <Lock className="size-3.5 absolute left-2.5 top-3 text-slate-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-pass" className="text-xs text-slate-300">Contraseña de tu Cuenta</Label>
                <Input
                  id="login-pass"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 text-xs mt-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Iniciar Sesión y Entrar al Proyecto
                    <ArrowRight className="size-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- CASO 3: ONBOARDING GUIADO PARA USUARIO NO REGISTRADO ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 py-8">
      <div className="w-full max-w-xl space-y-4">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Paseo de Bienvenida • Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Únete a {invitation.project.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {invitation.inviter?.name || "Un administrador"} te ha invitado a colaborar en su equipo
          </p>
        </div>

        {/* Project Invitation Details Banner */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-750">
              <span className="text-slate-400 block text-[11px]">Espacio de Trabajo</span>
              <span className="font-semibold text-white mt-0.5 block truncate">
                {invitation.project.workspace.name}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-750">
              <span className="text-slate-400 block text-[11px]">Proyecto</span>
              <span className="font-semibold text-indigo-300 mt-0.5 flex items-center gap-1 truncate">
                <span className="font-mono text-[10px] bg-indigo-500/20 px-1 rounded text-indigo-200">
                  {invitation.project.identifier}
                </span>
                {invitation.project.name}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-750">
              <span className="text-slate-400 block text-[11px]">Rol Asignado</span>
              <span className="font-bold text-emerald-400 mt-0.5 block">
                {invitation.role}
              </span>
            </div>
          </div>

          {/* Platform Feature Highlights */}
          <div className="mt-4 pt-3.5 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
            <div className="flex flex-col items-center gap-1">
              <div className="size-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Layers className="size-3" />
              </div>
              <span>Tareas y Sprints</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="size-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Users className="size-3" />
              </div>
              <span>En Equipo</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="size-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Check className="size-3" />
              </div>
              <span>Notificaciones</span>
            </div>
          </div>
        </div>

        {/* Account Creation Onboarding Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Crea tu cuenta para comenzar</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Tu cuenta se vinculará directamente a la invitación recibida
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-name" className="text-xs text-slate-300">
                  Nombre Completo <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="onboard-name"
                  type="text"
                  placeholder="Ej. Ana Gómez"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="onboard-email" className="text-xs text-slate-300">
                    Correo Electrónico
                  </Label>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="size-3" /> Fijo por invitación
                  </span>
                </div>
                <Input
                  id="onboard-email"
                  type="email"
                  value={invitation.email}
                  disabled
                  className="bg-slate-800/60 border-slate-700/80 text-slate-400 cursor-not-allowed text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="onboard-pass" className="text-xs text-slate-300">
                  Contraseña <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="onboard-pass"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs"
                />
                <p className="text-[10px] text-slate-500">
                  Usa al menos 8 caracteres con letras y números.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 text-xs gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
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

          <CardFooter className="pt-0 border-t border-slate-800/80 flex justify-center text-xs text-slate-400">
            <span>¿Ya tienes otra cuenta?</span>
            <Link
              href={`/login?redirect=/invitations/${token}`}
              className="ml-1.5 text-indigo-400 hover:text-indigo-300 font-semibold underline"
            >
              Iniciar Sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
