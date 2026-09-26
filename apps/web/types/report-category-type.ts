export interface ReportCategory {
  type: string;
  id: number;
  attributes: {
    name: string;
    created_at: string;
    updated_at: string;
  };
  relationships: {
    parent_id: number | null;
    parent: ReportCategory | null;
    children_count: number;
  };
}