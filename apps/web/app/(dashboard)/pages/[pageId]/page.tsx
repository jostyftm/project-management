"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DocPage, DocBlock } from "@/types/plane-types";
import { pageService } from "@/services/plane/pageService";
import { NotionBlockEditor } from "@/components/plane/editor/NotionBlockEditor";
import { WikiSidebarTree } from "@/components/plane/wiki/WikiSidebarTree";
import { PageAnalyticsModal } from "@/components/plane/pages/PageAnalyticsModal";
import { WorkItemActivityTimeline } from "@/components/plane/comments/WorkItemActivityTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  Lock,
  Unlock,
  Globe,
  Eye,
  BarChart3,
  Trash2,
  Check,
  Loader2,
  FileText,
  Sidebar as SidebarIcon,
  MessageSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function PageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = String(params.pageId);
  const { user } = useAuth();

  const [page, setPage] = useState<DocPage | null>(null);

  useDocumentTitle(page?.title ? `${page.title} - Wiki` : "Wiki");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showComments, setShowComments] = useState(false);

  // Debounced save timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadPage = useCallback(async () => {
    if (!pageId) return;
    try {
      setLoading(true);
      const data = await pageService.get(pageId);
      setPage(data);
      // Track page view in the background
      pageService.recordView(pageId);
    } catch (err: any) {
      toast.error("Error al cargar la página");
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const triggerDebouncedSave = (updatedFields: Partial<DocPage>) => {
    if (page?.is_locked) return;
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await pageService.update(pageId, updatedFields);
        setSaveStatus("saved");
      } catch (err: any) {
        toast.error("No se pudo auto-guardar los cambios");
        setSaveStatus("saved");
      }
    }, 800);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!page || page.is_locked) return;
    setPage((prev) => (prev ? { ...prev, title: newTitle } : null));
    triggerDebouncedSave({ title: newTitle });
  };

  const handleBlocksChange = (newBlocks: DocBlock[]) => {
    if (!page || page.is_locked) return;
    setPage((prev) => (prev ? { ...prev, content_json: newBlocks } : null));
    triggerDebouncedSave({ content_json: newBlocks });
  };

  const handleToggleLock = async () => {
    if (!page) return;
    const nextLocked = !page.is_locked;
    try {
      const updated = await pageService.update(page.id, { is_locked: nextLocked });
      setPage(updated);
      toast.success(nextLocked ? "Página bloqueada para edición" : "Página desbloqueada");
    } catch (err) {
      toast.error("Error al cambiar el bloqueo de la página");
    }
  };

  const handleTogglePublished = async () => {
    if (!page) return;
    const nextPublished = !page.is_published;
    try {
      const updated = await pageService.update(page.id, { is_published: nextPublished });
      setPage(updated);
      toast.success(nextPublished ? "Página publicada en la wiki" : "Página convertida a borrador");
    } catch (err) {
      toast.error("Error al cambiar el estado de publicación");
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta página y sus subpáginas?")) return;
    try {
      await pageService.delete(pageId);
      toast.success("Página eliminada");
      router.push("/pages");
    } catch (err) {
      toast.error("Error al eliminar la página");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Cargando documento...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No se encontró la página solicitada.</p>
        <Link href="/pages" className="text-indigo-600 font-semibold mt-2 inline-block">
          Volver a la Wiki
        </Link>
      </div>
    );
  }

  const isProjectAdmin = page.project?.current_user_role === "ADMIN";
  const isCreator = Boolean(
    (page.created_by && String(page.created_by) === String(user?.id)) ||
    ((page as any)?.creator?.id && String((page as any).creator.id) === String(user?.id))
  );
  const canDelete = Boolean(user?.is_instance_admin || isProjectAdmin || isCreator);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Collapsible Left Wiki Tree */}
      {showSidebar && (
        <aside className="w-64 border-r border-slate-200 bg-white p-3 shrink-0 hidden md:block overflow-y-auto">
          <WikiSidebarTree
            activePageId={page.id}
            projectId={page.project_id || undefined}
            onPageCreated={(newId) => router.push(`/pages/${newId}`)}
          />
        </aside>
      )}

      {/* Main Document Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
        {/* Document Action Toolbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-100 px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="size-8 text-slate-400 hover:text-slate-700 hidden md:flex"
              title="Alternar barra de árbol"
            >
              <SidebarIcon className="size-4" />
            </Button>

            <Link href="/pages">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-500 hover:text-slate-900 text-xs">
                <ChevronLeft className="size-3.5" />
                <span>Wiki</span>
              </Button>
            </Link>

            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-600 truncate max-w-xs">
              {page.title || "Sin título"}
            </span>

            {/* Save Status Indicator */}
            <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-2">
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="size-3 animate-spin text-indigo-500" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="size-3 text-emerald-500" />
                  <span>Guardado</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Analytics */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalyticsOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <BarChart3 className="size-3.5 text-indigo-600" />
              <span>Analíticas</span>
            </Button>

            {/* Comments Toggle */}
            <Button
              variant={showComments ? "default" : "outline"}
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className={cn(
                "h-8 text-xs font-semibold gap-1.5",
                showComments ? "bg-indigo-600 hover:bg-indigo-500 text-white" : ""
              )}
            >
              <MessageSquare className="size-3.5" />
              <span>Comentarios</span>
            </Button>

            {/* Publish Toggle */}
            <Button
              variant={page.is_published ? "default" : "outline"}
              size="sm"
              onClick={handleTogglePublished}
              className={cn(
                "h-8 text-xs font-semibold gap-1.5",
                page.is_published ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""
              )}
            >
              <Globe className="size-3.5" />
              <span>{page.is_published ? "Publicada" : "Publicar"}</span>
            </Button>

            {/* Lock Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleLock}
              className={cn("size-8", page.is_locked ? "text-amber-600 bg-amber-50" : "text-slate-400")}
              title={page.is_locked ? "Página bloqueada (Clic para desbloquear)" : "Bloquear contra edición"}
            >
              {page.is_locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
            </Button>

            {/* Delete */}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="size-8 text-slate-400 hover:text-red-600"
                title="Eliminar página"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Document Body */}
        <div className="flex-1 w-full p-8 space-y-6">
          {/* Page Header: Icon & Big Title */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl select-none">{page.icon || "📄"}</span>
              {page.is_locked && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Lock className="size-3" /> Solo Lectura (Bloqueada)
                </span>
              )}
            </div>

            <Input
              value={page.title}
              disabled={page.is_locked}
              placeholder="Título del documento..."
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-3xl font-extrabold tracking-tight border-0 shadow-none focus-visible:ring-0 text-slate-900 p-0 h-auto bg-transparent"
            />
          </div>

          {/* Notion Block Editor Container */}
          <NotionBlockEditor
            blocks={page.content_json}
            onChange={handleBlocksChange}
            isLocked={page.is_locked}
          />
        </div>
      </main>

      {/* Collapsible Right Comments Panel */}
      {showComments && (
        <aside className="w-80 border-l border-slate-200 bg-white p-4 shrink-0 overflow-y-auto flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <MessageSquare className="size-4 text-indigo-600" />
              <span>Comentarios</span>
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-slate-400 hover:text-slate-700"
              onClick={() => setShowComments(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <WorkItemActivityTimeline pageId={page.id} projectId={page.project_id} />
          </div>
        </aside>
      )}

      {/* Analytics Modal */}
      <PageAnalyticsModal
        pageId={page.id}
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
      />
    </div>
  );
}
