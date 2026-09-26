"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExecutionTrendItem } from "@/types/dashboard-types";

interface ExecutionTrendChartProps {
  trend?: ExecutionTrendItem[];
}

export const ExecutionTrendChart: React.FC<ExecutionTrendChartProps> = ({ trend = [] }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const width = 600;
    const height = 200;
    const padL = 36;
    const padR = 20;
    const padT = 24;
    const padB = 30;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    if (!trend || trend.length === 0) {
      return {
        points: [] as (ExecutionTrendItem & { x: number; y: number; ySuccess: number; index: number })[],
        maxVal: 5,
        yTicks: [0, 2, 5],
        linePath: "",
        areaPath: "",
        width,
        height,
        padL,
        padR,
        padT,
        padB,
        plotW,
        plotH,
      };
    }

    const maxVal = Math.max(...trend.map((d) => d.total), 5);
    const yTicks = [0, Math.round(maxVal / 2), maxVal];

    const points = trend.map((d, i) => {
      const x = padL + (i / Math.max(trend.length - 1, 1)) * plotW;
      const y = padT + (1 - d.total / maxVal) * plotH;
      const ySuccess = padT + (1 - d.success / maxVal) * plotH;
      return { ...d, x, y, ySuccess, index: i };
    });

    // Helper para curva cúbica suavizada (Catmull-Rom / Bézier)
    const getCurvedPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return "";
      if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

      let path = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] ?? p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
      return path;
    };

    const linePath = getCurvedPath(points.map((p) => ({ x: p.x, y: p.y })));
    const baselineY = padT + plotH;
    const firstX = points[0]?.x ?? padL;
    const lastX = points[points.length - 1]?.x ?? (padL + plotW);
    const areaPath = linePath ? `${linePath} L ${lastX.toFixed(1)},${baselineY.toFixed(1)} L ${firstX.toFixed(1)},${baselineY.toFixed(1)} Z` : "";

    return {
      points,
      maxVal,
      yTicks,
      linePath,
      areaPath,
      width,
      height,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
    };
  }, [trend]);

  const activePoint = hoveredIdx !== null ? chartData.points[hoveredIdx] : null;

  return (
    <Card className="col-span-1 lg:col-span-3 border-border/70 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">Tendencia de Ejecuciones</CardTitle>
            <CardDescription className="text-xs">
              Histórico de los últimos 14 días agrupado por volumen y estado
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Exitosas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Fallidas</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {/* Tooltip flotante informativo si está activo */}
        <div className="h-7 mb-1 flex items-center justify-between text-xs">
          {activePoint ? (
            <div className="flex items-center gap-3 bg-muted/60 px-2.5 py-1 rounded-md border border-border/50 transition-all">
              <span className="font-semibold text-foreground">{activePoint.label}</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Total: {activePoint.total}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Éxitos: {activePoint.success}
              </span>
              {activePoint.failed > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  Fallos: {activePoint.failed}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/70 italic">
              Pasa el cursor sobre los puntos para ver el detalle por día
            </span>
          )}
        </div>

        {/* Gráfico SVG Nativo */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="w-full h-[210px] overflow-visible"
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Líneas de cuadrícula horizontal */}
            {chartData.yTicks.map((tick, i) => {
              const y = chartData.padT + (1 - tick / chartData.maxVal) * chartData.plotH;
              return (
                <g key={`ytick-${i}`}>
                  <line
                    x1={chartData.padL}
                    y1={y}
                    x2={chartData.width - chartData.padR}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={chartData.padL - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-muted-foreground font-mono"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Área sombreada bajo la curva */}
            {chartData.areaPath && (
              <path d={chartData.areaPath} fill="url(#trendGradient)" />
            )}

            {/* Línea principal Bézier */}
            {chartData.linePath && (
              <path
                d={chartData.linePath}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Línea vertical de hover */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={chartData.padT}
                x2={activePoint.x}
                y2={chartData.padT + chartData.plotH}
                stroke="#3B82F6"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.7"
              />
            )}

            {/* Puntos y áreas de hover táctil/mouse */}
            {chartData.points.map((p) => {
              const isHovered = hoveredIdx === p.index;
              return (
                <g
                  key={`point-${p.index}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(p.index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Círculo invisible amplio para facilitar el hover con el mouse */}
                  <rect
                    x={p.x - 15}
                    y={chartData.padT}
                    width={30}
                    height={chartData.plotH + 20}
                    fill="transparent"
                  />

                  {/* Círculo visible en cada punto con ejecuciones */}
                  {(p.total > 0 || isHovered) && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill={p.failed > 0 ? "#F43F5E" : "#3B82F6"}
                      stroke="var(--background, #fff)"
                      strokeWidth={2}
                      className="transition-all duration-150"
                    />
                  )}
                </g>
              );
            })}

            {/* Etiquetas de fechas en eje X (mostramos 7 fechas distribuidas) */}
            {chartData.points.map((p, i) => {
              if (i % 2 !== 0 && i !== chartData.points.length - 1) return null;
              return (
                <text
                  key={`xlabel-${i}`}
                  x={p.x}
                  y={chartData.height - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-muted-foreground select-none"
                >
                  {p.label}
                </text>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};
