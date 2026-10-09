"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DocPage, Project } from "@/types/plane-types";
import { pageService } from "@/services/plane/pageService";
import { projectService } from "@/services/plane/projectService";
import { WikiSidebarTree } from "@/components/plane/wiki/WikiSidebarTree";
import { ReportPageModal } from "@/components/plane/pages/ReportPageModal";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  Sparkles,
  Lock,
  Globe,
  Eye,
  Layers,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ProjectPagesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<DocPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useDocumentTitle(`Documentación - ${project?.name || "Proyecto"}`);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projData, pagesData] = await Promise.all([
        projectService.get(projectId),
        pageService.list(projectId),
      ]);
      setProject(projData);
      setPages(pagesData);
    } catch (err) {
      console.error("Error loading project pages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleCreatePage = async () => {
    try {
      const page = await pageService.create({
        title: "Página sin título",
        project_id: projectId,
        is_published: false,
      });
      toast.success("Nueva página de proyecto creada");
      router.push(`/pages/${page.id}`);
    } catch (err) {
      toast.error("Error al crear la página");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <ProjectBreadcrumb
            projectId={projectId}
            projectName={project?.name || "Proyecto"}
            sectionTitle="Páginas & Docs"
          />
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Documentación del Proyecto
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
              {project?.identifier}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setReportModalOpen(true)}
            className="gap-1.5 text-xs font-semibold h-9"
          >
            <Sparkles className="size-4 text-indigo-600" />
            <span>Generar Reporte</span>
          </Button>

          <Button
            onClick={handleCreatePage}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-semibold h-9 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Nueva Página</span>
          </Button>
        </div>
      </div>

      {/* Grid: Project Tree + Pages Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <div className="md:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <WikiSidebarTree
            projectId={projectId}
            onPageCreated={(newPageId) => router.push(`/pages/${newPageId}`)}
          />
        </div>

        <div className="md:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-sm">Cargando documentación...</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
              <BookOpen className="size-10 text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-700 text-base">
                No hay páginas en este proyecto
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Escribe especificaciones, guías de arquitectura o genera un reporte dinámico de los work items.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Button onClick={handleCreatePage} className="bg-indigo-600 text-white text-xs">
                  <Plus className="size-4 mr-1.5" /> Crear Página
                </Button>
                <Button variant="outline" onClick={() => setReportModalOpen(true)} className="text-xs">
                  <Sparkles className="size-4 mr-1.5 text-indigo-600" /> Generar Reporte
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/pages/${page.id}`}
                  className="group flex flex-col justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all text-left"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl">{page.icon || "📄"}</span>
                      <div className="flex items-center gap-1.5">
                        {page.is_locked && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <Lock className="size-2.5" /> Bloqueada
                          </span>
                        )}
                        {page.is_published ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Globe className="size-2.5" /> Publicada
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                            Borrador
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {page.title || "Sin título"}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 mt-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="size-3" />
                        {page.views_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="size-3" />
                        {page.content_json?.length || 0} bloques
                      </span>
                    </div>

                    <span className="text-[11px]">
                      {page.updated_at ? new Date(page.updated_at).toLocaleDateString() : "-"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportPageModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        defaultProjectId={projectId}
      />
    </div>
  );
}
