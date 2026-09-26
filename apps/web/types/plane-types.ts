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

export interface Project {
  id: string | number;
  name: string;
  identifier: string;
  description?: string | null;
  icon?: string | null;
  is_archived?: boolean;
  is_public?: boolean;
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
  start_date?: string | null;
  target_date?: string | null;
  is_draft?: boolean;
  created_at?: string;
  updated_at?: string;
  state?: State;
  project?: {
    id: string | number;
    name: string;
    identifier: string;
  };
  creator?: User;
  assignees?: User[];
  labels?: Label[];
}
