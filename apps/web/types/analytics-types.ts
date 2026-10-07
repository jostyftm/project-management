export type KpiPeriod = "7d" | "14d" | "30d" | "90d" | "all";

export type ProjectHealthStatus = "on_track" | "at_risk" | "off_track";

export type LoadStatus = "optimal" | "heavy" | "overloaded";

export interface ProjectKpiOverview {
  summary: {
    total_items: number;
    completed_items: number;
    in_progress_wip: number;
    unstarted_items: number;
    cancelled_items: number;
    completion_percentage: number;
    total_estimate_points: number;
    completed_estimate_points: number;
    health_status: ProjectHealthStatus;
  };
  speed_and_throughput: {
    velocity_14d_items: number;
    velocity_14d_points: number;
    throughput_period_items: number;
    throughput_period_points: number;
    avg_cycle_time_days: number;
    p85_cycle_time_days: number;
    avg_lead_time_days: number;
  };
  delivery_and_quality: {
    on_time_delivery_rate: number;
    items_with_target_date: number;
    items_completed_on_time: number;
    overdue_active_items: number;
    defect_density_rate: number;
    total_bugs: number;
    resolved_bugs: number;
  };
}

export interface VelocityTrendCycle {
  cycle_id: number;
  cycle_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  committed_points: number;
  completed_points: number;
  committed_count: number;
  completed_count: number;
  completion_rate_points: number;
}

export interface CycleTimeScatterItem {
  id: number;
  sequence_id: number;
  title: string;
  priority: string;
  type: string;
  estimate_points: number | null;
  days: number;
  completed_at: string;
}

export interface CycleTimeBucket {
  range: string;
  count: number;
}

export interface CycleTimeStats {
  percentiles: {
    p50: number;
    p85: number;
    p95: number;
    average: number;
    total_completed_analyzed: number;
  };
  histogram_buckets: CycleTimeBucket[];
  scatter_samples: CycleTimeScatterItem[];
}

export interface TeamMemberKpi {
  user_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  project_role: string;
  assigned_total: number;
  active_wip: number;
  open_items_count: number;
  completed_in_period: number;
  completed_points: number;
  avg_cycle_time_days: number;
  on_time_delivery_rate: number;
  overdue_active_count: number;
  bugs_resolved_count: number;
  load_status: LoadStatus;
  load_percentage: number;
}

export interface MemberKpiDetail {
  member: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  stats: {
    total_assigned: number;
    active_wip: number;
    completed_total: number;
    completed_points: number;
  };
  type_distribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  weekly_throughput: {
    week_label: string;
    items_count: number;
    points_count: number;
  }[];
  active_items: {
    id: number;
    sequence_id: number;
    title: string;
    state_name: string;
    state_group: string;
    priority: string;
    target_date: string | null;
    is_overdue: boolean;
  }[];
}
