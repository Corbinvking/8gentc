import { auth } from "@clerk/nextjs/server";
import { db } from "@8gent/db";
import { users, workspaceMembers } from "@8gent/db/schema";
import { eq, and } from "drizzle-orm";

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export async function checkWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRoles?: WorkspaceRole[]
): Promise<{ authorized: boolean; role: string | null }> {
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId)
    ),
  });

  if (!membership) return { authorized: false, role: null };

  if (requiredRoles && !requiredRoles.includes(membership.role as WorkspaceRole)) {
    return { authorized: false, role: membership.role };
  }

  return { authorized: true, role: membership.role };
}

const roleHierarchy: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function hasMinimumRole(
  userRole: string,
  requiredRole: WorkspaceRole
): boolean {
  return (
    (roleHierarchy[userRole as WorkspaceRole] ?? -1) >=
    roleHierarchy[requiredRole]
  );
}
