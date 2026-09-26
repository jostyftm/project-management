"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategoryDistributionItem } from "@/types/dashboard-types";

interface CategoryDonutChartProps {
  categories?: CategoryDistributionItem[];
  totalReports?: number;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories = [],
  totalReports = 0,
}) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const radius = 60;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  const slices = useMemo(() => {
    let accumulatedAngle = 0;

    return categories.map((cat) => {
      const strokeDash = (cat.percentage / 100) * circumference;
      const strokeOffset = -accumulatedAngle;
      accumulatedAngle += strokeDash;

      return {
        ...cat,
        strokeDash,
        strokeOffset,
      };
    });
  }, [categories, circumference]);

  const activeCategory = hoveredId !== null ? categories.find((c) => c.id === hoveredId) : null;

  return (
    <Card className="col-span-1 lg:col-span-2 border-border/70 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Reportes por Categoría</CardTitle>
        <CardDescription className="text-xs">
          Distribución del catálogo por áreas temáticas
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
          {/* Donut SVG */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg
              width="170"
              height="170"
              viewBox="0 0 170 170"
              className="transform -rotate-90 overflow-visible"
            >
              {/* Background ring */}
              <circle
                cx="85"
                cy="85"
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {slices.map((slice) => {
                const isHovered = hoveredId === slice.id;
                return (
                  <circle
                    key={`slice-${slice.id}`}
                    cx="85"
                    cy="85"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${slice.strokeDash} ${circumference}`}
                    strokeDashoffset={slice.strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                );
              })}
            </svg>

            {/* Centro informativo del Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {activeCategory ? (
                <>
                  <span className="text-lg font-bold text-foreground leading-tight">
                    {activeCategory.count}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[80px]">
                    {activeCategory.percentage}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xl font-bold text-foreground leading-tight">
                    {totalReports}
                  </span>
                  <span className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider">
                    Reportes
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Leyenda y lista de categorías */}
          <div className="flex flex-col gap-2 w-full max-w-[220px]">
            {categories.map((cat) => {
              const isHovered = hoveredId === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isHovered ? "bg-muted/80" : "hover:bg-muted/40"
                  }`}
                  onMouseEnter={() => setHoveredId(cat.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate font-medium text-foreground">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="font-semibold text-foreground">{cat.count}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({cat.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
