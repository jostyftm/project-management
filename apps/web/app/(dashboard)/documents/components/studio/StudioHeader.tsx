"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Settings,
  Eye,
  EyeOff,
  Download,
  Save,
  Loader2,
  CalendarClock,
  FileDown,
  FileType,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
} from "lucide-react";

interface StudioHeaderProps {
  onOpenPageSettings: () => void;
  onOpenScheduleDialog: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  onExportWord: () => void;
  isExporting: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  onOpenPageSettings,
  onOpenScheduleDialog,
  onSave,
  onExportPdf,
  onExportWord,
  isExporting,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const router = useRouter();
  const name = useDocStudioStore((state) => state.name);
  const setName = useDocStudioStore((state) => state.setName);
  const isDirty = useDocStudioStore((state) => state.isDirty);
  const isSaving = useDocStudioStore((state) => state.isSaving);
  const isPreviewMode = useDocStudioStore((state) => state.isPreviewMode);
  const setIsPreviewMode = useDocStudioStore((state) => state.setIsPreviewMode);
  const canUndo = useDocStudioStore((state) => state.canUndo);
  const canRedo = useDocStudioStore((state) => state.canRedo);
  const undo = useDocStudioStore((state) => state.undo);
  const redo = useDocStudioStore((state) => state.redo);
  const zoom = useDocStudioStore((state) => state.zoom);
  const setZoom = useDocStudioStore((state) => state.setZoom);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignorar si el navegador bloquea fullscreen
    }
  };

  const handleTitleBlur = () => {
    if (tempName.trim()) {
      setName(tempName.trim());
    } else {
      setTempName(name);
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-16 border-b bg-card px-4 flex items-center justify-between shrink-0 z-20 gap-4 shadow-2xs">
      {/* Left: Back button & Document title */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => router.push("/documents")}
          title="Volver a Documentos"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {onToggleSidebar && !isPreviewMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Ocultar panel lateral (más espacio)" : "Mostrar panel lateral"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </Button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
              className="h-8 text-sm font-bold max-w-[280px]"
              autoFocus
            />
          ) : (
            <h1
              className="text-sm font-bold text-slate-900 truncate max-w-[280px] cursor-pointer hover:underline"
              onClick={() => {
                setTempName(name);
                setIsEditingTitle(true);
              }}
              title="Haz clic para editar el nombre del documento"
            >
              {name || "Documento sin título"}
            </h1>
          )}

          {isDirty ? (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
              Cambios sin guardar
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              Guardado
            </Badge>
          )}

          {/* Undo and Redo buttons */}
          <div className="flex items-center gap-0.5 border-l pl-2 ml-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canUndo}
              onClick={undo}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-30"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canRedo}
              onClick={redo}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-30"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Page Settings */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={onOpenPageSettings}
          title="Configurar tamaño de hoja, orientación y márgenes"
        >
          <Settings className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Página</span>
        </Button>

        {/* Preview mode toggle */}
        <Button
          type="button"
          variant={isPreviewMode ? "secondary" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
        >
          {isPreviewMode ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Vista Previa</span>
            </>
          )}
        </Button>

        {/* Schedule Delivery button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 text-indigo-600 hover:text-indigo-700 border-indigo-200"
          onClick={onOpenScheduleDialog}
          title="Programar envío periódico de este documento"
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Programar</span>
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting}
              className="h-8 text-xs gap-1.5"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span>Exportar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 text-xs">
            <DropdownMenuItem onClick={onExportPdf}>
              <FileDown className="w-4 h-4 mr-2 text-rose-600" />
              <span>Exportar a PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportWord}>
              <FileType className="w-4 h-4 mr-2 text-blue-600" />
              <span>Exportar a Word (.docx)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save button */}
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          className="h-8 text-xs gap-1.5"
          onClick={onSave}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Guardar</span>
        </Button>

        {/* Zoom selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2 gap-1 font-mono font-medium"
              title="Nivel de zoom del lienzo"
            >
              <span>{zoom}%</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-28 text-xs">
            {[50, 75, 90, 100, 125, 150, 200].map((z) => (
              <DropdownMenuItem
                key={z}
                onClick={() => setZoom(z)}
                className={zoom === z ? "font-bold text-primary" : ""}
              >
                <span>{z}%</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fullscreen button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
          )}
        </Button>
      </div>
    </header>
  );
};
