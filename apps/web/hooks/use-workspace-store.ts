"use client";

import { create } from "zustand";
import { Project, Workspace } from "@/types/plane-types";
import { workspaceService } from "@/services/plane/workspaceService";
import { projectService } from "@/services/plane/projectService";
import { storage } from "@/lib/storage";
import { CURRENT_WORKSPACE } from "@/config/constants";

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoadingWorkspaces: boolean;
  currentProject: Project | null;
  projects: Project[];
  isLoadingProjects: boolean;

  fetchWorkspaces: () => Promise<Workspace[]>;
  setCurrentWorkspace: (workspace: Workspace) => void;
  fetchProjects: () => Promise<Project[]>;
  setCurrentProject: (project: Project | null) => void;
  initWorkspaceFromStorage: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  workspaces: [],
  isLoadingWorkspaces: false,
  currentProject: null,
  projects: [],
  isLoadingProjects: false,

  initWorkspaceFromStorage: () => {
    const saved = storage.get(CURRENT_WORKSPACE);
    if (saved && typeof saved === "object") {
      set({ currentWorkspace: saved as Workspace });
    }
  },

  setCurrentWorkspace: (workspace: Workspace) => {
    storage.set(CURRENT_WORKSPACE, workspace);
    set({ currentWorkspace: workspace, currentProject: null, projects: [] });
    get().fetchProjects();
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },

  fetchWorkspaces: async () => {
    set({ isLoadingWorkspaces: true });
    try {
      const data = await workspaceService.list();
      set({ workspaces: data, isLoadingWorkspaces: false });
      
      const current = get().currentWorkspace;
      if (!current && data.length > 0) {
        const saved = storage.get(CURRENT_WORKSPACE) as Workspace | null;
        const matching = saved ? data.find((w) => String(w.id) === String(saved.id)) : null;
        const selected = matching || data[0];
        get().setCurrentWorkspace(selected);
      }
      return data;
    } catch (err) {
      set({ isLoadingWorkspaces: false });
      return [];
    }
  },

  fetchProjects: async () => {
    set({ isLoadingProjects: true });
    try {
      const data = await projectService.list();
      set({ projects: data, isLoadingProjects: false });
      return data;
    } catch (err) {
      set({ isLoadingProjects: false });
      return [];
    }
  },
}));
