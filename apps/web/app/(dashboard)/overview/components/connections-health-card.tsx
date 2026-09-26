"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectionHealthItem } from "@/types/dashboard-types";
import { Database, ArrowRight, CheckCircle2, AlertCircle, HelpCircle, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ConnectionsHealthCardProps {
  connections?: ConnectionHealthItem[];
}

export const ConnectionsHealthCard: React.FC<ConnectionsHealthCardProps> = ({
  connections = [],
}) => {
  return (
    <Card className="border-border/70 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Salud de Conexiones BD</CardTitle>
              <CardDescription className="text-xs">
                Estado operativo de las bases de datos externas configuradas
              </CardDescription>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
            <Link href="/setting/connections">
              Gestionar <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {connections.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <Database className="h-7 w-7 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              No hay conexiones a bases de datos registradas
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {connections.map((conn) => {
              const isSuccess = conn.last_status === "success";
              const isFailed = conn.last_status === "failed";

              return (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/60 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        isSuccess
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : isFailed
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                          : "bg-slate-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-foreground">
                        {conn.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {conn.last_used_at
                          ? `Último uso: ${formatDate(conn.last_used_at, "dd/MM/yyyy HH:mm")}`
                          : "Sin ejecuciones aún"}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 font-medium ${
                      isSuccess
                        ? "border-emerald-500/30 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : isFailed
                        ? "border-rose-500/30 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300"
                        : "border-slate-300 text-slate-600 bg-slate-50 dark:bg-slate-900"
                    }`}
                  >
                    {isSuccess ? "Operativa" : isFailed ? "Alerta" : "Inactiva"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
