export interface User {
  id: number | string;
  name: string;
  email: string;
  avatar_url?: string | null;
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

export interface CycleAnalytics {
  cycle_id: string | number;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  metrics: {
    total_items: number;
    completed_items: number;
    incomplete_items: number;
    completion_rate: number;
    total_points: number;
    completed_points: number;
  };
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

export interface Project {
  id: string | number;
  name: string;
  identifier: string;
  description?: string | null;
  icon?: string | null;
  is_archived?: boolean;
  is_public?: boolean;
  estimate_system?: 'FIBONACCI' | 'TSHIRT' | 'NUMERIC' | 'NONE';
  states?: State[];
  labels?: Label[];
  work_items_count?: number;
  members_count?: number;
}

export interface WorkItem {
  id: string | number;
  sequence_id: number;
  identifier: string; // e.g. PLN-1
  title: string;
  description_json?: any;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  estimate_points?: number | null;
  estimate_value?: string | null; // e.g. "5" or "M"
  start_date?: string | null;
  target_date?: string | null;
  is_draft?: boolean;
  created_at?: string;
  updated_at?: string;
  state?: State;
  type?: WorkItemType;
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
    state?: { id: string | number; name: string; color: string; group: string };
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
}
