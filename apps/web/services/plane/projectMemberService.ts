import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";

export interface ProjectMemberUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  joined_at?: string;
}

export interface ProjectInvitationItem {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  token: string;
  invited_by?: {
    id: string;
    name: string;
  } | null;
  expires_at: string;
}

export interface ProjectMembersResponse {
  data: {
    members: ProjectMemberUser[];
    invitations: ProjectInvitationItem[];
  };
}

export interface AddMemberOrInviteResponse {
  data: {
    type: "MEMBER_ADDED" | "INVITATION_SENT";
    user?: ProjectMemberUser;
    invitation?: {
      id: number;
      email: string;
      role: string;
      token: string;
      expires_at: string;
      invite_url: string;
    };
    message: string;
  };
}

export interface PublicInvitationDetails {
  data: {
    id: string;
    email: string;
    role: string;
    project: {
      id: string;
      name: string;
      identifier: string;
      workspace: {
        id: string;
        name: string;
        slug: string;
      };
    };
    inviter?: {
      name: string;
      email: string;
    } | null;
    expires_at: string;
  };
}

export const projectMemberService = {
  list: async (projectId: string | number): Promise<{ members: ProjectMemberUser[]; invitations: ProjectInvitationItem[] }> => {
    const res = await httpRequestService<ProjectMembersResponse>({
      url: `${API_BASE_URL}/projects/${projectId}/members`,
      method: "GET",
    });

    return res.data;
  },

  addOrInvite: async (
    projectId: string | number,
    payload: { email: string; role?: "ADMIN" | "MEMBER" | "VIEWER" }
  ): Promise<AddMemberOrInviteResponse["data"]> => {
    const res = await httpRequestService<AddMemberOrInviteResponse>({
      url: `${API_BASE_URL}/projects/${projectId}/members`,
      method: "POST",
      data: payload,
    });

    return res.data;
  },

  updateRole: async (
    projectId: string | number,
    userId: string | number,
    role: "ADMIN" | "MEMBER" | "VIEWER"
  ): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/projects/${projectId}/members/${userId}`,
      method: "PUT",
      data: { role },
    });
  },

  removeMember: async (projectId: string | number, userId: string | number): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/projects/${projectId}/members/${userId}`,
      method: "DELETE",
    });
  },

  cancelInvitation: async (projectId: string | number, invitationId: string | number): Promise<void> => {
    await httpRequestService({
      url: `${API_BASE_URL}/projects/${projectId}/invitations/${invitationId}`,
      method: "DELETE",
    });
  },

  getInvitationByToken: async (token: string): Promise<PublicInvitationDetails["data"]> => {
    const res = await httpRequestService<PublicInvitationDetails>({
      url: `${API_BASE_URL}/invitations/${token}`,
      method: "GET",
    });

    return res.data;
  },

  acceptInvitation: async (token: string): Promise<{ project: { id: string; name: string; identifier: string; workspace_slug: string } }> => {
    const res = await httpRequestService<{
      message: string;
      data: {
        project: {
          id: string;
          name: string;
          identifier: string;
          workspace_slug: string;
        };
      };
    }>({
      url: `${API_BASE_URL}/invitations/${token}/accept`,
      method: "POST",
    });

    return res.data;
  },
};
