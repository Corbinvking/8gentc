"use server";

import { db } from "@8gent/db/client";
import { contractorAssessments, contractors } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
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
  const response = submission.response;
  const tokenCount = Math.ceil(response.length / 4);
  const timeRatio = submission.timeTaken / submission.timeLimit;

  // --- Token Efficiency (0-100) ---
  // Ideal range: 100-800 tokens (400-3200 chars). Penalize both too short and too long.
  let tokenEfficiency: number;
  if (tokenCount < 25) {
    tokenEfficiency = 10;
  } else if (tokenCount < 100) {
    tokenEfficiency = 30 + (tokenCount / 100) * 40;
  } else if (tokenCount <= 800) {
    tokenEfficiency = 90 - Math.abs(tokenCount - 400) * 0.05;
  } else {
    tokenEfficiency = Math.max(20, 80 - (tokenCount - 800) * 0.03);
  }
  tokenEfficiency = Math.max(0, Math.min(100, tokenEfficiency));

  // --- Speed Score (0-100) ---
  // Reward completing faster, but penalize if suspiciously fast (< 10% of time limit)
  let speedScore: number;
  if (timeRatio < 0.1) {
    speedScore = 30; // Too fast — likely low effort
  } else if (timeRatio < 0.5) {
    speedScore = 70 + (0.5 - timeRatio) * 60;
  } else if (timeRatio < 0.8) {
    speedScore = 60 + (0.8 - timeRatio) * 33;
  } else if (timeRatio <= 1.0) {
    speedScore = 40 + (1.0 - timeRatio) * 100;
  } else {
    speedScore = 20;
  }
  speedScore = Math.max(0, Math.min(100, speedScore));

  // --- Output Quality (0-100) ---
  // Multi-signal analysis: structure, depth, specificity, technical markers
  let outputQuality = 0;

  const lines = response.split("\n").filter((l) => l.trim().length > 0);
  const wordCount = response.split(/\s+/).filter(Boolean).length;
  const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 5);

  // Structure signals
  const hasParagraphs = lines.length >= 3;
  const hasHeadings = /^#{1,3}\s/m.test(response) || /^[A-Z][a-z]+:/.test(response);
  const hasBulletPoints = /^[\s]*[-*•]\s/m.test(response);
  const hasNumberedList = /^\s*\d+[.)]\s/m.test(response);
  const hasCodeBlock = /```[\s\S]*```/.test(response) || /`[^`]+`/.test(response);

  if (hasParagraphs) outputQuality += 10;
  if (hasHeadings) outputQuality += 8;
  if (hasBulletPoints || hasNumberedList) outputQuality += 8;
  if (hasCodeBlock) outputQuality += 5;

  // Depth signals
  if (wordCount >= 50) outputQuality += 5;
  if (wordCount >= 100) outputQuality += 10;
  if (wordCount >= 200) outputQuality += 5;
  if (sentences.length >= 5) outputQuality += 7;
  if (sentences.length >= 10) outputQuality += 5;

  // Specificity signals
  const hasSpecificTerms = /(?:function|class|interface|API|endpoint|database|query|algorithm|pattern|architecture)/i.test(response);
  const hasExamples = /(?:for example|e\.g\.|such as|like:|consider)/i.test(response);
  const hasConstraints = /(?:edge case|error|validation|handling|timeout|limit|boundary)/i.test(response);
  const hasProsConsTradeoffs = /(?:advantage|disadvantage|trade-?off|pro|con|benefit|drawback|compared to)/i.test(response);

  if (hasSpecificTerms) outputQuality += 8;
  if (hasExamples) outputQuality += 7;
  if (hasConstraints) outputQuality += 7;
  if (hasProsConsTradeoffs) outputQuality += 5;

  // Coherence: average sentence length (penalize very short or very long)
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
  if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 25) {
    outputQuality += 10;
  } else if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 35) {
    outputQuality += 5;
  }

  outputQuality = Math.max(0, Math.min(100, outputQuality));

  // --- Composite ---
  const composite = tokenEfficiency * 0.25 + outputQuality * 0.45 + speedScore * 0.30;

  return {
    tokenEfficiencyScore: Math.round(tokenEfficiency * 100) / 100,
    outputQualityScore: Math.round(outputQuality * 100) / 100,
    speedScore: Math.round(speedScore * 100) / 100,
    compositeScore: Math.round(composite * 100) / 100,
  };
}

export async function submitAssessmentTask(submission: AssessmentSubmission) {
  const contractor = await requireContractor();

  if (contractor.onboardingStatus !== "assessment") {
    return { error: "Assessment is not available in your current onboarding stage." };
  }

  const existingForType = await db
    .select()
    .from(contractorAssessments)
    .where(eq(contractorAssessments.contractorId, contractor.id));

  const alreadySubmitted = existingForType.find((a) => a.taskType === submission.taskType);
  if (alreadySubmitted) {
    return { error: `You have already submitted the ${submission.taskType} assessment task.` };
  }

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
