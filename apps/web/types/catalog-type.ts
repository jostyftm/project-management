export type LaravelDriverCode = "mysql" | "pgsql" | "oracle";

export interface DatabaseDriver {
  type: string;
  id: number;
  attributes: {
    name: string;
    laravel_driver: LaravelDriverCode;
    icon_svg: string | null;
    color: string | null;
  };
}

export type FileFormatCode = "xlsx" | "csv" | "pdf" | "txt" | "docx";

export interface FileFormat {
  type: string;
  id: number;
  attributes: {
    name: string;
    code: FileFormatCode;
    icon: string | null;
    color: string | null;
  };
}

export type DestinationTypeCode = "ftp" | "email" | "local";

export interface DestinationType {
  type: string;
  id: number;
  attributes: {
    name: string;
    code: DestinationTypeCode;
    icon: string | null;
    color: string | null;
  };
}
