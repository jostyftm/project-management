"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  projectMemberService,
  ProjectMemberUser,
  ProjectInvitationItem,
} from "@/services/plane/projectMemberService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Trash2,
  Shield,
  Loader2,
  Check,
  Search,
  Clock,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";

interface Props {
  projectId: string | number;
}

export function ProjectMembersTab({ projectId }: Props) {
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await projectMemberService.list(projectId);
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch {
      toast.error("Error al cargar miembros del proyecto");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId, loadData]);

  const handleAddOrInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await projectMemberService.addOrInvite(projectId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      toast.success(res.message || "Usuario procesado exitosamente");
      setInviteEmail("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al invitar o agregar usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: "ADMIN" | "MEMBER" | "VIEWER") => {
    try {
      await projectMemberService.updateRole(projectId, userId, role);
      toast.success("Rol de miembro actualizado");
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role } : m))
      );
    } catch {
      toast.error("Error al actualizar rol");
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`¿Estás seguro de remover a ${name} del proyecto?`)) return;
    try {
      await projectMemberService.removeMember(projectId, userId);
      toast.success("Miembro removido del proyecto");
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch {
      toast.error("Error al remover miembro");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await projectMemberService.cancelInvitation(projectId, invitationId);
      toast.success("Invitación cancelada");
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch {
      toast.error("Error al cancelar invitación");
    }
  };

  const copyInviteLink = async (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/invitations/${token}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedToken(token);
      toast.success("Enlace de invitación copiado");
      setTimeout(() => setCopiedToken(null), 2500);
    } else {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Invite or Add Form */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-indigo-600" />
            <CardTitle className="text-base font-semibold">Agregar o Invitar Colaborador</CardTitle>
          </div>
          <CardDescription>
            Si el usuario ya está registrado en la plataforma, será añadido de inmediato. Si no, recibirá un correo con su enlace de invitación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddOrInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9 h-10 text-sm bg-white"
                required
              />
            </div>

            <Select value={inviteRole} onValueChange={(val: any) => setInviteRole(val)}>
              <SelectTrigger className="w-full sm:w-36 h-10 text-xs bg-white font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin (Gestión Total)</SelectItem>
                <SelectItem value="MEMBER">Miembro (Visualizador)</SelectItem>
                <SelectItem value="VIEWER">Visualizador</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="submit"
              disabled={isSubmitting || !inviteEmail.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-5 text-xs font-semibold shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <UserPlus className="size-4 mr-1.5" />
              )}
              Añadir al Proyecto
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Members Table */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-indigo-600" />
                <CardTitle className="text-base font-semibold">
                  Miembros Activos ({members.length})
                </CardTitle>
              </div>
              <CardDescription>
                Lista de todos los usuarios asignados a este proyecto con su rol correspondiente.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="size-6 text-indigo-600 animate-spin mb-2" />
              <p className="text-xs text-slate-500">Cargando miembros...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {search ? "No se encontraron miembros con ese término." : "No hay miembros registrados en este proyecto."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/70 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            member.role === "ADMIN"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          )}
                        >
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{member.email}</p>
                      {member.joined_at && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Unido el {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Select
                      value={member.role}
                      onValueChange={(val: any) => handleUpdateRole(member.id, val)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs bg-slate-50 border-slate-200 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Miembro</SelectItem>
                        <SelectItem value="VIEWER">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="size-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Remover miembro del proyecto"
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

      {/* Pending Invitations Table */}
      {invitations.length > 0 && (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              <CardTitle className="text-base font-semibold">
                Invitaciones Pendientes ({invitations.length})
              </CardTitle>
            </div>
            <CardDescription>
              Usuarios que han sido invitados por correo electrónico pero aún no han aceptado o completado su registro.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/70 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{inv.email}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Expira el: {new Date(inv.expires_at).toLocaleDateString()}
                        {inv.invited_by && ` • Invitado por: ${inv.invited_by.name}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink(inv.token)}
                      className="h-8 text-xs gap-1.5 text-slate-600 hover:text-indigo-600"
                    >
                      {copiedToken === inv.token ? (
                        <>
                          <Check className="size-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copiar enlace</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelInvitation(inv.id)}
                      className="size-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Cancelar invitación"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
