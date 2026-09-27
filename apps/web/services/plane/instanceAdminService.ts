import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";

export interface InstanceSettings {
  id?: number;
  instance_name: string;
  company_name?: string;
  app_url?: string;
  allow_signups: boolean;
  invite_only: boolean;
  allowed_domains?: string[];
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  smtp_encryption?: "tls" | "ssl" | "none";
  max_upload_size_mb: number;
  enable_telemetry: boolean;
}

export interface SystemHealthData {
  status: "healthy" | "warning" | "degraded";
  components: {
    database: {
      status: string;
      driver: string;
      latency_ms: number;
    };
    cache: {
      status: string;
      driver: string;
    };
    storage: {
      disk_free_gb: number;
      disk_total_gb: number;
      disk_used_percent: number;
    };
  };
  system: {
    php_version: string;
    laravel_version: string;
    memory_usage_mb: number;
    server_time: string;
    environment: string;
  };
  statistics: {
    users_count: number;
    workspaces_count: number;
    projects_count: number;
    work_items_count: number;
  };
}

export interface InstanceUser {
  id: number;
  name: string;
  email: string;
  is_instance_admin: boolean;
  workspaces_count: number;
  created_at: string;
}

export interface PaginatedUsersResponse {
  data: InstanceUser[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export const instanceAdminService = {
  getSettings: async (): Promise<InstanceSettings> => {
    const res = await httpRequestService<{ data: InstanceSettings }>({
      url: `${API_BASE_URL}/instance-admin/settings`,
      method: "GET",
    });

    return res.data;
  },

  updateSettings: async (payload: Partial<InstanceSettings>): Promise<InstanceSettings> => {
    const res = await httpRequestService<{ data: InstanceSettings; message: string }>({
      url: `${API_BASE_URL}/instance-admin/settings`,
      method: "PUT",
      data: payload,
    });

    return res.data;
  },

  getHealth: async (): Promise<SystemHealthData> => {
    const res = await httpRequestService<{ data: SystemHealthData }>({
      url: `${API_BASE_URL}/instance-admin/health`,
      method: "GET",
    });

    return res.data;
  },

  getUsers: async (page = 1, perPage = 25): Promise<PaginatedUsersResponse> => {
    const res = await httpRequestService<PaginatedUsersResponse>({
      url: `${API_BASE_URL}/instance-admin/users?page=${page}&per_page=${perPage}`,
      method: "GET",
    });

    return res;
  },

  toggleUserAdmin: async (userId: number | string, isInstanceAdmin: boolean): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/instance-admin/users/${userId}/admin-status`,
      method: "PUT",
      data: { is_instance_admin: isInstanceAdmin },
    });
  },

  testEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    const res = await httpRequestService<{ success: boolean; message: string }>({
      url: `${API_BASE_URL}/instance-admin/test-email`,
      method: "POST",
      data: { email },
    });

    return res;
  },
};
