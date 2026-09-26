import { Report } from "@/types/report-type";

export interface UserAttributes {
  user_auth_id: number | null;
  name: string;
  email: string;
  reports_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserRelationships {
  reports?: Report[];
}

export interface UserItem {
  id: string | number;
  type: string;
  attributes: UserAttributes;
  relationships?: UserRelationships;
}

export interface UserUpdateFormValues {
  name: string;
  email: string;
  report_ids?: number[];
}

export interface AssignReportsFormValues {
  report_ids: number[];
}
