"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  projectMemberService,
  ProjectMemberUser,
  ProjectInvitationItem,
} from "@/services/plane/projectMemberService";
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Trash2,
  Shield,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

interface Props {
  projectId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectMembersModal({ projectId, open, onOpenChange }: Props) {
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = async () => {
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
  };

  useEffect(() => {
    if (open && projectId) {
      loadData();
    }
  }, [open, projectId]);

  const handleAddOrInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await projectMemberService.addOrInvite(projectId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (res.type === "MEMBER_ADDED") {
        toast.success(res.message);
      } else {
        toast.success(res.message);
      }

      setInviteEmail("");
      loadData();
    } catch {
      toast.error("Error al invitar o agregar usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: "ADMIN" | "MEMBER" | "VIEWER") => {
    try {
      await projectMemberService.updateRole(projectId, userId, role);
      toast.success("Rol actualizado");
      loadData();
    } catch {
      toast.error("Error al actualizar rol");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("¿Seguro de remover este miembro del proyecto?")) return;
    try {
      await projectMemberService.removeMember(projectId, userId);
      toast.success("Miembro removido");
      loadData();
    } catch {
      toast.error("Error al remover miembro");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await projectMemberService.cancelInvitation(projectId, invitationId);
      toast.success("Invitación cancelada");
      loadData();
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
      toast.success("Enlace de invitación copiado al portapapeles");
      setTimeout(() => setCopiedToken(null), 2000);
    } else {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5 text-indigo-600" />
            Miembros del Proyecto y Colaboradores
          </DialogTitle>
          <DialogDescription>
            Gestiona los permisos y roles de los colaboradores o invita a nuevas personas por correo electrónico.
          </DialogDescription>
        </DialogHeader>

        {/* Invite or Add Form */}
        <form onSubmit={handleAddOrInvite} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <Label className="text-xs font-semibold text-slate-700">Agregar o Invitar al Proyecto</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9 h-9 text-xs bg-white"
                required
              />
            </div>

            <Select value={inviteRole} onValueChange={(val: any) => setInviteRole(val)}>
              <SelectTrigger className="w-32 h-9 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MEMBER">Miembro</SelectItem>
                <SelectItem value="VIEWER">Visualizador</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="submit"
              disabled={isSubmitting || !inviteEmail}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 text-xs font-medium"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <UserPlus className="size-3.5 mr-1" />
              )}
              Invitar / Añadir
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            Si el usuario ya está registrado, se incorporará inmediatamente. Si no, se creará un enlace de invitación seguro.
          </p>
        </form>

        {/* Members & Invitations Tabs */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid grid-cols-2 bg-slate-100">
            <TabsTrigger value="members" className="text-xs">
              Miembros Activos ({members.length})
            </TabsTrigger>
            <TabsTrigger value="invitations" className="text-xs">
              Invitaciones Pendientes ({invitations.length})
            </TabsTrigger>
          </TabsList>

          {/* Members List */}
          <TabsContent value="members" className="space-y-2 pt-2 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 text-indigo-600 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No hay miembros en el proyecto.</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{m.name}</p>
                      <p className="text-[11px] text-slate-400">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={m.role}
                      onValueChange={(val: any) => handleUpdateRole(m.id, val)}
                    >
                      <SelectTrigger className="w-28 h-7 text-[11px] bg-slate-50 border-slate-200">
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
                      onClick={() => handleRemoveMember(m.id)}
                      className="size-7 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Pending Invitations */}
          <TabsContent value="invitations" className="space-y-2 pt-2 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 text-indigo-600 animate-spin" />
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No hay invitaciones pendientes.</p>
            ) : (
              invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center justify-center text-xs">
                      <Mail className="size-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-800">{inv.email}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Expira: {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink(inv.token)}
                      className="h-7 text-[11px] gap-1 px-2.5 text-slate-600 hover:text-indigo-600"
                    >
                      {copiedToken === inv.token ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copiar enlace</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelInvitation(inv.id)}
                      className="size-7 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
