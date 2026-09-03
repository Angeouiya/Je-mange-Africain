export type TeamMemberStatus = "invited" | "active" | "suspended";

export type TeamInsightMember = {
  role: string;
  status: TeamMemberStatus;
  lastSignInAt?: string | null;
  current?: boolean;
  permissions: Record<string, string[]>;
};

export function summarizeTeam(members: TeamInsightMember[], totalModules: number, now = new Date()) {
  const delegated = members.filter((member) => member.status === "active" && !member.current && member.role !== "super_admin");
  const coveredModules = new Set(delegated.flatMap((member) => Object.keys(member.permissions)));
  const recentThreshold = now.getTime() - 30 * 86_400_000;
  const dormantThreshold = now.getTime() - 90 * 86_400_000;

  return {
    total: members.length,
    active: members.filter((member) => member.status === "active").length,
    invited: members.filter((member) => member.status === "invited").length,
    suspended: members.filter((member) => member.status === "suspended").length,
    protected: members.filter((member) => member.role === "super_admin").length,
    delegatedRoles: new Set(delegated.map((member) => member.role)).size,
    coveredModules: coveredModules.size,
    totalModules,
    recentlyActive: delegated.filter((member) => member.lastSignInAt && new Date(member.lastSignInAt).getTime() >= recentThreshold).length,
    dormant: delegated.filter((member) => !member.lastSignInAt || new Date(member.lastSignInAt).getTime() < dormantThreshold).length,
  };
}
