import { currentUser, auth } from "@clerk/nextjs/server";
import { db } from "@8gent/db/client";
import { contractors } from "@8gent/db/schema";
import { eq } from "drizzle-orm";

export async function getContractorOrRedirect() {
  const user = await currentUser();
  if (!user) return null;

  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.userId, user.id))
    .limit(1);

  return contractor ?? null;
}

export async function requireContractor() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.userId, userId))
    .limit(1);

  if (!contractor) throw new Error("Contractor profile not found");
  return contractor;
}

export async function getAuthUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}
