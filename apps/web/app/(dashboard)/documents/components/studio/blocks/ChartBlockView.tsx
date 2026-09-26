"use client";

import React from "react";
import { ChartBlock } from "@/types/document-type";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { Input } from "@/components/ui/input";

interface ChartBlockViewProps {
  block: ChartBlock;
  isSelected: boolean;
  isPreview: boolean;
  onOpenDataSourceModal?: (blockId: string) => void;
}

const COLORS = [
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#0284c7",
  "#0ea5e9",
  "#38bdf8",
  "#6366f1",
];

export const ChartBlockView: React.FC<ChartBlockViewProps> = ({
  block,
  isSelected,
  isPreview,
}) => {
  const updateBlock = useDocStudioStore((state) => state.updateBlock);

  const chartType = block.chartType || "bar";
  const data = block.data || [];
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const totalVal = data.reduce((sum, d) => sum + (d.value || 0), 0) || 1;

  const handleUpdateTitle = (title: string) => {
    updateBlock(block.id, { title });
  };

  const renderSvgChart = () => {
    if (data.length === 0) {
      return (
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
          Sin datos para graficar
        </div>
      );
    }

    if (chartType === "bar") {
      const height = 180;
      const width = 450;
      const barPadding = 12;
      const availableWidth = width - 40;
      const barWidth = Math.max(14, Math.min(48, availableWidth / data.length - barPadding));

      return (
        <div className="w-full flex justify-center overflow-x-auto py-2">
          <svg
            id={`chart-svg-${block.id}`}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-[500px] h-auto overflow-visible"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = 20 + (height - 50) * (1 - pct);
              return (
                <g key={pct}>
                  <line
                    x1="30"
                    y1={y}
                    x2={width - 10}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="25"
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#94a3b8"
                  >
                    {Math.round(maxVal * pct)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {data.map((d, i) => {
              const x =
                35 +
                i * ((width - 50) / data.length) +
                ((width - 50) / data.length - barWidth) / 2;
              const barHeight = Math.max(4, (d.value / maxVal) * (height - 60));
              const y = height - 30 - barHeight;
              const color = COLORS[i % COLORS.length];

              return (
                <g key={i} className="transition-all hover:opacity-80">
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="3"
                    fill={color}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#1e293b"
                  >
                    {d.value}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={height - 15}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#64748b"
                    className="truncate"
                  >
                    {d.label.length > 8 ? d.label.substring(0, 7) + "…" : d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    if (chartType === "line") {
      const height = 180;
      const width = 450;
      const stepX = (width - 60) / Math.max(1, data.length - 1);

      const points = data.map((d, i) => {
        const x = 35 + i * stepX;
        const y = height - 30 - Math.max(4, (d.value / maxVal) * (height - 60));
        return { x, y, ...d };
      });

      const pathData = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");

      return (
        <div className="w-full flex justify-center overflow-x-auto py-2">
          <svg
            id={`chart-svg-${block.id}`}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-[500px] h-auto overflow-visible"
          >
            {/* Grid lines */}
            {[0, 0.5, 1].map((pct) => {
              const y = 20 + (height - 50) * (1 - pct);
              return (
                <line
                  key={pct}
                  x1="30"
                  y1={y}
                  x2={width - 10}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Dots */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#1e293b"
                >
                  {p.value}
                </text>
                <text
                  x={p.x}
                  y={height - 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      );
    }

    if (chartType === "pie") {
      const height = 180;
      const width = 480;
      const cx = 105;
      const cy = 90;
      const radius = 65;
      let cumulativeAngle = 0;

      const slices = data.map((d, i) => {
        const sliceAngle = (d.value / totalVal) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + sliceAngle;
        cumulativeAngle += sliceAngle;

        const startRad = ((startAngle - 90) * Math.PI) / 180;
        const endRad = ((endAngle - 90) * Math.PI) / 180;

        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);

        const largeArcFlag = sliceAngle > 180 ? 1 : 0;
        const pathData =
          data.length === 1
            ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
            : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

        return {
          ...d,
          color: COLORS[i % COLORS.length],
          pathData,
          pct: Math.round((d.value / totalVal) * 100),
        };
      });

      return (
        <div className="w-full flex justify-center overflow-x-auto py-2">
          <svg
            id={`chart-svg-${block.id}`}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-[500px] h-auto overflow-visible font-sans"
          >
            {slices.map((slice, i) => (
              <path
                key={i}
                d={slice.pathData}
                fill={slice.color}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
            {/* Center circle for donut style */}
            <circle cx={cx} cy={cy} r={radius * 0.45} fill="#ffffff" />

            {/* Legend inside SVG */}
            {slices.map((slice, i) => {
              const startY = Math.max(25, 90 - (slices.length * 20) / 2);
              const itemY = startY + i * 22;
              return (
                <g key={i}>
                  <rect
                    x="210"
                    y={itemY - 9}
                    width="12"
                    height="12"
                    rx="2"
                    fill={slice.color}
                  />
                  <text
                    x="230"
                    y={itemY + 1}
                    fontSize="11"
                    fontWeight="500"
                    fill="#334155"
                  >
                    {slice.label.length > 15 ? slice.label.substring(0, 14) + "…" : slice.label}:
                  </text>
                  <text
                    x="370"
                    y={itemY + 1}
                    fontSize="11"
                    fontWeight="600"
                    fill="#64748b"
                  >
                    {slice.value} ({slice.pct}%)
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="border rounded-lg p-3 bg-card shadow-2xs my-2">
      {/* Chart Title */}
      <div className="text-center mb-1">
        {!isPreview && isSelected ? (
          <Input
            value={block.title || ""}
            onChange={(e) => handleUpdateTitle(e.target.value)}
            placeholder="Título de la gráfica..."
            className="h-8 text-center text-sm font-semibold max-w-sm mx-auto"
          />
        ) : (
          block.title && (
            <h3 className="text-sm font-semibold text-slate-800">
              {block.title}
            </h3>
          )
        )}
      </div>

      {/* Render Chart */}
      {renderSvgChart()}
    </div>
  );
};
