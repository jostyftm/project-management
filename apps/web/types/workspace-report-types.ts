export type BlockType =
  | 'kpi_row'
  | 'project_summary'
  | 'narrative'
  | 'line_chart'
  | 'bar_chart'
  | 'donut_chart'
  | 'area_chart'
  | 'heatmap'
  | 'table'
  | 'work_items_list'
  | 'cycles_overview'
  | 'releases_timeline'
  | 'milestones_progress'
  | 'team_workload'
  | 'recent_activity'
  | 'risks_blockers'
  | 'divider'
  | 'image'
  | 'callout';

export type ReportVisibility = 'draft' | 'private' | 'workspace' | 'public';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ReportTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  shadow: string;
}

export const REPORT_THEMES: Record<string, ReportTheme> = {
  default_light: {
    primaryColor: '#6366f1',
    accentColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    surfaceColor: '#f8fafc',
    textColor: '#0f172a',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '16px',
    shadow: 'sm',
  },
  default_dark: {
    primaryColor: '#818cf8',
    accentColor: '#a78bfa',
    backgroundColor: '#18181b',
    surfaceColor: '#27272a',
    textColor: '#f4f4f5',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '16px',
    shadow: 'sm',
  },
  corporate_blue: {
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
    backgroundColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '8px',
    shadow: 'sm',
  },
  minimal_mono: {
    primaryColor: '#171717',
    accentColor: '#404040',
    backgroundColor: '#fafafa',
    surfaceColor: '#ffffff',
    textColor: '#171717',
    fontFamily: 'monospace',
    borderRadius: '4px',
    shadow: 'none',
  },
  warm_neutral: {
    primaryColor: '#d97706',
    accentColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    surfaceColor: '#ffffff',
    textColor: '#451a03',
    fontFamily: 'serif',
    borderRadius: '20px',
    shadow: 'md',
  },
};

export interface WorkspaceReport {
  id: string;
  title: string;
  description: string | null;
  visibility: ReportVisibility;
  theme: ReportTheme;
  layout_config: Record<string, unknown>;
  public_token: string | null;
  published_at: string | null;
  blocks_count?: number;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  blocks?: ReportBlock[];
}

export interface ReportBlock {
  id: string;
  report_id: string;
  type: BlockType;
  title: string | null;
  position: number;
  width: number; // 1-12
  config: Record<string, any>;
  is_visible: boolean;
  has_cache?: boolean;
  cached_at?: string | null;
  created_at?: string;
  updated_at?: string;
  data?: Record<string, any>;
}

export interface CreateReportPayload {
  title: string;
  description?: string;
  visibility?: ReportVisibility;
  theme?: Partial<ReportTheme>;
  layout_config?: Record<string, unknown>;
  template?: string;
}

export interface UpdateReportPayload {
  title?: string;
  description?: string;
  visibility?: ReportVisibility;
  theme?: Partial<ReportTheme>;
  layout_config?: Record<string, unknown>;
}

export interface CreateBlockPayload {
  type: BlockType;
  title?: string;
  position?: number;
  width?: number;
  config?: Record<string, any>;
  is_visible?: boolean;
}

export interface UpdateBlockPayload {
  title?: string;
  width?: number;
  config?: Record<string, any>;
  is_visible?: boolean;
}

export interface ReorderBlockItem {
  id: number | string;
  position: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  theme: string;
  category: string;
  blocks: Array<{
    type: BlockType;
    title: string;
    width: number;
    position: number;
    config?: Record<string, any>;
  }>;
}

export interface ReportSnapshot {
  id: string;
  report_id: string;
  title: string;
  blocks_snapshot: Array<ReportBlock>;
  theme_snapshot?: Partial<ReportTheme>;
  note?: string;
  blocks_count: number;
  created_at: string;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface CreateSnapshotPayload {
  title?: string;
  note?: string;
}
