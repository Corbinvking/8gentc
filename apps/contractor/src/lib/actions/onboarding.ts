"use server";

import { db } from "@8gent/db/client";
import { contractors, contractorProfiles, contractorSkills, contractorAssessments } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getAuthUserId } from "@/lib/auth";
import { sendOnboardingEmail } from "@/lib/email";
import type { ContractorSkillCategory, ExperienceLevel } from "@8gent/shared";

type OnboardingStatus = "submitted" | "under_review" | "assessment" | "approved" | "rejected";

const VALID_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  submitted: ["under_review", "rejected"],
  under_review: ["assessment", "rejected"],
  assessment: ["approved", "rejected"],
  approved: [],
  rejected: ["submitted"],
};

const REAPPLICATION_COOLDOWN_DAYS = 30;

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
    const prev = existing[0];

    if (prev.onboardingStatus === "rejected") {
      const rejectedAt = prev.updatedAt;
      const cooldownEnd = new Date(rejectedAt.getTime() + REAPPLICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

      if (new Date() < cooldownEnd) {
        const daysRemaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return { error: `You may reapply in ${daysRemaining} days.` };
      }

      await db.delete(contractorAssessments).where(eq(contractorAssessments.contractorId, prev.id));

      const now = new Date();
      await db
        .update(contractors)
        .set({
          displayName: data.displayName,
          bio: data.bio,
          timezone: data.timezone,
          location: data.location,
          availabilityPreference: data.availabilityPreference,
          skills: data.skills.map((s) => s.category),
          onboardingStatus: "submitted",
          assessmentScore: null,
          contractorAgreementSignedAt: data.agreedToTerms ? now : undefined,
          updatedAt: now,
        })
        .where(eq(contractors.id, prev.id));

      try {
        await sendOnboardingEmail(data.email, "submitted", data.displayName);
      } catch { /* non-critical */ }

      return { success: true, contractorId: prev.id };
    }

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
  } catch { /* non-critical */ }

  return { success: true, contractorId };
}

export async function updateOnboardingStatus(
  contractorId: string,
  newStatus: OnboardingStatus
) {
  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1);

  if (!contractor) {
    return { error: "Contractor not found" };
  }

  const currentStatus = contractor.onboardingStatus as OnboardingStatus;
  const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];

  if (!allowedNext.includes(newStatus)) {
    return {
      error: `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedNext.join(", ") || "none"}`,
    };
  }

  await db
    .update(contractors)
    .set({
      onboardingStatus: newStatus,
      status: newStatus === "approved" ? "active" : "pending",
      updatedAt: new Date(),
    })
    .where(eq(contractors.id, contractorId));

  return { success: true };
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
