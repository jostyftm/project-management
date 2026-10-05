"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocPage } from "@/types/plane-types";
import { pageService } from "@/services/plane/pageService";
import { WikiSidebarTree } from "@/components/plane/wiki/WikiSidebarTree";
import { ReportPageModal } from "@/components/plane/pages/ReportPageModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Lock,
  Globe,
  Clock,
  Eye,
  Layers,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export default function PagesDashboardPage() {
  const router = useRouter();
  const [pages, setPages] = useState<DocPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "published" | "drafts">("all");
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data = await pageService.list();
      setPages(data);
    } catch (err) {
      console.error("Error fetching pages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleCreatePage = async () => {
    try {
      const page = await pageService.create({
        title: "Página sin título",
        is_published: false,
      });
      toast.success("Nueva página creada");
      router.push(`/pages/${page.id}`);
    } catch (err) {
      toast.error("Error al crear la página");
    }
  };

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.project?.name && p.project.name.toLowerCase().includes(search.toLowerCase()));

      if (tab === "published") return matchesSearch && p.is_published;
      if (tab === "drafts") return matchesSearch && !p.is_published;
      return matchesSearch;
    });
  }, [pages, search, tab]);

  return (
    <div className="flex-1 space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="size-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Knowledge Management & Wiki
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Crea, organiza y colabora en documentación jerárquica con editor de bloques estilo Notion.
          </p>
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

      {/* Main Grid: Sidebar Wiki Tree + Content List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Column: Wiki Tree Navigation */}
        <div className="md:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <WikiSidebarTree onPageCreated={(newPageId) => router.push(`/pages/${newPageId}`)} />
        </div>

        {/* Right Area: List and Filters */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Buscar páginas o documentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
              />
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-auto">
              <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
                <TabsTrigger value="all" className="text-xs px-3 py-1 font-semibold">
                  Todas ({pages.length})
                </TabsTrigger>
                <TabsTrigger value="published" className="text-xs px-3 py-1 font-semibold">
                  Publicadas ({pages.filter((p) => p.is_published).length})
                </TabsTrigger>
                <TabsTrigger value="drafts" className="text-xs px-3 py-1 font-semibold">
                  Borradores ({pages.filter((p) => !p.is_published).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-sm">Cargando páginas...</p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
              <FileText className="size-10 text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-700 text-base">No hay páginas disponibles</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Comienza creando tu primera página con el editor de bloques o genera un reporte de proyecto.
              </p>
              <Button onClick={handleCreatePage} className="mt-4 bg-indigo-600 text-white text-xs">
                <Plus className="size-4 mr-1.5" /> Crear Página
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredPages.map((page) => (
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

                    {page.project && (
                      <span className="inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {page.project.identifier} • {page.project.name}
                      </span>
                    )}
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
      <ReportPageModal open={reportModalOpen} onOpenChange={setReportModalOpen} />
    </div>
  );
}
