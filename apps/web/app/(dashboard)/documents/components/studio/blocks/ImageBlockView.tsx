"use client";

import React, { useRef, useState } from "react";
import { ImageBlock } from "@/types/document-type";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import {
  Upload,
  ImageIcon,
  Loader2,
  HardDrive,
} from "lucide-react";
import { uploadDocumentImage } from "@/services/document-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageBlockViewProps {
  block: ImageBlock;
  isSelected: boolean;
  isPreview: boolean;
}

export const ImageBlockView: React.FC<ImageBlockViewProps> = ({
  block,
  isSelected,
  isPreview,
}) => {
  const updateBlock = useDocStudioStore((state) => state.updateBlock);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processAndUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo seleccionado no es una imagen válida");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Guardando imagen en almacenamiento del sistema...");

    try {
      const res = await uploadDocumentImage(file);
      const data = res.data;

      updateBlock(block.id, {
        url: data.url,
        path: data.path,
        filename: data.filename,
        size: data.size,
      });

      toast.success("Imagen guardada en el almacenamiento del sistema", {
        id: toastId,
      });
    } catch (err: any) {
      // Fallback a Base64 local si falla la subida al servidor
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        updateBlock(block.id, {
          url: base64Url,
          filename: file.name,
          size: file.size,
        });
        toast.warning("Imagen cargada localmente", {
          id: toastId,
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
    if (e.target) e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPreview) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isPreview) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const widthPct = block.widthPercent || 100;
  const align = block.align || "center";

  const alignClass =
    align === "left"
      ? "justify-start text-left"
      : align === "right"
      ? "justify-end text-right"
      : "justify-center text-center";

  return (
    <div className="relative group/image my-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Image Rendering / Dropzone */}
      <div className={`flex flex-col ${alignClass}`}>
        {block.url ? (
          <div
            style={{ width: `${widthPct}%` }}
            className="inline-block transition-all relative group/imgcontainer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-md z-10 flex items-center justify-center text-xs font-semibold text-blue-700 backdrop-blur-xs">
                Suelta la nueva imagen para reemplazar
              </div>
            )}
            <img
              src={block.url}
              alt={block.caption || "Imagen"}
              className="w-full h-auto rounded-md shadow-xs object-contain max-h-[420px]"
            />
            {block.caption && (
              <p className="text-xs text-muted-foreground italic mt-1 text-center">
                {block.caption}
              </p>
            )}

            {/* Storage indicator badge */}
            {block.path && !isPreview && (
              <div className="hidden group-hover/imgcontainer:flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                <HardDrive className="w-3 h-3 text-emerald-600" />
                <span className="truncate max-w-[200px]" title={block.path}>
                  {block.filename || block.path}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground hover:bg-slate-50 cursor-pointer w-full transition-colors",
              isDragging && "border-blue-500 bg-blue-50/50 text-blue-600",
              isUploading && "pointer-events-none opacity-80"
            )}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs font-medium text-slate-700">
                  Guardando en el almacenamiento del sistema...
                </span>
              </div>
            ) : (
              <>
                <div className="p-3 bg-slate-100 rounded-full mb-2">
                  <ImageIcon className="w-6 h-6 text-slate-600 stroke-[1.75]" />
                </div>
                <span className="text-xs font-semibold text-slate-800 mb-0.5">
                  Haz clic o arrastra tu imagen aquí
                </span>
                <span className="text-[11px] text-slate-400 text-center max-w-sm">
                  Se guardará automáticamente en el almacenamiento por defecto del sistema (.env)
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Formatos admitidos: PNG, JPG, JPEG, SVG o WebP (máx. 10 MB)
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
