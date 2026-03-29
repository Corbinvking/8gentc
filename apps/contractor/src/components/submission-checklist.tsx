"use client";

import { useState, useMemo } from "react";
import { getSubmissionChecklist, validateSubmission } from "@/lib/quality";
import type { HarnessType } from "@8gent/shared";
import { CheckCircle2, Circle, AlertTriangle, XCircle, Shield } from "lucide-react";

interface SubmissionChecklistProps {
  harnessType: string;
  content: string;
  fileUrls: string[];
  onSubmit: (checkedItems: string[]) => void;
  submitting: boolean;
}

export function SubmissionChecklist({
  harnessType,
  content,
  fileUrls,
  onSubmit,
  submitting,
}: SubmissionChecklistProps) {
  const checklist = useMemo(
    () => getSubmissionChecklist(harnessType as HarnessType),
    [harnessType]
  );

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const validation = useMemo(
    () => validateSubmission(harnessType as HarnessType, Array.from(checkedItems), content, fileUrls),
    [harnessType, checkedItems, content, fileUrls]
  );

  function toggleItem(id: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const generalItems = checklist.filter((c) => c.category === "general");
  const specificItems = checklist.filter((c) => c.category === "harness_specific");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-[var(--color-primary)]" />
        <h3 className="font-semibold">Pre-Submission Checklist</h3>
      </div>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        Confirm each item before submitting. Required items must be checked.
      </p>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">General</p>
        {generalItems.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-[var(--color-muted)]">
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="mt-0.5 flex-shrink-0"
            >
              {checkedItems.has(item.id) ? (
                <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <Circle className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              )}
            </button>
            <span className="text-sm">
              {item.label}
              {item.required && <span className="ml-1 text-[var(--color-destructive)]">*</span>}
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
          {harnessType} Specific
        </p>
        {specificItems.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-[var(--color-muted)]">
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="mt-0.5 flex-shrink-0"
            >
              {checkedItems.has(item.id) ? (
                <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <Circle className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              )}
            </button>
            <span className="text-sm">
              {item.label}
              {item.required && <span className="ml-1 text-[var(--color-destructive)]">*</span>}
            </span>
          </label>
        ))}
      </div>

      {validation.errors.length > 0 && (
        <div className="rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 p-3">
          {validation.errors.map((err, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-[var(--color-destructive)]">
              <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
              {err}
            </p>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="rounded-lg border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 p-3">
          {validation.warnings.map((warn, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-[var(--color-warning)]">
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
              {warn}
            </p>
          ))}
        </div>
      )}

      <button
        onClick={() => onSubmit(Array.from(checkedItems))}
        disabled={!validation.canSubmit || submitting}
        className="w-full rounded-lg bg-[var(--color-success)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting
          ? "Submitting..."
          : validation.canSubmit
            ? "Submit Deliverable"
            : "Complete required items to submit"}
      </button>
    </div>
  );
}
