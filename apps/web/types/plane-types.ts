import { WorkItemDeliverable } from "./deliverable-types";

export interface User {
  id: number | string;
  name: string;
  email: string;
  avatar_url?: string | null;
  is_instance_admin?: boolean;
}

export interface Workspace {
  id: string | number;
  name: string;
  slug: string;
  logo_url?: string | null;
  owner_id?: number | string;
  created_at?: string;
  updated_at?: string;
  members_count?: number;
  projects_count?: number;
}

export interface WorkspaceMember {
  id: string | number;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  joined_at?: string;
  user: User;
}

export interface State {
  id: string | number;
  name: string;
  color: string;
  group: 'BACKLOG' | 'UNSTARTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  sequence: number;
  is_default?: boolean;
  wip_limit?: number | null;
}

export interface Label {
  id: string | number;
  name: string;
  color: string;
  description?: string | null;
}

export interface WorkItemType {
  id: string | number;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  is_default?: boolean;
  is_global?: boolean;
}

export interface Cycle {
  id: string | number;
  name: string;
  description?: string | null;
  sprint_goal?: string | null;
  capacity_points?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: 'DRAFT' | 'UPCOMING' | 'CURRENT' | 'COMPLETED';
  total_items?: number;
  completed_items?: number;
  created_at?: string;
  updated_at?: string;
  owner?: User;
  work_items?: WorkItem[];
}

export interface CycleDayData {
  date: string; // e.g. "Sep 21"
  full_date: string; // e.g. "2026-09-21"
  scope: number;
  pending: number;
  started: number;
  completed: number;
  ideal_pending: number;
  ideal_completed: number;
  added_today?: number;
  modified_today?: number;
}

export interface CycleScopeBreakdown {
  initial_planned_count: number;
  added_mid_cycle_count: number;
  modified_count: number;
  unresolved_count: number;
  transferred_count: number;
  completed_count: number;
  added_points?: number;
}

export interface CycleImpactAnalysis {
  scope_impact: string;
  ideal_impact: string;
  burndown_impact: string;
  burnup_impact: string;
}

export interface CycleClassifiedItem {
  id: string | number;
  sequence_id: number;
  identifier: string;
  title: string;
  priority: string;
  estimate_points?: number | null;
  estimate_value?: string | null;
  state?: {
    id: string | number;
    name: string;
    color: string;
    group: string;
  };
  type?: {
    id: string | number;
    name: string;
    color: string;
  };
  assignees?: {
    id: string | number;
    name: string;
    email: string;
  }[];
  is_added_mid_cycle: boolean;
  added_at?: string;
  is_modified: boolean;
  is_unresolved: boolean;
  is_transferred: boolean;
  status_at_completion?: string | null;
  deliverables_count?: number;
  approved_deliverables_count?: number;
  deliverables?: any[];
  dod_items_count?: number;
  completed_dod_items_count?: number;
}

export interface CycleBreakdown {
  scope: number;
  pending: number;
  started: number;
  done: number;
  unstarted: number;
  backlog: number;
  cancelled: number;
  today_ideal_pending: number;
  trailing_count: number;
}

export interface CycleAnalytics {
  cycle_id: string | number;
  name: string;
  description?: string | null;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  today_index?: number;
  today_date?: string;
  progress_percentage?: number;
  metrics: {
    total_items: number;
    completed_items: number;
    incomplete_items: number;
    completion_rate: number;
    total_points: number;
    completed_points: number;
  };
  breakdown?: CycleBreakdown;
  scope_breakdown?: CycleScopeBreakdown;
  impact_analysis?: CycleImpactAnalysis;
  timeline?: {
    dates: string[];
    work_items: CycleDayData[];
    estimates: CycleDayData[];
  };
  work_items?: CycleClassifiedItem[];
}

