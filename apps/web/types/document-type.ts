export type PageSize = "a4" | "a5" | "letter" | "legal";
export type PageOrientation = "portrait" | "landscape";

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageHeader {
  enabled: boolean;
  text: string;
  alignment: "left" | "center" | "right";
}

export interface PageFooter {
  enabled: boolean;
  showPageNumber: boolean;
  text: string;
}

export interface PageSettings {
  size: PageSize;
  orientation: PageOrientation;
  margins: PageMargins;
  header?: PageHeader;
  footer?: PageFooter;
}

export interface TextBlockStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  fontSize?: number;
}

export interface TextBlock {
  id: string;
  type: "text";
  tag: "h1" | "h2" | "h3" | "h4" | "p" | "quote";
  content: string;
  styles?: TextBlockStyles;
}

export interface ImageBlock {
  id: string;
  type: "image";
  url: string;
  path?: string;
  filename?: string;
  size?: number;
  widthPercent?: number; // 25, 50, 75, 100
  align?: "left" | "center" | "right";
  caption?: string;
}

export interface TableColumnMapping {
  original_column: string;
  display_name: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartBlock {
  id: string;
  type: "chart";
  chartType: "bar" | "line" | "pie";
  title: string;
  dataSource: "manual" | "report";
  reportId?: number | null;
  xAxisKey?: string;
  yAxisKey?: string;
  data: ChartDataPoint[];
  chartImage?: string | null;
}

export interface TableBlock {
  id: string;
  type: "table";
  dataSource: "manual" | "report";
  reportId?: number | null;
  headers: string[];
  rows: string[][];
  maxRows?: number;
  columnMappings?: TableColumnMapping[];
  striped?: boolean;
  bordered?: boolean;
}

export interface DividerBlock {
  id: string;
  type: "divider";
}

export interface PageBreakBlock {
  id: string;
  type: "page_break";
}

export type DocumentBlock =
  | TextBlock
  | ImageBlock
  | ChartBlock
  | TableBlock
  | DividerBlock
  | PageBreakBlock;

export interface DocumentColumn {
  id: string;
  widthPercent: number; // e.g. 100, 50, 33.33, 70, 30, 25
  blocks: DocumentBlock[];
}

export interface DocumentRow {
  id: string;
  columns: DocumentColumn[];
}

export interface DocumentContent {
  rows: DocumentRow[];
}

export interface DocumentSchema {
  id?: number;
  name: string;
  description?: string;
  category_id?: number | null;
  user_id?: number | null;
  page_settings: PageSettings;
  content: DocumentContent;
}

export interface DocumentItem {
  id: number;
  type?: string;
  attributes: {
    name: string;
    description: string | null;
    category_id: number | null;
    user_id?: number | null;
    page_settings: PageSettings;
    content: DocumentContent;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    category?: {
      id: number;
      name: string;
    } | null;
    user?: {
      id: number;
      user_auth_id?: number | null;
      name: string;
      email: string;
    } | null;
  };
}
