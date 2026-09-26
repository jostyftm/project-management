"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormatDistributionItem } from "@/types/dashboard-types";
import { FileSpreadsheet, FileText, FileCode, File, FileCheck } from "lucide-react";

interface FormatDistributionCardProps {
  formats?: FormatDistributionItem[];
}

const getFormatIcon = (code: string) => {
  switch (code.toLowerCase()) {
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case "csv":
      return <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
    case "pdf":
      return <FileCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    case "docx":
      return <FileCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <File className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  }
};

export const FormatDistributionCard: React.FC<FormatDistributionCardProps> = ({
  formats = [],
}) => {
  return (
    <Card className="col-span-1 lg:col-span-2 border-border/70 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Formatos Más Solicitados</CardTitle>
        <CardDescription className="text-xs">
          Preferencia de exportación y salida de reportes
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2 pb-4 space-y-3.5">
        {formats.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No hay registros de formatos aún
          </div>
        ) : (
          formats.map((fmt) => (
            <div key={fmt.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-muted/70">
                    {getFormatIcon(fmt.code)}
                  </div>
                  <span className="font-medium text-foreground">
                    {fmt.name} <span className="text-muted-foreground uppercase font-mono text-[10px]">(.{fmt.code})</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[11px]">
                    {fmt.count} ejec.{fmt.count !== 1 ? "s" : ""}
                  </span>
                  <span className="font-bold text-foreground text-xs min-w-[35px] text-right">
                    {fmt.percentage}%
                  </span>
                </div>
              </div>

              {/* Barra de progreso horizontal */}
              <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(fmt.percentage, fmt.count > 0 ? 4 : 0)}%`,
                    backgroundColor: fmt.color || "#3B82F6",
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
