import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import {
  ProjectGithubRepository,
  ProjectGithubSettings,
  WorkItemGitHubData,
  WorkspaceGitHubIntegration,
} from "@/types/plane-types";

export interface ProjectGitHubResponse {
  repositories: ProjectGithubRepository[];
  settings: ProjectGithubSettings;
  workspace_github?: WorkspaceGitHubIntegration;
}

export interface VerifyGitHubResponse {
  valid: boolean;
  user: {
    login: string;
    name: string;
    avatar_url: string;
  };
  organizations: Array<{
    login: string;
    avatar_url: string;
    description: string;
  }>;
}

export const githubService = {
  // Workspace GitHub Integration
  getWorkspaceGitHub: async (workspaceId: string | number): Promise<WorkspaceGitHubIntegration> => {
    return await httpRequestService<WorkspaceGitHubIntegration>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/integrations/github`,
      method: "GET",
    });
  },

  verifyWorkspaceGitHub: async (
    workspaceId: string | number,
    accessToken: string
  ): Promise<VerifyGitHubResponse> => {
    return await httpRequestService<VerifyGitHubResponse>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/integrations/github/verify`,
      method: "POST",
      data: { access_token: accessToken },
    });
  },

  connectWorkspaceGitHub: async (
    workspaceId: string | number,
    payload: {
      org_name?: string;
      access_token?: string;
      account_type?: string;
      auth_method?: string;
      app_id?: string;
      installation_id?: string;
    }
  ): Promise<{ message: string; integration: WorkspaceGitHubIntegration }> => {
    return await httpRequestService<{ message: string; integration: WorkspaceGitHubIntegration }>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/integrations/github/connect`,
      method: "POST",
      data: payload,
    });
  },

  syncWorkspaceGitHub: async (
    workspaceId: string | number
  ): Promise<{ message: string; repositories_count: number; repositories: any[]; last_sync_at: string }> => {
    return await httpRequestService<{ message: string; repositories_count: number; repositories: any[]; last_sync_at: string }>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/integrations/github/sync`,
      method: "POST",
    });
  },

  disconnectWorkspaceGitHub: async (workspaceId: string | number): Promise<{ message: string }> => {
    return await httpRequestService<{ message: string }>({
      url: `${API_BASE_URL}/workspaces/${workspaceId}/integrations/github`,
      method: "DELETE",
    });
  },

  // Project GitHub Integration
  getProjectGitHub: async (projectId: string | number): Promise<ProjectGitHubResponse> => {
    return await httpRequestService<ProjectGitHubResponse>({
      url: `${API_BASE_URL}/projects/${projectId}/github`,
      method: "GET",
    });
  },

  getBranches: async (
    projectId: string | number,
    repoFullName: string
  ): Promise<string[]> => {
    const res = await httpRequestService<{ branches: string[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/github/branches?repo_full_name=${encodeURIComponent(repoFullName)}`,
      method: "GET",
    });
    return res.branches || ["main", "master"];
  },

  createBranch: async (
    projectId: string | number,
    payload: {
      repo_full_name: string;
      branch_name: string;
      base_branch?: string;
      work_item_id?: string | number;
    }
  ): Promise<{
    message: string;
    branch: string;
    repo_full_name: string;
    base_branch: string;
    sha: string;
    html_url: string;
    work_item_updated: boolean;
    new_state?: string | null;
  }> => {
    return await httpRequestService({
      url: `${API_BASE_URL}/projects/${projectId}/github/branches`,
      method: "POST",
      data: payload,
    });
  },

  addRepository: async (
    projectId: string | number,
    payload:
      | { repo_full_name: string; label?: string; repo_url?: string; default_branch?: string }
      | { repositories: Array<{ repo_full_name: string; label?: string; repo_url?: string; default_branch?: string }> }
  ): Promise<{ message: string; repository?: ProjectGithubRepository; repositories?: ProjectGithubRepository[] }> => {
    return await httpRequestService<{ message: string; repository?: ProjectGithubRepository; repositories?: ProjectGithubRepository[] }>({
      url: `${API_BASE_URL}/projects/${projectId}/github/repositories`,
      method: "POST",
      data: payload,
    });
  },

  updateRepository: async (
    projectId: string | number,
    repoId: number,
    payload: { label?: string; default_branch?: string; is_active?: boolean }
  ): Promise<{ message: string; repository: ProjectGithubRepository }> => {
    return await httpRequestService<{ message: string; repository: ProjectGithubRepository }>({
      url: `${API_BASE_URL}/projects/${projectId}/github/repositories/${repoId}`,
      method: "PUT",
      data: payload,
    });
  },

  removeRepository: async (projectId: string | number, repoId: number): Promise<{ message: string }> => {
    return await httpRequestService<{ message: string }>({
      url: `${API_BASE_URL}/projects/${projectId}/github/repositories/${repoId}`,
      method: "DELETE",
    });
  },

  updateSettings: async (
    projectId: string | number,
    settings: Partial<ProjectGithubSettings>
  ): Promise<{ message: string; settings: ProjectGithubSettings }> => {
    return await httpRequestService<{ message: string; settings: ProjectGithubSettings }>({
      url: `${API_BASE_URL}/projects/${projectId}/github/settings`,
      method: "PUT",
      data: settings,
    });
  },

  getWorkItemGitHub: async (workItemId: string | number): Promise<WorkItemGitHubData> => {
    return await httpRequestService<WorkItemGitHubData>({
      url: `${API_BASE_URL}/work-items/${workItemId}/github`,
      method: "GET",
    });
  },

  simulateWebhook: async (
    projectId: string | number,
    payload: { event: string; payload: Record<string, any> }
  ): Promise<any> => {
    return await httpRequestService<any>({
      url: `${API_BASE_URL}/integrations/github/simulate`,
      method: "POST",
      data: {
        project_id: projectId,
        ...payload,
      },
    });
  },
};
