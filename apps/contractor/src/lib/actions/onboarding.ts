"use server";

import { db } from "@8gent/db/client";
import { contractors, contractorProfiles, contractorSkills } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getAuthUserId } from "@/lib/auth";
import { sendOnboardingEmail } from "@/lib/email";
import type { ContractorSkillCategory, ExperienceLevel } from "@8gent/shared";

export interface RegistrationData {
  displayName: string;
  email: string;
  bio: string;
  timezone: string;
  location: string;
  availabilityPreference: "full_time" | "part_time" | "flexible";
  portfolioLinks: string[];
  skills: Array<{
    category: ContractorSkillCategory;
    level: ExperienceLevel;
    yearsOfExperience?: number;
  }>;
  agreedToTerms: boolean;
}

export async function registerContractor(data: RegistrationData) {
  const userId = await getAuthUserId();

  const existing = await db.select().from(contractors).where(eq(contractors.userId, userId)).limit(1);
  if (existing.length > 0) {
    return { error: "You already have a contractor profile" };
  }

  const contractorId = nanoid();
  const now = new Date();

  await db.insert(contractors).values({
    id: contractorId,
    userId,
    displayName: data.displayName,
    bio: data.bio,
    timezone: data.timezone,
    location: data.location,
    availabilityPreference: data.availabilityPreference,
    skills: data.skills.map((s) => s.category),
    onboardingStatus: "submitted",
    tier: "new",
    xp: 0,
    currentStreak: 0,
    contractorAgreementSignedAt: data.agreedToTerms ? now : undefined,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(contractorProfiles).values({
    id: nanoid(),
    contractorId,
    portfolioLinks: data.portfolioLinks,
    experienceLevels: data.skills,
    createdAt: now,
    updatedAt: now,
  });

  for (const skill of data.skills) {
    await db.insert(contractorSkills).values({
      id: nanoid(),
      contractorId,
      category: skill.category,
      level: skill.level,
      yearsOfExperience: skill.yearsOfExperience,
      createdAt: now,
    });
  }

  try {
    await sendOnboardingEmail(data.email, "submitted", data.displayName);
  } catch {
    // Non-critical: email failure shouldn't block registration
  }

  return { success: true, contractorId };
}

export async function updateOnboardingStatus(
  contractorId: string,
  status: "submitted" | "under_review" | "assessment" | "approved" | "rejected"
) {
  await db
    .update(contractors)
    .set({
      onboardingStatus: status,
      status: status === "approved" ? "active" : "pending",
      updatedAt: new Date(),
    })
    .where(eq(contractors.id, contractorId));
}

export async function signAgreement(contractorId: string) {
  await db
    .update(contractors)
    .set({
      contractorAgreementSignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contractors.id, contractorId));
}
