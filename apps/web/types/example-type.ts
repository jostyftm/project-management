export interface ExampleType {
  id: string;
  type: string;
  attributes: {
    source_name: string;
    webhook_url: string;
    format_date: string; // "Y-m-d" | "d/m/Y" | "m/d/Y
    avatar: string;
    created_at: string;
    updated_at: string;
  };
}


