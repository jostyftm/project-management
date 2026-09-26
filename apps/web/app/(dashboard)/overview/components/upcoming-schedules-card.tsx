"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpcomingScheduleItem } from "@/types/dashboard-types";
import { CalendarClock, ArrowRight, Clock, PlusCircle } from "lucide-react";

interface UpcomingSchedulesCardProps {
  schedules?: UpcomingScheduleItem[];
}

// Función auxiliar para traducir expresiones cron comunes a texto amigable
const formatCronFriendly = (cron: string) => {
  if (!cron) return "Programado";
  const trimmed = cron.trim();
  if (trimmed === "0 0 * * *") return "Todos los días a medianoche";
  if (trimmed === "0 8 * * *") return "Todos los días a las 08:00 AM";
  if (trimmed === "0 12 * * *") return "Todos los días a las 12:00 PM";
  if (trimmed === "0 0 * * 1") return "Todos los lunes a medianoche";
  if (trimmed === "0 0 1 * *") return "El 1 de cada mes a medianoche";
  return cron;
};

export const UpcomingSchedulesCard: React.FC<UpcomingSchedulesCardProps> = ({
  schedules = [],
}) => {
  return (
    <Card className="col-span-1 lg:col-span-3 border-border/70 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Programaciones Activas</CardTitle>
            <CardDescription className="text-xs">
              Tareas automáticas en espera de ejecución según calendario
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
            <Link href="/reports/schedule">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {schedules.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              No hay programaciones automáticas configuradas actualmente
            </p>
            <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5">
              <Link href="/reports/schedule">
                <PlusCircle className="h-3.5 w-3.5" />
                Nueva Programación
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {schedules.map((sch) => (
              <div
                key={sch.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {sch.report_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="truncate">{formatCronFriendly(sch.cron_expression)}</span>
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/40 shrink-0">
                      {sch.cron_expression}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono uppercase px-2 py-0.5 border-border/80 bg-background"
                  >
                    {sch.format}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                  >
                    Activo
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
