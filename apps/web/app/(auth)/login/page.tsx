"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Layers,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || undefined;
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [isLoading, setIsLoading] = useState(false);

  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regWorkspace, setRegWorkspace] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      toast.error("Por favor completa tu correo y contraseña.");
      return;
    }
    setIsLoading(true);
    try {
      await login({ email: loginEmail.trim(), password: loginPassword }, redirectUrl);
    } catch {
      // toast ya emitido en useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      toast.error("Por favor completa los campos requeridos.");
      return;
    }
    if (regPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setIsLoading(true);
    try {
      await register(
        {
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          workspace_name: regWorkspace.trim() || undefined,
        },
        redirectUrl
      );
    } catch {
      // toast ya emitido en useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info("Para restablecer tu contraseña, contacta a un administrador de tu organización.");
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#fafafa] relative overflow-hidden py-10 px-4 sm:px-6">
      {/* Trama sutil de fondo para dar textura natural y humana */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-70"
        aria-hidden="true"
      />

      {/* Cabecera sutil con logo */}
      <header className="relative z-10 w-full max-w-sm flex items-center justify-center gap-2 mb-4">
        <div className="size-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <Layers className="size-5" />
        </div>
        <span className="text-base font-semibold tracking-tight text-slate-900">
          Plane
        </span>
      </header>

      {/* Tarjeta central limpia */}
      <main className="relative z-10 w-full max-w-[420px]">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] p-7 sm:p-9 transition-all">
          {mode === "login" ? (
            /* Vista de Inicio de Sesión */
            <div className="space-y-6">
              <div className="space-y-1.5 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Te damos la bienvenida
                </h1>
                <p className="text-sm text-slate-500">
                  Ingresa tus datos para acceder a tus proyectos y espacios de trabajo.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-medium text-slate-700">
                    Correo electrónico
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-xs font-medium text-slate-700">
                      Contraseña
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>

                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="h-10 pr-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                      tabIndex={-1}
                      aria-label={showLoginPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <span>Iniciar sesión</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Acción contextual para ir al Registro (sin tabs) */}
              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                <span>¿No tienes una cuenta aún? </span>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-semibold text-slate-900 hover:text-indigo-600 underline underline-offset-4 transition-colors"
                >
                  Regístrate gratis
                </button>
              </div>
            </div>
          ) : (
            /* Vista de Registro */
            <div className="space-y-6">
              <div className="space-y-1.5 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Crea tu cuenta
                </h1>
                <p className="text-sm text-slate-500">
                  Comienza a gestionar proyectos, ciclos y sprints con tu equipo.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" className="text-xs font-medium text-slate-700">
                    Nombre completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Ej. Sofía Martínez"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    autoComplete="name"
                    disabled={isLoading}
                    className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="text-xs font-medium text-slate-700">
                    Correo electrónico <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="tu@empresa.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password" className="text-xs font-medium text-slate-700">
                    Contraseña <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showRegPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      disabled={isLoading}
                      className="h-10 pr-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                      tabIndex={-1}
                      aria-label={showRegPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showRegPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reg-workspace" className="text-xs font-medium text-slate-700">
                      Nombre de tu equipo u organización
                    </Label>
                    <span className="text-[11px] text-slate-400">Opcional</span>
                  </div>
                  <Input
                    id="reg-workspace"
                    type="text"
                    placeholder="Ej. Acme Inc."
                    value={regWorkspace}
                    onChange={(e) => setRegWorkspace(e.target.value)}
                    disabled={isLoading}
                    className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <span>Crear cuenta y comenzar</span>
                      <CheckCircle2 className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Acción contextual para volver a Iniciar Sesión (sin tabs) */}
              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                <span>¿Ya tienes una cuenta registrada? </span>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-semibold text-slate-900 hover:text-indigo-600 underline underline-offset-4 transition-colors"
                >
                  Inicia sesión
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Indicador sutil de seguridad */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="size-3.5 text-slate-400" />
          <span>Acceso seguro y protegido</span>
        </div>
      </main>

      {/* Pie de página sutil y humano */}
      <footer className="relative z-10 w-full max-w-sm flex items-center justify-center gap-4 text-[12px] text-slate-400 mt-6">
        <span>© {new Date().getFullYear()} Plane</span>
        <span>•</span>
        <button
          type="button"
          onClick={() => toast.info("Plataforma de gestión de proyectos y ciclos.")}
          className="hover:text-slate-600 transition-colors"
        >
          Acerca de
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => toast.info("Tus datos están protegidos y resguardados en tu infraestructura.")}
          className="hover:text-slate-600 transition-colors"
        >
          Privacidad
        </button>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] text-slate-600">
          <Loader2 className="size-6 animate-spin text-slate-700" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
