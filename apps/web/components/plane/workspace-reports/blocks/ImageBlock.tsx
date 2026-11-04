"use client";

import React, { useState, useRef } from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  Link as LinkIcon,
  Cloud,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface ImageBlockProps {
  block: ReportBlock;
  data?: {
    url?: string;
    data_url?: string;
    file_path?: string;
    file_name?: string;
    file_size?: number;
    file_mime?: string;
    alt?: string;
    caption?: string;
    alignment?: "left" | "center" | "right";
    max_width?: string;
  };
  isEditing?: boolean;
  workspaceId?: string | number;
  reportId?: string | number;
  onUpdateConfig?: (cfg: Record<string, any>) => void;
}

export function ImageBlock({
  block,
  data,
  isEditing = false,
  workspaceId,
  reportId,
  onUpdateConfig,
}: ImageBlockProps) {
  const { currentWorkspace } = useWorkspaceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  const effectiveWorkspaceId = workspaceId || currentWorkspace?.id;
  const effectiveReportId = reportId || block.report_id;

  const url = data?.data_url || data?.url || block.config?.data_url || block.config?.url;
  const alt = data?.alt || block.config?.alt || "Imagen del reporte";
  const caption = data?.caption || block.config?.caption;
  const alignment = data?.alignment || block.config?.alignment || "center";
  const maxWidth = data?.max_width || block.config?.max_width || "100%";
  const fileName = data?.file_name || block.config?.file_name;
  const fileSize = data?.file_size || block.config?.file_size;
  const filePath = data?.file_path || block.config?.file_path;

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG, GIF)");
      return;
    }

    if (!effectiveWorkspaceId || !effectiveReportId) {
      toast.error("No se pudo identificar el workspace o reporte activo para la subida");
      return;
    }

    setIsUploading(true);
    try {
      const uploadedData = await workspaceReportService.uploadImage(
        effectiveWorkspaceId,
        effectiveReportId,
        file
      );

      if (onUpdateConfig) {
        onUpdateConfig({
          ...block.config,
          url: uploadedData.url,
          data_url: uploadedData.data_url,
          file_path: uploadedData.file_path,
          file_name: uploadedData.file_name,
          file_size: uploadedData.file_size,
          file_mime: uploadedData.file_mime,
        });
      }

      toast.success("Imagen cargada exitosamente a S3");
      setShowUrlInput(false);
    } catch (err: any) {
      console.error("Error al subir imagen a S3:", err);
      toast.error(err?.response?.data?.message || "Error al subir la imagen a S3");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta imagen de S3?")) {
      return;
    }

    setIsDeleting(true);
    try {
      if (filePath && effectiveWorkspaceId && effectiveReportId) {
        await workspaceReportService.deleteImage(
          effectiveWorkspaceId,
          effectiveReportId,
          filePath
        );
      }

      if (onUpdateConfig) {
        const updated = { ...block.config };
        delete updated.url;
        delete updated.data_url;
        delete updated.file_path;
        delete updated.file_name;
        delete updated.file_size;
        delete updated.file_mime;
        onUpdateConfig(updated);
      }

      toast.success("Imagen eliminada de S3 correctamente");
    } catch (err: any) {
      console.error("Error al eliminar imagen de S3:", err);
      toast.error(err?.response?.data?.message || "Error al eliminar la imagen de S3");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApplyManualUrl = () => {
    if (!manualUrl.trim()) return;
    if (onUpdateConfig) {
      onUpdateConfig({
        ...block.config,
        url: manualUrl.trim(),
        data_url: undefined,
        file_path: undefined,
        file_name: undefined,
      });
    }
    toast.success("URL de imagen asignada correctamente");
    setShowUrlInput(false);
    setManualUrl("");
  };

  const alignClass =
    alignment === "left"
      ? "justify-start text-left items-start"
      : alignment === "right"
      ? "justify-end text-right items-end"
      : "justify-center text-center items-center";

  // Estado vacío: Sin imagen configurada
  if (!url) {
    if (!isEditing) {
      return (
        <div className="w-full bg-neutral-50 dark:bg-neutral-900/60 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center flex flex-col items-center justify-center">
          <ImageIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mb-2" />
          <p className="text-xs font-medium text-neutral-500">Imagen no configurada</p>
        </div>
      );
    }

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleUpload(e.dataTransfer.files);
        }}
        className={`w-full rounded-2xl border-2 border-dashed transition-all p-8 text-center flex flex-col items-center justify-center ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
            : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 hover:border-neutral-300 dark:hover:border-neutral-700"
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-xs">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>

        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
          {isUploading ? "Subiendo imagen a S3..." : "Cargar imagen desde el equipo"}
        </h4>
        <p className="text-xs text-neutral-500 max-w-sm mb-4">
          Arrastra y suelta tu archivo aquí, o selecciónalo desde tu dispositivo. Se almacenará directamente en el almacenamiento S3.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <label
            className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors ${
              isUploading ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Seleccionar del equipo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={isUploading}
              className="hidden"
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Usar URL externa</span>
          </button>
        </div>

        {showUrlInput && (
          <div className="mt-4 flex items-center gap-2 w-full max-w-md animate-in fade-in">
            <input
              type="url"
              placeholder="https://ejemplo.com/imagen.png"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApplyManualUrl();
              }}
              className="flex-1 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleApplyManualUrl}
              className="px-3 py-2 text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity shrink-0"
            >
              Aplicar
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium">
          <Cloud className="w-3 h-3 text-indigo-500" />
          <span>Soporta PNG, JPG, JPEG, WEBP, SVG (Hasta 20MB) &bull; Persistente en S3</span>
        </div>
      </div>
    );
  }

  // Estado con imagen cargada
  return (
    <div className={`w-full flex flex-col ${alignClass} group relative`}>
      <div
        style={{ maxWidth }}
        className="relative inline-block overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-950 shadow-xs"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="max-h-[500px] w-auto object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.005]"
          loading="lazy"
        />

        {/* Floating action bar in editor mode */}
        {isEditing && (
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/90 backdrop-blur-xs text-white rounded-lg p-1 flex items-center gap-1 shadow-md z-10">
            <label
              className="cursor-pointer p-1.5 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              title="Cambiar imagen desde el equipo"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Cambiar</span>
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                disabled={isUploading}
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 hover:bg-rose-950/80 text-neutral-300 hover:text-rose-400 rounded transition-colors flex items-center gap-1 text-[11px]"
              title="Eliminar imagen de S3"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          </div>
        )}

        {/* Footer info banner if image is stored in S3 */}
        {filePath && (
          <div className="p-2 bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-500">
            <span className="truncate max-w-[220px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
              <Cloud className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="truncate">{fileName || "Imagen S3"}</span>
            </span>
            {fileSize && <span>{formatBytes(fileSize)}</span>}
          </div>
        )}
      </div>

      {caption && (
        <span
          style={{ maxWidth }}
          className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 block italic text-center"
        >
          {caption}
        </span>
      )}
    </div>
  );
}

export function ImageConfigPanel({
  config,
  onChange,
  workspaceId,
  reportId,
  block,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
  workspaceId?: string | number;
  reportId?: string | number;
  block?: ReportBlock;
}) {
  const { currentWorkspace } = useWorkspaceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"upload" | "url">(
    config.file_path || !config.url ? "upload" : "url"
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const effectiveWorkspaceId = workspaceId || currentWorkspace?.id;
  const effectiveReportId = reportId || block?.report_id;

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG)");
      return;
    }

    if (!effectiveWorkspaceId || !effectiveReportId) {
      toast.error("No se pudo identificar el workspace o reporte activo");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await workspaceReportService.uploadImage(
        effectiveWorkspaceId,
        effectiveReportId,
        file
      );

      onChange({
        ...config,
        url: uploaded.url,
        data_url: uploaded.data_url,
        file_path: uploaded.file_path,
        file_name: uploaded.file_name,
        file_size: uploaded.file_size,
        file_mime: uploaded.file_mime,
      });

      toast.success("Imagen subida a S3 exitosamente");
    } catch (err: any) {
      console.error("Error al subir imagen a S3:", err);
      toast.error(err?.response?.data?.message || "Error al subir la imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Deseas eliminar esta imagen de S3?")) return;

    setIsDeleting(true);
    try {
      if (config.file_path && effectiveWorkspaceId && effectiveReportId) {
        await workspaceReportService.deleteImage(
          effectiveWorkspaceId,
          effectiveReportId,
          config.file_path
        );
      }

      const updated = { ...config };
      delete updated.url;
      delete updated.data_url;
      delete updated.file_path;
      delete updated.file_name;
      delete updated.file_size;
      delete updated.file_mime;
      onChange(updated);

      toast.success("Imagen eliminada de S3");
    } catch (err: any) {
      console.error("Error al eliminar imagen de S3:", err);
      toast.error(err?.response?.data?.message || "Error al eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mode === "upload"
              ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Subir a S3</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mode === "url"
              ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>URL Externa</span>
        </button>
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          {config.url || config.file_path ? (
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-lg bg-neutral-900 overflow-hidden shrink-0 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={config.data_url || config.url}
                    alt={config.file_name || "Imagen"}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate block">
                    {config.file_name || "Imagen cargada"}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-0.5">
                    <Cloud className="w-3 h-3 text-indigo-500" />
                    <span>S3 Storage</span>
                    {config.file_size && (
                      <>
                        <span>&bull;</span>
                        <span>{formatBytes(config.file_size)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/80 dark:border-neutral-700/80">
                <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>Reemplazar</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    className="hidden"
                    onChange={(e) => {
                      handleUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
                  title="Eliminar de S3"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-center bg-white dark:bg-neutral-800">
              <Upload className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                Subir desde el equipo a S3
              </p>
              <p className="text-[10px] text-neutral-400 mb-2.5">
                PNG, JPG, WEBP, SVG hasta 20MB
              </p>
              <label
                className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors ${
                  isUploading ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Seleccionar archivo</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
                  className="hidden"
                  onChange={(e) => {
                    handleUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
            URL de la Imagen
          </label>
          <input
            type="url"
            placeholder="https://ejemplo.com/grafico.png"
            value={config.url || ""}
            onChange={(e) =>
              onChange({
                ...config,
                url: e.target.value,
                data_url: undefined,
                file_path: undefined,
                file_name: undefined,
              })
            }
            className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Pie de Foto (Caption)
        </label>
        <input
          type="text"
          placeholder="Descripción o fuente de la imagen"
          value={config.caption || ""}
          onChange={(e) => onChange({ ...config, caption: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Texto Alternativo (Alt)
        </label>
        <input
          type="text"
          placeholder="Descripción para accesibilidad"
          value={config.alt || ""}
          onChange={(e) => onChange({ ...config, alt: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
            Alineación
          </label>
          <select
            value={config.alignment || "center"}
            onChange={(e) => onChange({ ...config, alignment: e.target.value })}
            className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-neutral-800 dark:text-neutral-200"
          >
            <option value="left">Izquierda</option>
            <option value="center">Centrado</option>
            <option value="right">Derecha</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
            Ancho Máximo
          </label>
          <select
            value={config.max_width || "100%"}
            onChange={(e) => onChange({ ...config, max_width: e.target.value })}
            className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-neutral-800 dark:text-neutral-200"
          >
            <option value="100%">100% (Completo)</option>
            <option value="75%">75%</option>
            <option value="50%">50%</option>
            <option value="25%">25%</option>
          </select>
        </div>
      </div>
    </div>
  );
}
