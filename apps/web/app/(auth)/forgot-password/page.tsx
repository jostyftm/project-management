"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  Mail,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ForgotPasswordPage() {
  useDocumentTitle("Recuperar Contraseña");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Por favor ingresa tu correo electrónico");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email.trim());
      setIsSubmitted(true);
      toast.success("Enlace de restablecimiento enviado", {
        description: response?.data?.message || "Revisa tu bandeja de entrada o spam.",
      });
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.message ||
        "Ocurrió un error al procesar tu solicitud. Intenta nuevamente.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#fafafa] relative overflow-hidden py-10 px-4 sm:px-6">
      {/* Trama sutil de fondo para dar textura natural y humana */}
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

      {/* Tarjeta central limpia */}
      <main className="relative z-10 w-full max-w-[420px]">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] p-7 sm:p-9 transition-all">
          {isSubmitted ? (
            /* Estado de confirmación de envío */
            <div className="space-y-6 text-center">
              <div className="mx-auto size-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Enlace enviado
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Si existe una cuenta asociada a <strong className="text-slate-800 font-medium">{email}</strong>, hemos enviado las instrucciones para restablecer tu contraseña.
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 flex items-start gap-3 text-left">
                <Clock className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">Vigencia estricta de 10 minutos:</span> Por seguridad, este enlace es temporal y expirará tras 10 minutos.
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setIsSubmitted(false)}
                  className="w-full h-10 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-sm font-medium rounded-lg"
                >
                  <Mail className="size-4 mr-2 text-slate-400" />
                  Enviar a otro correo
                </Button>

                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            /* Formulario de solicitud de enlace */
            <div className="space-y-6">
              <div className="space-y-1.5 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Recuperar contraseña
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Introduce tu correo electrónico para recibir un enlace temporal y firmado de recuperación.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-xs font-medium text-slate-700">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="nombre@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      disabled={isLoading}
                      className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-sm rounded-lg transition-colors pl-9"
                    />
                    <Mail className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                  <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                  <span>El enlace firmado vencerá automáticamente en 10 minutos.</span>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-white" />
                      <span>Enviando enlace seguro...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar enlace de recuperación</span>
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
