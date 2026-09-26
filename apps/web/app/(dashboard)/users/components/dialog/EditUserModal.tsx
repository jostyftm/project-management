"use client";
import React, { useEffect, useState } from "react";
import TemplateDialog from "@/components/common/templates/template-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { UserItem } from "../../types/user-types";
import { ModalsNameUser } from "../../constants/user-constants";
import { useUserActions } from "../../hooks/use-user-actions";

const EditUserModal = () => {
  const { closeModal, name, open, data } = useModalActionStore();
  const user = data as UserItem;
  const { updateUser, isLoading } = useUserActions();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    if (user?.attributes) {
      setFormData({
        name: user.attributes.name || "",
        email: user.attributes.email || "",
      });
    }
  }, [user]);

  const isOpen = open && name === ModalsNameUser.editUser;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      await updateUser(user.id, formData);
      closeModal();
    } catch {}
  };

  return (
    <TemplateDialog
      open={isOpen}
      setOpen={() => closeModal()}
      title="Editar usuario"
      descripction="Modifica la información básica del usuario en la plataforma de reportes."
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="auth_id">ID de Autenticación (Solo lectura)</Label>
          <Input
            id="auth_id"
            value={user?.attributes.user_auth_id ? `#${user.attributes.user_auth_id}` : "No asignado"}
            disabled
            className="bg-slate-50 font-mono text-slate-600"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre completo</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej. Juan Pérez"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="usuario@dominio.com"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => closeModal()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </TemplateDialog>
  );
};

export default EditUserModal;
