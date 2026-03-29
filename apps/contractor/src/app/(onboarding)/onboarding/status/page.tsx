import { getContractorOrRedirect } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, FileText, GraduationCap, XCircle } from "lucide-react";
import Link from "next/link";

const PIPELINE_STEPS = [
  { key: "submitted", label: "Application Submitted", icon: FileText },
  { key: "under_review", label: "Under Review", icon: Clock },
  { key: "assessment", label: "Skills Assessment", icon: GraduationCap },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
] as const;

export default async function OnboardingStatusPage() {
  const contractor = await getContractorOrRedirect();
  if (!contractor) redirect("/sign-in");
  if (contractor.onboardingStatus === "approved") redirect("/");

  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === contractor.onboardingStatus);
  const isRejected = contractor.onboardingStatus === "rejected";

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
      <h2 className="mb-2 text-xl font-semibold">Application Status</h2>
      <p className="mb-8 text-sm text-[var(--color-muted-foreground)]">
        Track your onboarding progress below.
      </p>

      {isRejected ? (
        <div className="rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 p-6 text-center">
          <XCircle className="mx-auto mb-3 h-12 w-12 text-[var(--color-destructive)]" />
          <h3 className="text-lg font-semibold">Application Not Approved</h3>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Unfortunately, we&apos;re unable to move forward with your application at this time.
            You may reapply after 30 days.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {PIPELINE_STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    isCompleted
                      ? "bg-[var(--color-success)] text-white"
                      : isCurrent
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      isCompleted || isCurrent
                        ? "text-[var(--color-foreground)]"
                        : "text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-sm text-[var(--color-primary)]">In progress</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contractor.onboardingStatus === "assessment" && (
        <div className="mt-8">
          <Link
            href="/onboarding/assessment"
            className="inline-block rounded-lg bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
          >
            Start Assessment
          </Link>
        </div>
      )}
    </div>
  );
}
