"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/plane/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isLinkInvalid = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });

      setIsSuccess(true);
      toast.success("Contraseña actualizada con éxito", {
        description: response?.data?.message || "Ya puedes ingresar con tus nuevas credenciales.",
      });
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.errors?.token?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.message ||
        "No se pudo restablecer la contraseña. El enlace puede haber caducado.";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#fafafa] relative overflow-hidden py-10 px-4 sm:px-6">
      {/* Trama sutil de fondo */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-70"
        aria-hidden="true"
      />

      {/* Cabecera con logo */}
      <header className="relative z-10 w-full max-w-sm flex items-center justify-center gap-2 mb-4">
        <Link href="/login" className="flex items-center gap-2 group">
          <div className="size-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
            <Layers className="size-5" />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Plane
          </span>
        </Link>
      </header>

      {/* Tarjeta central */}
      <main className="relative z-10 w-full max-w-[420px]">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] p-7 sm:p-9 transition-all">
          {isSuccess ? (
            /* Estado exitoso */
            <div className="space-y-6 text-center">
              <div className="mx-auto size-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  ¡Contraseña actualizada!
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Tu contraseña ha sido restablecida exitosamente. Todas las sesiones activas han sido invalidadas por seguridad.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>Iniciar sesión con mi nueva contraseña</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : isLinkInvalid ? (
            /* Estado de enlace inválido o incompleto */
            <div className="space-y-6 text-center">
              <div className="mx-auto size-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <AlertTriangle className="size-6" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Enlace inválido o incompleto
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  El enlace al que intentas acceder no contiene los parámetros de seguridad requeridos o ha caducado.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/forgot-password"
                  className="w-full inline-flex items-center justify-center h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Solicitar nuevo enlace
                </Link>

                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center h-10 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Volver al login
                </Link>
              </div>
            </div>
          ) : (
            /* Formulario de nueva contraseña */
            <div className="space-y-6">
              <div className="space-y-1.5 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Nueva contraseña
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Crea una nueva contraseña segura para tu cuenta <strong className="text-slate-800">{email}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-600">
                <Clock className="size-4 text-slate-400 shrink-0" />
                <span>Este enlace temporal de 10 minutos se invalidará tras completar el cambio.</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nueva contraseña */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-medium text-slate-700">
                    Nueva contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoFocus
                      disabled={isLoading}
                      className="h-10 pr-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors pl-9"
                    />
                    <Lock className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                      tabIndex={-1}
                      aria-label={showPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-medium text-slate-700">
                    Confirmar nueva contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswordConfirmation ? "text" : "password"}
                      placeholder="Repite tu contraseña"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      required
                      minLength={8}
                      disabled={isLoading}
                      className="h-10 pr-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors pl-9"
                    />
                    <Lock className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirmation((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                      tabIndex={-1}
                      aria-label={showPasswordConfirmation ? "Ocultar" : "Mostrar"}
                    >
                      {showPasswordConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-white" />
                      <span>Actualizando contraseña...</span>
                    </>
                  ) : (
                    <>
                      <span>Guardar nueva contraseña</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-2 text-center border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors py-1"
                >
                  <ArrowLeft className="size-3.5 mr-1.5" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Pie de página discreto */}
      <footer className="relative z-10 w-full max-w-sm text-center mt-6">
        <p className="text-xs text-slate-400">
          Plane — Plataforma moderna de desarrollo de proyectos
        </p>
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fafafa]">
          <Loader2 className="size-8 text-slate-700 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Cargando...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
