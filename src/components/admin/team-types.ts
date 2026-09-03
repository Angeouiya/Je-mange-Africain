import type { AdminAction, AdminModule } from "@/lib/admin-permissions";

export type TeamStatus = "invited" | "active" | "suspended";
export type TeamPermissionMap = Partial<Record<AdminModule, AdminAction[]>>;

export type TeamRole = {
  id: string;
  permissions: TeamPermissionMap;
  assignable?: boolean;
};

export type TeamMember = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: TeamStatus;
  lastSignInAt?: string | null;
  createdAt: string;
  invitedBy?: string | null;
  permissions: TeamPermissionMap;
  current?: boolean;
  protected?: boolean;
};

export type TeamSummary = {
  total: number;
  active: number;
  invited: number;
  suspended: number;
  protected: number;
  delegatedRoles: number;
  coveredModules: number;
  totalModules: number;
  recentlyActive: number;
  dormant: number;
};

export type TeamPayload = {
  members: TeamMember[];
  roles: TeamRole[];
  roleCatalog?: TeamRole[];
  modules?: AdminModule[];
  actions?: AdminAction[];
  summary?: TeamSummary;
};
