"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectMemberService, PublicInvitationDetails } from "@/services/plane/projectMemberService";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token);
  const { user, isLoading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<PublicInvitationDetails["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const data = await projectMemberService.getInvitationByToken(token);
        setInvitation(data);
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

  const handleAccept = async () => {
    if (!user) {
      // Si no está autenticado, llevar al login con redirect
      router.push(`/login?redirect=/invitations/${token}`);
      return;
    }

    setIsAccepting(true);
    try {
      const res = await projectMemberService.acceptInvitation(token);
      toast.success("¡Te has unido exitosamente al proyecto!");
      router.push(`/projects/${res.project.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al aceptar la invitación");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-lg bg-white">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto size-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="size-6" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">Invitación No Válida</CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              {error || "Este enlace de invitación no existe, ha expirado o ya fue procesado."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-4 flex justify-center">
            <Button
              onClick={() => router.push("/login")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              Ir a Iniciar Sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4">
      <Card className="max-w-md w-full border-slate-200 shadow-xl bg-white overflow-hidden">
        <div className="bg-indigo-600 h-2" />
        <CardHeader className="text-center pb-4">
          <div className="mx-auto size-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
            <Users className="size-7" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            ¡Invitación a Colaborar!
          </CardTitle>
          <CardDescription className="text-slate-500">
            Has sido invitado a unirte a un equipo en Plane
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Building2 className="size-3.5 text-slate-400" /> Espacio de Trabajo
              </span>
              <span className="font-semibold text-slate-800">{invitation.project.workspace.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Users className="size-3.5 text-slate-400" /> Proyecto
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="font-mono text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-700">
                  {invitation.project.identifier}
                </span>
                <span>{invitation.project.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Shield className="size-3.5 text-slate-400" /> Rol Asignado
              </span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {invitation.role}
              </span>
            </div>

            {invitation.inviter && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 font-medium">Invitado por</span>
                <span className="text-slate-700 font-medium">{invitation.inviter.name}</span>
              </div>
            )}
          </div>

          {!user && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <Mail className="size-4 shrink-0 mt-0.5 text-amber-600" />
              <p>
                Inicia sesión con tu cuenta de Plane o crea una nueva para aceptar esta invitación.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-10 gap-1.5"
          >
            {isAccepting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : user ? (
              <>
                <CheckCircle2 className="size-4" />
                Aceptar Invitación y Entrar
              </>
            ) : (
              <>
                Iniciar Sesión para Aceptar
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          {user && (
            <p className="text-[11px] text-center text-slate-400">
              Conectado como <strong className="text-slate-700">{user.email}</strong>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
