export interface DownloadType {
  type: string;
  id: string | number;
  attributes: {
    file_name: string;
    file_path: string;
    file_type: string;
    disk: string;
    type: string;
    status_code: string | number;
    status_display_name: string;
    created_at: string;
    updated_at: string;
  };
  relationships?: Record<string, any>;
}

export type FilterDownloadType = Partial<
  Record<"file_name" | "file_type", string>
>;

export interface PrepareDownloadPayload {
  file_name: string;
  file_path: string;
  file_type: string;
  type: string;
  disk: string;
  bucket_name: string;
}
