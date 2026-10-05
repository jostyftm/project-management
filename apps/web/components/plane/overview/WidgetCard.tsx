"use client";

import React, { useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileImage, ImageIcon, Code2, Loader2 } from "lucide-react";
import { useWidgetExport } from "@/hooks/use-widget-export";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  description?: string;
  exportFilename?: string;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function WidgetCard({
  title,
  description,
  exportFilename,
  actions,
  className,
  contentClassName,
  children,
}: WidgetCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const cleanFilename = exportFilename || title.toLowerCase().replace(/\s+/g, "-");
  const { exportWidget, isExporting } = useWidgetExport(contentRef, cleanFilename);

  return (
    <Card className={cn("border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm", className)}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-slate-800 tracking-tight truncate">
            {title}
          </CardTitle>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                title="Descargar widget"
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="size-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Download className="size-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-white shadow-md border-slate-200 z-50">
              <DropdownMenuLabel className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Descargar widget
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => exportWidget("png")}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <ImageIcon className="size-3.5 text-indigo-600" />
                <span>Imagen PNG (alta res)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportWidget("jpg")}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <FileImage className="size-3.5 text-amber-600" />
                <span>Imagen JPG</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportWidget("svg")}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <Code2 className="size-3.5 text-emerald-600" />
                <span>Vectorial SVG</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent ref={contentRef} className={cn("pt-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
