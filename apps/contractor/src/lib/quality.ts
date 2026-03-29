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

export interface SubmissionChecklistItem {
  id: string;
  label: string;
  required: boolean;
  category: "general" | "harness_specific";
}

export function getSubmissionChecklist(harnessType: HarnessType): SubmissionChecklistItem[] {
  const common: SubmissionChecklistItem[] = [
    { id: "requirements_met", label: "All task requirements have been addressed", required: true, category: "general" },
    { id: "quality_reviewed", label: "I have reviewed the output for quality and accuracy", required: true, category: "general" },
    { id: "no_sensitive_data", label: "No sensitive, personal, or client-identifying data is included", required: true, category: "general" },
    { id: "ai_output_verified", label: "I have verified all AI-generated output for correctness", required: true, category: "general" },
  ];

  const specific: Record<string, SubmissionChecklistItem[]> = {
    coding: [
      { id: "code_tested", label: "Code has been tested and runs without errors", required: true, category: "harness_specific" },
      { id: "code_no_debug", label: "Debug/console statements removed from final output", required: true, category: "harness_specific" },
      { id: "code_documented", label: "Code includes necessary inline documentation", required: false, category: "harness_specific" },
      { id: "code_no_placeholders", label: "No TODO/FIXME/HACK placeholders remain", required: true, category: "harness_specific" },
    ],
    content: [
      { id: "content_proofread", label: "Content has been proofread for grammar and spelling", required: true, category: "harness_specific" },
      { id: "content_original", label: "Content is original work (not copied from AI without editing)", required: true, category: "harness_specific" },
      { id: "brand_safe", label: "Content is brand-safe and appropriate for the audience", required: true, category: "harness_specific" },
      { id: "content_formatted", label: "Content is properly formatted with headings/paragraphs", required: false, category: "harness_specific" },
    ],
    research: [
      { id: "sources_verified", label: "All sources have been verified as accessible and accurate", required: true, category: "harness_specific" },
      { id: "citations_complete", label: "All claims are backed by cited sources", required: true, category: "harness_specific" },
      { id: "no_fabricated_sources", label: "No sources were fabricated or hallucinated by AI", required: true, category: "harness_specific" },
      { id: "synthesis_original", label: "Synthesis and analysis is my own work", required: false, category: "harness_specific" },
    ],
  };

  return [...common, ...(specific[harnessType] ?? [])];
}

export interface AttestationRecord {
  taskId: string;
  contractorId: string;
  harnessType: HarnessType;
  checkedItems: string[];
  uncheckedOptionalItems: string[];
  qualityCheckResults: QualityCheckResult[];
  allRequiredChecked: boolean;
  attestedAt: string;
}

export function createAttestationRecord(
  taskId: string,
  contractorId: string,
  harnessType: HarnessType,
  checkedItemIds: string[],
  content: string,
  fileUrls: string[]
): AttestationRecord {
  const checklist = getSubmissionChecklist(harnessType);
  const qualityResults = runQualityChecks(harnessType, content, fileUrls);

  const requiredItems = checklist.filter((c) => c.required);
  const allRequiredChecked = requiredItems.every((item) => checkedItemIds.includes(item.id));

  const uncheckedOptional = checklist
    .filter((c) => !c.required && !checkedItemIds.includes(c.id))
    .map((c) => c.id);

  return {
    taskId,
    contractorId,
    harnessType,
    checkedItems: checkedItemIds,
    uncheckedOptionalItems: uncheckedOptional,
    qualityCheckResults: qualityResults,
    allRequiredChecked,
    attestedAt: new Date().toISOString(),
  };
}

export function validateSubmission(
  harnessType: HarnessType,
  checkedItemIds: string[],
  content: string,
  fileUrls: string[]
): { canSubmit: boolean; errors: string[]; warnings: string[] } {
  const checklist = getSubmissionChecklist(harnessType);
  const qualityResults = runQualityChecks(harnessType, content, fileUrls);

  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredItems = checklist.filter((c) => c.required);
  const uncheckedRequired = requiredItems.filter((item) => !checkedItemIds.includes(item.id));
  if (uncheckedRequired.length > 0) {
    errors.push(`Required checklist items not confirmed: ${uncheckedRequired.map((i) => i.label).join(", ")}`);
  }

  const failedChecks = qualityResults.filter((r) => !r.passed);
  for (const check of failedChecks) {
    if (check.type === "empty_content" || check.type === "content_length") {
      errors.push(check.message);
    } else {
      warnings.push(check.message);
    }
  }

  return {
    canSubmit: errors.length === 0,
    errors,
    warnings,
  };
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
