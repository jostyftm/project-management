"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { useAuth } from "@/hooks/use-auth";
import {
  FolderKanban,
  CheckSquare,
  Plus,
  LogOut,
  Layers,
  ChevronRight,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PlaneSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { currentWorkspace, projects, fetchProjects, fetchWorkspaces } = useWorkspaceStore();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchProjects();
    }
  }, [currentWorkspace, fetchProjects]);

  return (
    <Sidebar variant="inset" {...props} className="border-r border-slate-200 bg-white">
      <SidebarHeader className="p-3 border-b border-slate-100">
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent className="p-3 space-y-4">
        {/* Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/projects"}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                    pathname === "/projects" && "bg-indigo-50 text-indigo-700 font-semibold"
                  )}
                >
                  <Link href="/projects">
                    <FolderKanban className="size-4 shrink-0" />
                    <span>Proyectos</span>
                    <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {projects.length}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Projects List */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-1">
            <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider p-0">
              Tus Proyectos
            </SidebarGroupLabel>
            <Link href="/projects?new=true">
              <Button variant="ghost" size="icon" className="size-5 text-slate-400 hover:text-slate-600">
                <Plus className="size-3.5" />
              </Button>
            </Link>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400 px-2.5 py-2 italic">Sin proyectos aún</p>
              ) : (
                projects.map((proj) => {
                  const isProjActive = pathname.startsWith(`/projects/${proj.id}`);
                  return (
                    <SidebarMenuItem key={proj.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isProjActive}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors",
                          isProjActive && "bg-indigo-50/80 text-indigo-700 font-medium"
                        )}
                      >
                        <Link href={`/projects/${proj.id}`}>
                          <div className="flex size-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                            {proj.identifier || <Hash className="size-3" />}
                          </div>
                          <span className="truncate flex-1">{proj.name}</span>
                          <ChevronRight className="size-3.5 text-slate-300 ml-auto" />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-slate-100">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-8 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-xs shrink-0">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || "Usuario"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Cerrar sesión"
            className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
