"use server";

import { db } from "@8gent/db/client";
import { contractors, contractorProfiles } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireContractor } from "@/lib/auth";

export async function updateProfile(data: {
  displayName?: string;
  bio?: string;
  timezone?: string;
  location?: string;
  portfolioLinks?: string[];
}) {
  const contractor = await requireContractor();

  await db
    .update(contractors)
    .set({
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.timezone && { timezone: data.timezone }),
      ...(data.location && { location: data.location }),
      updatedAt: new Date(),
    })
    .where(eq(contractors.id, contractor.id));

  if (data.portfolioLinks) {
    await db
      .update(contractorProfiles)
      .set({
        portfolioLinks: data.portfolioLinks,
        updatedAt: new Date(),
      })
      .where(eq(contractorProfiles.contractorId, contractor.id));
  }

  return { success: true };
}