export interface Module {
  id: string | number;
  name: string;
  description?: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  start_date?: string | null;
  target_date?: string | null;
  total_items?: number;
  completed_items?: number;
  progress_percentage?: number;
  lead?: User;
  work_items?: WorkItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ModuleProgress {
  module_id: string | number;
  name: string;
  status: string;
  total_items: number;
  completed_items: number;
  progress_percentage: number;
  breakdown: {
    backlog: number;
    unstarted: number;
    started: number;
    completed: number;
    cancelled: number;
  };
}

export interface WorkItemRelation {
  id: string | number;
  source_id: string | number;
  target_id: string | number;
  relation_type: 'BLOCKS' | 'BLOCKED_BY' | 'RELATES_TO' | 'DUPLICATE_OF';
  target?: {
    id: string | number;
    title: string;
    identifier: string;
    state?: { name: string; color: string };
  };
  source?: {
    id: string | number;
    title: string;
    identifier: string;
  };
}

export interface SavedView {
  id: string | number;
  name: string;
  description?: string | null;
  filters?: {
    priority?: string;
    type_id?: string;
    search?: string;
    [key: string]: any;
  };
  display_filters?: {
    layout?: 'kanban' | 'list' | 'calendar' | 'gantt';
    group_by?: 'state' | 'priority';
    [key: string]: any;
  };
  project_id?: string | number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string | number;
  name: string;
  identifier: string;
  description?: string | null;
  icon?: string | null;
  is_archived?: boolean;
  is_public?: boolean;
  estimate_system?: 'FIBONACCI' | 'TSHIRT' | 'NUMERIC' | 'NONE';
  start_date?: string | null;
  target_date?: string | null;
  aging_threshold_days?: number;
  auto_rollup_parent?: boolean;
  require_evidence_to_complete?: boolean;
  states?: State[];
  labels?: Label[];
  work_items_count?: number;
  completed_work_items_count?: number;
  overdue_items_count?: number;
  members_count?: number;
  current_user_role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface WorkItem {
  id: string | number;
  sequence_id: number;
  identifier: string; // e.g. PLN-1
  title: string;
  description_html?: string | null;
  description?: string | null;
  description_json?: any;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  sort_order?: number;
  estimate_points?: number | null;
  estimate_value?: string | null; // e.g. "5" or "M"
  start_date?: string | null;
  target_date?: string | null;
  completed_at?: string | null;
  state_changed_at?: string | null;
  age_in_state_days?: number;
  is_draft?: boolean;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  readiness?: {
    is_ready: boolean;
    missing: string[];
    reasons?: string[];
  };
  created_at?: string;
  updated_at?: string;
  state_id?: string | number;
  state?: State;
  type?: WorkItemType;
  lead_id?: string | number | null;
  lead?: User | null;
  milestone_id?: string | number | null;
  milestone?: {
    id: string | number;
    title: string;
    status?: string;
  } | null;
  project?: {
    id: string | number;
    name: string;
    identifier: string;
  };
  creator?: User;
  assignees?: User[];
  labels?: Label[];
  parent?: {
    data?: { id: string | number };
  };
  sub_items?: {
    id: string | number;
    identifier: string;
    title: string;
    priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    start_date?: string | null;
    target_date?: string | null;
    state_id?: string | number;
    state?: { id: string | number; name: string; color: string; group: string };
    lead_id?: string | number | null;
    lead?: { id: string | number; name: string; email?: string } | null;
    assignees?: { id: string | number; name: string; email?: string }[];
  }[];
  cycles?: {
    id: string | number;
    name: string;
    status: string;
  }[];
  modules?: {
    id: string | number;
    name: string;
    status: string;
  }[];
  outward_relations?: WorkItemRelation[];
  inward_relations?: WorkItemRelation[];
  deliverables?: WorkItemDeliverable[];
  deliverables_count?: number;
  approved_deliverables_count?: number;
  dod_items?: any[];
  dod_items_count?: number;
  completed_dod_items_count?: number;
}

export type DocBlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet_list'
  | 'numbered_list'
  | 'todo'
  | 'callout'
  | 'code'
  | 'table'
  | 'quote'
  | 'divider';

export interface DocBlock {
  id: string;
  type: DocBlockType;
  content: string;
  checked?: boolean;
  calloutTone?: 'info' | 'warning' | 'success';
  language?: string;
  tableData?: string[][];
}

export interface DocPage {
  id: string | number;
  title: string;
  content_json: DocBlock[];
  is_published: boolean;
  is_locked: boolean;
  access: 'PUBLIC' | 'WORKSPACE' | 'PRIVATE';
  icon?: string | null;
  color?: string | null;
  order?: number;
  views_count?: number;
  parent_id?: string | number | null;
  project_id?: string | number | null;
  created_by?: number | string | null;
  project?: {
    id: string | number;
    name: string;
    identifier: string;
    current_user_role?: 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
  };
  creator?: User;
  last_editor?: User;
  created_at?: string;
  updated_at?: string;
  children?: DocPage[];
}

export interface PageTreeNode {
  id: string | number;
  title: string;
  icon?: string | null;
  color?: string | null;
  is_published: boolean;
  is_locked: boolean;
  parent_id?: string | number | null;
  project_id?: string | number | null;
  order?: number;
  children?: PageTreeNode[];
}

export interface PageAnalytics {
  page_id: string | number;
  title: string;
  total_views: number;
  unique_viewers: number;
  word_count: number;
  character_count: number;
  block_count: number;
  reading_time_minutes: number;
  created_at?: string;
  updated_at?: string;
  creator?: User | null;
  last_editor?: User | null;
  recent_views?: {
    user: User | null;
    viewed_at: string;
  }[];
}

export interface Initiative {
  id: string | number;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'ACHIEVED' | 'CANCELLED';
  projects?: { id: string | number; name: string; identifier: string }[];
  creator?: User;
  metrics?: {
    total_projects: number;
    total_work_items: number;
    completed_work_items: number;
    progress_percentage: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface Teamspace {
  id: string | number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  projects?: { id: string | number; name: string; identifier: string }[];
  creator?: User;
  created_at?: string;
  updated_at?: string;
}

export interface Milestone {
  id: string | number;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'DELAYED';
  completed_at?: string | null;
  total_work_items?: number;
  completed_work_items?: number;
  progress_percentage?: number;
  project?: { id: string | number; name: string; identifier: string };
  work_items?: WorkItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Release {
  id: string | number;
  name: string;
  version: string;
  description?: string | null;
  changelog?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  published_at?: string | null;
  project?: { id: string | number; name: string; identifier: string };
  creator?: User;
  work_items?: WorkItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Sticky {
  id: string | number;
  content: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  is_pinned: boolean;
  is_private: boolean;
  position_x: number;
  position_y: number;
  is_owner?: boolean;
  creator?: User;
  created_at?: string;
  updated_at?: string;
}

export interface CommentAttachment {
  name: string;
  original_name?: string;
  url: string;
  size?: number;
  mime?: string;
}

export interface Comment {
  id: string | number;
  workspace_id: string | number;
  project_id?: string | number | null;
  work_item_id?: string | number | null;
  page_id?: string | number | null;
  user_id: string | number;
  content: string;
  type?: 'COMMENT' | 'WORK_LOG';
  is_work_log?: boolean;
  attachments?: CommentAttachment[];
  mentioned_user_ids?: (string | number)[];
  created_at: string;
  updated_at?: string;
  user?: User;
}

export interface Notification {
  id: string | number;
  workspace_id: string | number;
  recipient_id: string | number;
  actor_id?: string | number | null;
  type: 'MENTION' | 'ASSIGNMENT' | 'STATUS_CHANGE' | 'COMMENT' | string;
  entity_type: 'WORK_ITEM' | 'PAGE' | 'RELEASE' | string;
  entity_id: string | number;
  title: string;
  message: string;
  target_url?: string | null;
  is_read: boolean;
  created_at: string;
  actor?: User;
}

export interface Activity {
  id: string | number;
  workspace_id: string | number;
  project_id?: string | number | null;
  actor_id?: string | number | null;
  entity_type: string;
  entity_id: string | number;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'STATE_CHANGED' | 'ASSIGNED' | 'COMMENTED' | string;
  changes_diff?: Record<string, any> | null;
  created_at: string;
  actor?: User;
}

export interface Webhook {
  id: string | number;
  workspace_id: string | number;
  url: string;
  secret_token?: string | null;
  events_subscribed: string[];
  is_active: boolean;
  created_at: string;
}

// ----------------------------------------------------------------------
// Phase 7: GitHub Multi-Repo, Integrations & Automations Types
// ----------------------------------------------------------------------

export interface WorkspaceDiscoveredRepo {
  id: number;
  name: string;
  full_name: string;
  repo_url?: string;
  default_branch: string;
  is_private?: boolean;
  description?: string;
}

export interface WorkspaceGitHubIntegration {
  connected: boolean;
  id?: number;
  org_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  repositories_count?: number;
  available_repositories?: WorkspaceDiscoveredRepo[];
  unlinked_repositories?: WorkspaceDiscoveredRepo[];
  repositories?: WorkspaceDiscoveredRepo[];
  last_sync_at?: string | null;
}

export interface ProjectGithubRepository {
  id: number;
  project_id?: number;
  repo_full_name: string;
  label?: string | null;
  repo_url?: string | null;
  default_branch?: string | null;
  webhook_url?: string;
  webhook_secret?: string;
  is_active: boolean;
  pull_requests_count?: number;
  commits_count?: number;
  created_at?: string;
}

export interface ProjectGithubSettings {
  id?: number;
  project_id: number;
  auto_start_on_pr: boolean;
  auto_complete_on_pr_merge: boolean;
  require_all_prs_merged: boolean;
  auto_move_on_pr_opened?: boolean;
  auto_close_on_pr_merged?: boolean;
  preview_deployment_enabled?: boolean;
  default_branch?: string;
  started_state_id?: number | null;
  completed_state_id?: number | null;
}

export interface GithubPullRequest {
  id: number;
  work_item_id: number;
  project_github_repo_id?: number | null;
  repository_name: string;
  repository_label?: string | null;
  pr_number: number;
  title: string;
  state: 'open' | 'closed' | 'merged' | 'draft' | string;
  is_merged: boolean;
  preview_url?: string | null;
  head_branch?: string | null;
  base_branch?: string | null;
  html_url: string;
  author_username?: string | null;
  author_avatar_url?: string | null;
  merged_at?: string | null;
  created_at?: string;
}

export interface GithubCommit {
  id: number;
  work_item_id: number;
  repository_label?: string | null;
  sha: string;
  message: string;
  author_name?: string | null;
  html_url?: string | null;
  committed_at?: string | null;
}

export interface WorkItemGitHubData {
  work_item_id: number;
  identifier: string;
  title: string;
  available_repositories: {
    id: number;
    repo_full_name: string;
    label: string;
    default_branch?: string | null;
    url?: string | null;
  }[];
  pull_requests: GithubPullRequest[];
  commits: GithubCommit[];
  summary: {
    total_prs: number;
    open_prs: number;
    merged_prs: number;
    preview_urls: string[];
  };
}

export interface Integration {
  id: number;
  workspace_id: number;
  project_id?: number | null;
  provider: 'SLACK' | 'GITHUB' | 'CUSTOM' | string;
  name: string;
  config: Record<string, any>;
  events_subscribed?: string[];
  is_active: boolean;
  last_sync_at?: string | null;
  created_at?: string;
}

export interface RecurringWorkItem {
  id: number;
  workspace_id: number;
  project_id: number;
  work_item_template: {
    title: string;
    description?: string;
    priority?: string;
    state_id?: number;
    type_id?: number;
    estimate_points?: number;
    lead_id?: number;
  };
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  cron_expression?: string;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at?: string;
  creator?: User;
}

export interface AutomationRule {
  id: number;
  workspace_id: number;
  project_id: number;
  name: string;
  trigger_event: string;
  trigger_conditions?: Record<string, any> | null;
  actions: Record<string, any>;
  is_active: boolean;
  last_executed_at?: string | null;
  created_at?: string;
}

export interface CsvPreviewData {
  headers: string[];
  sample_rows: Record<string, string>[];
  total_rows: number;
  delimiter: string;
  suggested_mapping: Record<string, string>;
}

export interface CsvImportResult {
  success: boolean;
  imported_count: number;
  errors: string[];
}

export interface ProjectMember {
  id: string | number;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  capacity_points?: number | null;
  joined_at?: string;
  user: User;
}

export interface DefinitionOfReady {
  is_ready: boolean;
  missing: string[];
  reasons?: string[];
}

export interface SprintPlanningMember {
  user: User;
  role: string;
  capacity_points: number;
  assigned_points: number;
  assigned_items_count: number;
  load_percentage: number;
  status: 'optimal' | 'high' | 'overloaded';
}

export interface SprintPlanningCapacity {
  effective: number;
  effective_capacity?: number;
  committed: number;
  completed: number;
  remaining: number;
  utilization_pct: number;
  members_sum_capacity?: number;
  status: 'healthy' | 'at_risk' | 'overloaded';
}

export interface SprintPlanningVelocity {
  rolling_average: number;
  recent_cycles_count: number;
  history: {
    cycle_id: number | string;
    cycle_name: string;
    completed_points: number;
    committed_points: number;
    status: string;
  }[];
}

export interface SprintPlanningItem {
  id: string | number;
  sequence_id: number;
  identifier: string;
  title: string;
  estimate_points?: number | null;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  sort_order?: number;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  state?: {
    id: string | number;
    name: string;
    color: string;
    group: string;
  } | null;
  assignees?: { id: string | number; name: string }[];
  dor: DefinitionOfReady;
}

export interface SprintPlanning {
  cycle: Cycle;
  cycle_id: string | number;
  cycle_name: string;
  sprint_goal?: string | null;
  velocity: SprintPlanningVelocity;
  capacity: SprintPlanningCapacity;
  members: SprintPlanningMember[];
  not_ready_items: {
    id: string | number;
    identifier: string;
    title: string;
    missing: string[];
  }[];
  suggestions: {
    id: string | number;
    identifier: string;
    title: string;
    estimate_points: number;
    priority: string;
  }[];
  backlog?: SprintPlanningItem[];
  sprint_items?: SprintPlanningItem[];
}

export interface DailyStandupMemberWork {
  items: {
    id: string | number;
    identifier: string;
    title: string;
    priority?: string;
    state?: { name: string; color: string; group: string } | null;
    days_in_state?: number;
    is_aging?: boolean;
  }[];
  commits?: {
    hash: string;
    message: string;
    author_name?: string;
    committed_at?: string;
  }[];
}

export interface DailyStandupMemberBlocker {
  id: string | number;
  identifier: string;
  title: string;
  is_blocked: boolean;
  blocked_reason: string;
  blocked_at?: string | null;
}

export interface DailyStandupMember {
  user: User;
  role: string;
  yesterday: DailyStandupMemberWork;
  today: DailyStandupMemberWork;
  blockers: {
    items: DailyStandupMemberBlocker[];
  };
}

export interface DailyStandup {
  date: string;
  project: {
    id: string | number;
    name: string;
    identifier: string;
  };
  cycle?: {
    id: string | number;
    name: string;
    sprint_goal?: string | null;
  } | null;
  summary: {
    total_members: number;
    total_blockers: number;
    aging_items_count: number;
  };
  members: DailyStandupMember[];
}

export interface DailyStandupDayBreakdown {
  date: string;
  has_worked: boolean;
  completed_items: { id: string; identifier: string; title: string }[];
  evidences: { id: string; preview: string; attachments: CommentAttachment[] }[];
  deliverables: { id: string; title: string; type: string }[];
  commits: { message: string; hash: string; item_identifier: string }[];
  advances_count: number;
}

export interface DailyStandupRangeMember {
  user: User;
  role: string;
  days_worked_count: number;
  working_days_worked: number;
  participation_rate: number;
  worked_dates: string[];
  tasks_completed_count: number;
  activities_count: number;
  commits_count: number;
  evidences_count: number;
  daily_breakdown: DailyStandupDayBreakdown[];
}

export interface DailyStandupDaySummary {
  date: string;
  day_of_week: string;
  is_working_day: boolean;
  active_members_count: number;
  members: {
    user: { id: string; name: string; email: string };
    role: string;
    completed_count: number;
    commits_count: number;
    deliverables_count: number;
    evidences_count: number;
  }[];
}

export interface DailyStandupRangeReport {
  start_date: string;
  end_date: string;
  total_calendar_days: number;
  total_working_days: number;
  project: {
    id: string;
    name: string;
    identifier: string;
    require_evidence_to_complete: boolean;
  };
  cycle?: {
    id: string;
    name: string;
    sprint_goal?: string | null;
  } | null;
  summary: {
    total_members: number;
    active_members: number;
    total_tasks_completed: number;
    total_activities: number;
    total_commits: number;
    total_evidences: number;
  };
  members: DailyStandupRangeMember[];
  days: DailyStandupDaySummary[];
}




