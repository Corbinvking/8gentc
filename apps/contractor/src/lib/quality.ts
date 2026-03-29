import type { HarnessType } from "@8gent/shared";

export interface QualityCheckResult {
  type: string;
  passed: boolean;
  details: Record<string, unknown>;
  message: string;
}

export function runQualityChecks(
  harnessType: HarnessType,
  content: string,
  _fileUrls: string[]
): QualityCheckResult[] {
  const results: QualityCheckResult[] = [];

  results.push({
    type: "content_length",
    passed: content.length >= 50,
    details: { length: content.length, minimum: 50 },
    message:
      content.length >= 50
        ? "Content meets minimum length requirement"
        : "Content is too short — minimum 50 characters required",
  });

  results.push({
    type: "empty_content",
    passed: content.trim().length > 0,
    details: {},
    message: content.trim().length > 0 ? "Content is not empty" : "Content cannot be empty",
  });

  if (harnessType === "coding") {
    const hasSyntaxIssues =
      content.includes("TODO") || content.includes("FIXME") || content.includes("HACK");
    results.push({
      type: "code_quality",
      passed: !hasSyntaxIssues,
      details: { hasTodos: content.includes("TODO") },
      message: hasSyntaxIssues
        ? "Code contains TODO/FIXME/HACK markers — please resolve before submitting"
        : "No code quality markers found",
    });

    const hasConsoleLog =
      content.includes("console.log") && !content.includes("// debug");
    results.push({
      type: "debug_statements",
      passed: !hasConsoleLog,
      details: {},
      message: hasConsoleLog
        ? "Remove console.log statements before submitting"
        : "No debug statements found",
    });
  }

  if (harnessType === "content") {
    results.push({
      type: "format_compliance",
      passed: content.includes("\n"),
      details: {},
      message: content.includes("\n")
        ? "Content has proper formatting"
        : "Content should be formatted with paragraphs/sections",
    });
  }

  if (harnessType === "research") {
    const hasCitations = content.includes("http") || content.includes("Source:") || content.includes("[");
    results.push({
      type: "citation_check",
      passed: hasCitations,
      details: {},
      message: hasCitations
        ? "Research includes citations/sources"
        : "Research should include citations and source references",
    });
  }

  return results;
}

export interface SubmissionChecklist {
  id: string;
  label: string;
  required: boolean;
}

export function getSubmissionChecklist(harnessType: HarnessType): SubmissionChecklist[] {
  const common: SubmissionChecklist[] = [
    { id: "requirements_met", label: "All task requirements have been met", required: true },
    { id: "quality_reviewed", label: "I have reviewed the output for quality", required: true },
    { id: "no_sensitive_data", label: "No sensitive or client-identifying information is included", required: true },
  ];

  const specific: Record<string, SubmissionChecklist[]> = {
    coding: [
      { id: "code_tested", label: "Code has been tested and runs without errors", required: true },
      { id: "code_documented", label: "Code includes necessary documentation", required: false },
    ],
    content: [
      { id: "content_proofread", label: "Content has been proofread for grammar and spelling", required: true },
      { id: "brand_safe", label: "Content is brand-safe and appropriate", required: true },
    ],
    research: [
      { id: "sources_verified", label: "All sources have been verified", required: true },
      { id: "citations_complete", label: "All citations are complete and properly formatted", required: true },
    ],
  };

  return [...common, ...(specific[harnessType] ?? [])];
}

export const MAX_REVISIONS = 2;

export function canRequestRevision(currentRevisionCount: number): boolean {
  return currentRevisionCount < MAX_REVISIONS;
}

export interface WarningThresholds {
  lowScoreThreshold: number;
  consecutiveLowScoreTasks: number;
  warningsBeforeSuspension: number;
  suspensionsBeforeDeactivation: number;
}

export const WARNING_THRESHOLDS: WarningThresholds = {
  lowScoreThreshold: 40,
  consecutiveLowScoreTasks: 3,
  warningsBeforeSuspension: 3,
  suspensionsBeforeDeactivation: 2,
};
