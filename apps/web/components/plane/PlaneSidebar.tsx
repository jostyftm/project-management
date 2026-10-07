"use client";

import React, { useEffect, useMemo } from "react";
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
  ChevronRight,
  Hash,
  Repeat,
  Boxes,
  Sliders,
  ArrowLeft,
  UserCheck,
  BookOpen,
  StickyNote,
  Target,
  Users2,
  Flag,
  Rocket,
  Inbox,
  History,
  Zap,
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PlaneSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { currentWorkspace, projects, currentProject, fetchProjects, fetchWorkspaces } = useWorkspaceStore();
  const { user, logout } = useAuth();

  const isWorkspaceOwner = Boolean(
    currentWorkspace && user && (Number(currentWorkspace.owner_id) === Number(user.id) || user.is_instance_admin)
  );

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchProjects();
    }
  }, [currentWorkspace, fetchProjects]);

  // Extract active project ID from pathname (e.g., /projects/1, /projects/1/cycles)
  const activeProjectId = useMemo(() => {
    const match = pathname.match(/^\/projects\/([^\/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    if (currentProject && String(currentProject.id) === String(activeProjectId)) {
      return currentProject;
    }
    return projects.find((p) => String(p.id) === String(activeProjectId)) || null;
  }, [projects, currentProject, activeProjectId]);

  return (
    <Sidebar variant="inset" {...props} className="border-r border-slate-200 bg-white">
      <SidebarHeader className="p-3 border-b border-slate-100">
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent className="p-3 space-y-4">
        {/* Workspace Level Navigation */}
        <SidebarGroup className="p-0">
          <SidebarMenu className="space-y-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/inbox"}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                  pathname === "/inbox" && "bg-indigo-50 text-indigo-700 font-semibold"
                )}
              >
                <Link href="/inbox">
                  <Inbox className="size-4 shrink-0 text-slate-500" />
                  <span>Inbox (Bandeja)</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/your-work"}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                  pathname === "/your-work" && "bg-indigo-50 text-indigo-700 font-semibold"
                )}
              >
                <Link href="/your-work">
                  <UserCheck className="size-4 shrink-0 text-slate-500" />
                  <span>Tu trabajo</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/pages")}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                  pathname.startsWith("/pages") && "bg-indigo-50 text-indigo-700 font-semibold"
                )}
              >
                <Link href="/pages">
                  <BookOpen className="size-4 shrink-0 text-slate-500" />
                  <span>Pages & Wiki</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/initiatives"}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                  pathname === "/initiatives" && "bg-indigo-50 text-indigo-700 font-semibold"
                )}
              >
                <Link href="/initiatives">
                  <Target className="size-4 shrink-0 text-slate-500" />
                  <span>Iniciativas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/teamspaces"}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                  pathname === "/teamspaces" && "bg-indigo-50 text-indigo-700 font-semibold"
                )}
              >
                <Link href="/teamspaces">
                  <Users2 className="size-4 shrink-0 text-slate-500" />
                  <span>Teamspaces</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/stickies"}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                  pathname === "/stickies" && "bg-indigo-50 text-indigo-700 font-semibold"
                )}
              >
                <Link href="/stickies">
                  <StickyNote className="size-4 shrink-0 text-slate-500" />
                  <span>Stickies</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isWorkspaceOwner && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/workspace-reports")}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname.startsWith("/workspace-reports") && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href="/workspace-reports">
                      <FileSpreadsheet className="size-4 shrink-0 text-slate-500" />
                      <span>Reportes Dinámicos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/workspace/settings")}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname.startsWith("/workspace/settings") && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href="/workspace/settings">
                      <Sliders className="size-4 shrink-0 text-slate-500" />
                      <span>Ajustes del Workspace</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* If inside an active project, display project workspace navigation */}
        {activeProjectId && activeProjectId !== "new" ? (
          <SidebarGroup>
            <div className="flex items-center gap-2 px-2 py-1 mb-2">
              <Link href="/projects" className="text-slate-400 hover:text-slate-700">
                <ArrowLeft className="size-3.5" />
              </Link>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                  {activeProject?.identifier || "PROJ"}
                </span>
                <span className="font-semibold text-xs text-slate-800 truncate">
                  {activeProject?.name || "Proyecto"}
                </span>
              </div>
            </div>

            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/projects/${activeProjectId}` || pathname === `/projects/${activeProjectId}/overview`}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      (pathname === `/projects/${activeProjectId}` || pathname === `/projects/${activeProjectId}/overview`) && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href={`/projects/${activeProjectId}`}>
                      <LayoutDashboard className="size-4 shrink-0 text-slate-500" />
                      <span>Overview</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`/projects/${activeProjectId}/work-items`)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname.startsWith(`/projects/${activeProjectId}/work-items`) && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href={`/projects/${activeProjectId}/work-items`}>
                      <CheckSquare className="size-4 shrink-0 text-slate-500" />
                      <span>Work Items</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/projects/${activeProjectId}/cycles`}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname === `/projects/${activeProjectId}/cycles` && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href={`/projects/${activeProjectId}/cycles`}>
                      <Repeat className="size-4 shrink-0 text-slate-500" />
                      <span>Ciclos (Sprints)</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/projects/${activeProjectId}/modules`}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname === `/projects/${activeProjectId}/modules` && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href={`/projects/${activeProjectId}/modules`}>
                      <Boxes className="size-4 shrink-0 text-slate-500" />
                      <span>Módulos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/projects/${activeProjectId}/milestones`}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname === `/projects/${activeProjectId}/milestones` && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href={`/projects/${activeProjectId}/milestones`}>
                      <Flag className="size-4 shrink-0 text-slate-500" />
                      <span>Hitos (Milestones)</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/projects/${activeProjectId}/releases`}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname === `/projects/${activeProjectId}/releases` && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href={`/projects/${activeProjectId}/releases`}>
                      <Rocket className="size-4 shrink-0 text-slate-500" />
                      <span>Releases</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/projects/${activeProjectId}/pages`}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname === `/projects/${activeProjectId}/pages` && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href={`/projects/${activeProjectId}/pages`}>
                      <BookOpen className="size-4 shrink-0 text-slate-500" />
                      <span>Páginas (Docs)</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`/projects/${activeProjectId}/analytics`)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                      pathname.startsWith(`/projects/${activeProjectId}/analytics`) && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <Link href={`/projects/${activeProjectId}/analytics`}>
                      <BarChart3 className="size-4 shrink-0 text-slate-500" />
                      <span>Métricas & KPIs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Actividades, Automatizaciones y Configuración (Exclusivo para ADMIN) */}
                {activeProject?.current_user_role === "ADMIN" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/projects/${activeProjectId}/activities`}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                          pathname === `/projects/${activeProjectId}/activities` && "bg-indigo-50 text-indigo-700 font-semibold"
                        )}
                      >
                        <Link href={`/projects/${activeProjectId}/activities`}>
                          <History className="size-4 shrink-0 text-slate-500" />
                          <span>Actividades</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/projects/${activeProjectId}/automations`}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                          pathname === `/projects/${activeProjectId}/automations` && "bg-indigo-50 text-indigo-700 font-semibold"
                        )}
                      >
                        <Link href={`/projects/${activeProjectId}/automations`}>
                          <Zap className="size-4 shrink-0 text-slate-500" />
                          <span>Automatizaciones</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/projects/${activeProjectId}/settings`}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 font-medium transition-colors",
                          pathname === `/projects/${activeProjectId}/settings` && "bg-indigo-50 text-indigo-700 font-semibold"
                        )}
                      >
                        <Link href={`/projects/${activeProjectId}/settings`}>
                          <Sliders className="size-4 shrink-0 text-slate-500" />
                          <span>Configuración</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {/* General Projects Navigation */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-1">
            <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider p-0">
              Proyectos
            </SidebarGroupLabel>
            <Link href="/projects?new=true">
              <Button variant="ghost" size="icon" className="size-5 text-slate-400 hover:text-slate-600">
                <Plus className="size-3.5" />
              </Button>
            </Link>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
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
                    <span>Todos los Proyectos</span>
                    <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {projects.length}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {projects.map((proj) => {
                const isProjActive = String(proj.id) === String(activeProjectId);
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
              })}
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
