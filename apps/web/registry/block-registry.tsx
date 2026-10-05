import React from "react";
import { BlockType, ReportBlock } from "@/types/workspace-report-types";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Calendar,
  Columns,
  FileText,
  Flame,
  Grid,
  Image as ImageIcon,
  Layers,
  LineChart as LineChartIcon,
  ListTodo,
  Milestone,
  PieChart,
  Repeat,
  Sparkles,
  Table as TableIcon,
  TrendingUp,
  Users,
} from "lucide-react";
import { KpiRowBlock, KpiRowConfigPanel } from "@/components/plane/workspace-reports/blocks/KpiRowBlock";
import { NarrativeBlock, NarrativeConfigPanel } from "@/components/plane/workspace-reports/blocks/NarrativeBlock";
import { LineChartBlock, LineChartConfigPanel } from "@/components/plane/workspace-reports/blocks/LineChartBlock";
import { BarChartBlock, BarChartConfigPanel } from "@/components/plane/workspace-reports/blocks/BarChartBlock";
import { DonutChartBlock, DonutChartConfigPanel } from "@/components/plane/workspace-reports/blocks/DonutChartBlock";
import { AreaChartBlock, AreaChartConfigPanel } from "@/components/plane/workspace-reports/blocks/AreaChartBlock";
import { ProjectSummaryBlock, ProjectSummaryConfigPanel } from "@/components/plane/workspace-reports/blocks/ProjectSummaryBlock";
import { TableBlock, TableConfigPanel } from "@/components/plane/workspace-reports/blocks/TableBlock";
import { WorkItemsListBlock, WorkItemsListConfigPanel } from "@/components/plane/workspace-reports/blocks/WorkItemsListBlock";
import { CyclesOverviewBlock, CyclesOverviewConfigPanel } from "@/components/plane/workspace-reports/blocks/CyclesOverviewBlock";
import { ReleasesTimelineBlock, ReleasesTimelineConfigPanel } from "@/components/plane/workspace-reports/blocks/ReleasesTimelineBlock";
import { MilestonesProgressBlock, MilestonesProgressConfigPanel } from "@/components/plane/workspace-reports/blocks/MilestonesProgressBlock";
import { TeamWorkloadBlock, TeamWorkloadConfigPanel } from "@/components/plane/workspace-reports/blocks/TeamWorkloadBlock";
import { RecentActivityBlock, RecentActivityConfigPanel } from "@/components/plane/workspace-reports/blocks/RecentActivityBlock";
import { RisksBlockersBlock, RisksBlockersConfigPanel } from "@/components/plane/workspace-reports/blocks/RisksBlockersBlock";
import { HeatmapBlock, HeatmapConfigPanel } from "@/components/plane/workspace-reports/blocks/HeatmapBlock";
import { DividerBlock, DividerConfigPanel } from "@/components/plane/workspace-reports/blocks/DividerBlock";
import { ImageBlock, ImageConfigPanel } from "@/components/plane/workspace-reports/blocks/ImageBlock";
import { CalloutBlock, CalloutConfigPanel } from "@/components/plane/workspace-reports/blocks/CalloutBlock";

export type BlockCategory = "metrics" | "projects" | "work" | "context";

export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  category: BlockCategory;
  icon: React.ComponentType<{ className?: string }>;
  defaultWidth: number;
  defaultConfig: Record<string, any>;
  renderComponent: React.ComponentType<{
    block: ReportBlock;
    data?: any;
    isEditing?: boolean;
    onUpdateConfig?: (cfg: Record<string, any>) => void;
  }>;
  configPanelComponent?: React.ComponentType<{
    config: Record<string, any>;
    onChange: (cfg: Record<string, any>) => void;
  }>;
}

// Placeholder genérico para los bloques que se implementarán en fases siguientes
function GenericPlaceholderBlock({ block }: { block: ReportBlock }) {
  const def = blockRegistry[block.type];
  const Icon = def?.icon || Grid;

  return (
    <div className="w-full bg-neutral-50 dark:bg-neutral-900/60 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-xl p-6 text-center">
      <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        {block.title || def?.label || block.type}
      </h4>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
        {def?.description || "Bloque de reporte dinámico"}
      </p>
      <div className="mt-3 inline-flex items-center text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
        Fase siguiente
      </div>
    </div>
  );
}

