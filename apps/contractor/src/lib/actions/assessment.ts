"use server";

import { db } from "@8gent/db/client";
import { contractorAssessments, contractors } from "@8gent/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireContractor } from "@/lib/auth";

interface AssessmentSubmission {
  taskType: string;
  prompt: string;
  response: string;
  timeTaken: number;
  timeLimit: number;
}

function scoreAssessment(submission: AssessmentSubmission) {
  const tokenCount = Math.ceil(submission.response.length / 4);
  const timeRatio = submission.timeTaken / submission.timeLimit;

  const tokenEfficiency = Math.max(0, Math.min(100, 100 - (tokenCount / 500) * 20));
  const speedScore = Math.max(0, Math.min(100, (1 - timeRatio) * 100 + 40));

  const hasStructure = submission.response.includes("\n") && submission.response.length > 100;
  const hasDetail = submission.response.length > 200;
  const hasContext = submission.response.length > 50;
  const outputQuality = (hasStructure ? 35 : 0) + (hasDetail ? 35 : 0) + (hasContext ? 30 : 0);

  const composite = tokenEfficiency * 0.3 + outputQuality * 0.4 + speedScore * 0.3;

  return {
    tokenEfficiencyScore: Math.round(tokenEfficiency * 100) / 100,
    outputQualityScore: Math.round(outputQuality * 100) / 100,
    speedScore: Math.round(speedScore * 100) / 100,
    compositeScore: Math.round(composite * 100) / 100,
  };
}

export async function submitAssessmentTask(submission: AssessmentSubmission) {
  const contractor = await requireContractor();

  const scores = scoreAssessment(submission);

  await db.insert(contractorAssessments).values({
    id: nanoid(),
    contractorId: contractor.id,
    taskType: submission.taskType,
    prompt: submission.prompt,
    response: submission.response,
    timeLimit: submission.timeLimit,
    timeTaken: submission.timeTaken,
    ...scores,
    startedAt: new Date(Date.now() - submission.timeTaken * 1000),
    completedAt: new Date(),
  });

  const allAssessments = await db
    .select()
    .from(contractorAssessments)
    .where(eq(contractorAssessments.contractorId, contractor.id));

  if (allAssessments.length >= 3) {
    const avgScore =
      allAssessments.reduce((sum, a) => sum + Number(a.compositeScore ?? 0), 0) /
      allAssessments.length;

    const newStatus = avgScore >= 50 ? "approved" : "rejected";

    await db
      .update(contractors)
      .set({
        onboardingStatus: newStatus,
        assessmentScore: String(Math.round(avgScore * 100) / 100),
        status: newStatus === "approved" ? "active" : "pending",
        updatedAt: new Date(),
      })
      .where(eq(contractors.id, contractor.id));
  }

  return { scores };
}
