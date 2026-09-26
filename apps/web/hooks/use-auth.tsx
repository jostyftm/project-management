"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ACCESS_TOKEN, CURRENT_WORKSPACE, LOGIN_ROUTE, DASHBOARD_ROUTE } from "@/config/constants";
import { storage } from "@/lib/storage";
import { authService } from "@/services/plane/authService";
import { User, Workspace } from "@/types/plane-types";
import { useWorkspaceStore } from "./use-workspace-store";

export interface UserLoggedCompat {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  attributes: {
    name: string;
    username: string;
    email: string;
    avatar?: string;
  };
  workspaces?: Workspace[];
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<UserLoggedCompat | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore();

  const loadMe = useCallback(async () => {
    const token = storage.get(ACCESS_TOKEN);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const res = await authService.getMe();
      const userData = res.data.user;
      const compatUser: UserLoggedCompat = {
        id: Number(userData.id),
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
        attributes: {
          name: userData.name,
          username: userData.name,
          email: userData.email,
          avatar: userData.avatar_url ?? undefined,
        },
        workspaces: userData.workspaces,
      };

      setUser(compatUser);
      setIsLoading(false);
      return compatUser;
    } catch (err) {
      storage.remove(ACCESS_TOKEN);
      storage.remove(CURRENT_WORKSPACE);
      setUser(null);
      setIsLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (payload: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await authService.login(payload);
      const { token, user: userData, current_workspace } = res.data;

      storage.set(ACCESS_TOKEN, token);
      if (current_workspace) {
        setCurrentWorkspace(current_workspace);
      }

      const compatUser: UserLoggedCompat = {
        id: Number(userData.id),
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
        attributes: {
          name: userData.name,
          username: userData.name,
          email: userData.email,
          avatar: userData.avatar_url ?? undefined,
        },
        workspaces: userData.workspaces,
      };

      setUser(compatUser);
      setIsLoading(false);
      toast.success("¡Bienvenido!");
      router.push(DASHBOARD_ROUTE);
      return res;
    } catch (error: any) {
      setIsLoading(false);
      const msg = error?.response?.data?.message || error?.message || "Credenciales incorrectas";
      toast.error(msg);
      throw error;
    }
  };

  const register = async (payload: { name: string; email: string; password: string; workspace_name?: string }) => {
    setIsLoading(true);
    try {
      const res = await authService.register(payload);
      const { token, user: userData, current_workspace } = res.data;

      storage.set(ACCESS_TOKEN, token);
      if (current_workspace) {
        setCurrentWorkspace(current_workspace);
      }

      const compatUser: UserLoggedCompat = {
        id: Number(userData.id),
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
        attributes: {
          name: userData.name,
          username: userData.name,
          email: userData.email,
          avatar: userData.avatar_url ?? undefined,
        },
        workspaces: userData.workspaces,
      };

      setUser(compatUser);
      setIsLoading(false);
      toast.success("Cuenta creada exitosamente");
      router.push(DASHBOARD_ROUTE);
      return res;
    } catch (error: any) {
      setIsLoading(false);
      const msg = error?.response?.data?.message || error?.message || "Error al registrarse";
      toast.error(msg);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignorar error al cerrar sesión en servidor si ya venció
    } finally {
      storage.remove(ACCESS_TOKEN);
      storage.remove(CURRENT_WORKSPACE);
      setUser(null);
      router.push(LOGIN_ROUTE);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser: loadMe,
  };
}