export const blockRegistry: Record<BlockType, BlockDefinition> = {
  kpi_row: {
    type: "kpi_row",
    label: "Fila de KPIs",
    description: "Métricas destacadas con valores, deltas porcentuales y mini sparkline",
    category: "metrics",
    icon: TrendingUp,
    defaultWidth: 12,
    defaultConfig: {
      metrics: ["total", "completed", "in_progress", "overdue"],
      days_back: "30",
    },
    renderComponent: KpiRowBlock as any,
    configPanelComponent: KpiRowConfigPanel,
  },
  narrative: {
    type: "narrative",
    label: "Texto Enriquecido",
    description: "Bloque de análisis narrativo editorial con formato de texto rico",
    category: "context",
    icon: FileText,
    defaultWidth: 12,
    defaultConfig: {
      content: "<h2>Resumen Ejecutivo</h2><p>Escribe aquí tu análisis editorial del período...</p>",
      alignment: "left",
    },
    renderComponent: NarrativeBlock as any,
    configPanelComponent: NarrativeConfigPanel,
  },
  line_chart: {
    type: "line_chart",
    label: "Gráfico de Línea",
    description: "Evolución histórica de métricas por día, semana o mes",
    category: "metrics",
    icon: LineChartIcon,
    defaultWidth: 12,
    defaultConfig: {
      metric: "work_items_completed",
      grouping: "week",
      color: "#6366f1",
    },
    renderComponent: LineChartBlock as any,
    configPanelComponent: LineChartConfigPanel,
  },
  project_summary: {
    type: "project_summary",
    label: "Resumen de Proyecto",
    description: "Tarjeta integral de salud, progreso, fechas clave y equipo",
    category: "projects",
    icon: Sparkles,
    defaultWidth: 12,
    defaultConfig: {},
    renderComponent: ProjectSummaryBlock as any,
    configPanelComponent: ProjectSummaryConfigPanel,
  },
  bar_chart: {
    type: "bar_chart",
    label: "Gráfico de Barras",
    description: "Comparativa de métricas por estado, prioridad o miembro",
    category: "metrics",
    icon: BarChart2,
    defaultWidth: 6,
    defaultConfig: {
      dimension: "state",
      metric: "count",
    },
    renderComponent: BarChartBlock as any,
    configPanelComponent: BarChartConfigPanel,
  },
  donut_chart: {
    type: "donut_chart",
    label: "Gráfico Donut",
    description: "Distribución porcentual por estado o tipo de work item",
    category: "metrics",
    icon: PieChart,
    defaultWidth: 6,
    defaultConfig: {
      dimension: "priority",
    },
    renderComponent: DonutChartBlock as any,
    configPanelComponent: DonutChartConfigPanel,
  },
  area_chart: {
    type: "area_chart",
    label: "Gráfico de Área",
    description: "Volumen acumulado de trabajo y flujo acumulado",
    category: "metrics",
    icon: Flame,
    defaultWidth: 12,
    defaultConfig: {
      grouping: "week",
    },
    renderComponent: AreaChartBlock as any,
    configPanelComponent: AreaChartConfigPanel,
  },
  heatmap: {
    type: "heatmap",
    label: "Mapa de Calor",
    description: "Densidad de actividad y tareas por día de la semana",
    category: "metrics",
    icon: Flame,
    defaultWidth: 12,
    defaultConfig: {
      metric: "completed",
      weeks: 12,
    },
    renderComponent: HeatmapBlock as any,
    configPanelComponent: HeatmapConfigPanel,
  },
  table: {
    type: "table",
    label: "Tabla Configurable",
    description: "Vista tabular detallada con columnas y filtros personalizados",
    category: "work",
    icon: TableIcon,
    defaultWidth: 12,
    defaultConfig: {
      limit: 10,
      sort_by: "created_at",
    },
    renderComponent: TableBlock as any,
    configPanelComponent: TableConfigPanel,
  },
  work_items_list: {
    type: "work_items_list",
    label: "Lista de Work Items",
    description: "Lista compacta de items filtrados por urgencia o atraso",
    category: "work",
    icon: ListTodo,
    defaultWidth: 12,
    defaultConfig: {
      filter: "urgent",
      limit: 5,
    },
    renderComponent: WorkItemsListBlock as any,
    configPanelComponent: WorkItemsListConfigPanel,
  },
  cycles_overview: {
    type: "cycles_overview",
    label: "Resumen de Ciclos",
    description: "Progreso, estado y completitud de sprints/ciclos",
    category: "work",
    icon: Repeat,
    defaultWidth: 12,
    defaultConfig: {
      status: "all",
      limit: 5,
    },
    renderComponent: CyclesOverviewBlock as any,
    configPanelComponent: CyclesOverviewConfigPanel,
  },
  releases_timeline: {
    type: "releases_timeline",
    label: "Línea de Releases",
    description: "Cronograma de versiones publicadas y planificadas",
    category: "projects",
    icon: Calendar,
    defaultWidth: 12,
    defaultConfig: {
      status: "all",
      limit: 5,
    },
    renderComponent: ReleasesTimelineBlock as any,
    configPanelComponent: ReleasesTimelineConfigPanel,
  },
  milestones_progress: {
    type: "milestones_progress",
    label: "Progreso de Hitos",
    description: "Avance porcentual hacia los hitos estratégicos del proyecto",
    category: "projects",
    icon: Milestone,
    defaultWidth: 12,
    defaultConfig: {
      status: "all",
      limit: 5,
    },
    renderComponent: MilestonesProgressBlock as any,
    configPanelComponent: MilestonesProgressConfigPanel,
  },
  team_workload: {
    type: "team_workload",
    label: "Carga del Equipo",
    description: "Distribución de tareas y capacidad por miembro del equipo",
    category: "work",
    icon: Users,
    defaultWidth: 12,
    defaultConfig: {
      limit: 10,
    },
    renderComponent: TeamWorkloadBlock as any,
    configPanelComponent: TeamWorkloadConfigPanel,
  },
  recent_activity: {
    type: "recent_activity",
    label: "Actividad Reciente",
    description: "Feed cronológico de cambios, comentarios y eventos",
    category: "context",
    icon: Activity,
    defaultWidth: 12,
    defaultConfig: {
      limit: 8,
    },
    renderComponent: RecentActivityBlock as any,
    configPanelComponent: RecentActivityConfigPanel,
  },
  risks_blockers: {
    type: "risks_blockers",
    label: "Riesgos y Bloqueos",
    description: "Detección de items vencidos, bloqueados o estancados",
    category: "work",
    icon: AlertTriangle,
    defaultWidth: 12,
    defaultConfig: {
      days_stagnant: 7,
      limit: 8,
    },
    renderComponent: RisksBlockersBlock as any,
    configPanelComponent: RisksBlockersConfigPanel,
  },
  divider: {
    type: "divider",
    label: "Separador",
    description: "Línea o espacio separador visual entre secciones",
    category: "context",
    icon: Columns,
    defaultWidth: 12,
    defaultConfig: {
      style: "solid",
      height: 24,
    },
    renderComponent: DividerBlock as any,
    configPanelComponent: DividerConfigPanel,
  },
  image: {
    type: "image",
    label: "Imagen",
    description: "Imagen por URL o diagrama adjunto con pie de foto",
    category: "context",
    icon: ImageIcon,
    defaultWidth: 12,
    defaultConfig: {
      alignment: "center",
    },
    renderComponent: ImageBlock as any,
    configPanelComponent: ImageConfigPanel,
  },
  callout: {
    type: "callout",
    label: "Callout Destacado",
    description: "Aviso destacado con icono para conclusiones clave o notas",
    category: "context",
    icon: Layers,
    defaultWidth: 12,
    defaultConfig: {
      variant: "info",
      title: "Nota Ejecutiva",
      content: "",
    },
    renderComponent: CalloutBlock as any,
    configPanelComponent: CalloutConfigPanel,
  },
};
