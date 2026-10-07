export type DeliverableType =
  | "PREVIEW_URL"
  | "PULL_REQUEST"
  | "DESIGN"
  | "DOCUMENT"
  | "QA_EVIDENCE";

export type DeliverableStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface WorkItemDeliverable {
  id: number;
  workspace_id: number;
  project_id: number;
  work_item_id: number;
  created_by: number;
  title: string;
  type: DeliverableType;
  url: string | null;
  disk?: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_mime: string | null;
  file_url: string | null;
  description: string | null;
  status: DeliverableStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  reviewer?: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
}

export interface WorkItemDodItem {
  id: number;
  work_item_id: number;
  title: string;
  is_completed: boolean;
  completed_by?: {
    id: number;
    name: string;
  } | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliverablesResponse {
  deliverables: WorkItemDeliverable[];
  dod_items: WorkItemDodItem[];
}
