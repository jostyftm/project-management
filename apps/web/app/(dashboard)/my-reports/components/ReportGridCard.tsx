"use client";
import React from "react";
import { MyReportItem } from "../types/my-report-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Database,
  FileBarChart,
  Play,
  Settings2,
  Tag,
} from "lucide-react";

interface ReportGridCardProps {
  report: MyReportItem;
  onGenerate: (report: MyReportItem) => void;
}

export const ReportGridCard: React.FC<ReportGridCardProps> = ({
  report,
  onGenerate,
}) => {
  const categoryName = report.relationships?.category?.name;
  const connectionName = report.relationships?.connection?.name;
  const driver = report.relationships?.connection?.driver;
  const paramCount = report.relationships?.parameters?.length ?? 0;

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200/80 bg-white group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          {categoryName ? (
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-[11px] font-medium gap-1 py-0.5"
            >
              <Tag className="w-3 h-3" />
              <span>{categoryName}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-500 text-[11px] py-0.5">
              General
            </Badge>
          )}

          {connectionName && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md">
              <Database className="w-3 h-3 text-slate-500" />
              <span>{driver || connectionName}</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
            <FileBarChart className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900 leading-tight">
              {report.attributes.name}
            </CardTitle>
            {report.attributes.description ? (
              <CardDescription className="text-xs text-slate-500 mt-1 line-clamp-2">
                {report.attributes.description}
              </CardDescription>
            ) : (
              <p className="text-xs text-slate-400 italic mt-1">Sin descripción</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Settings2 className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {paramCount === 0
              ? "Sin parámetros requeridos"
              : `${paramCount} parámetro${paramCount > 1 ? "s" : ""} configurable${
                  paramCount > 1 ? "s" : ""
                }`}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t border-slate-100 bg-slate-50/40 rounded-b-xl flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-mono">
          ID: #{report.id}
        </span>

        <Button
          size="sm"
          className="gap-1.5 cursor-pointer font-semibold shadow-sm hover:scale-[1.02] transition-transform"
          onClick={() => onGenerate(report)}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Generar</span>
        </Button>
      </CardFooter>
    </Card>
  );
};
