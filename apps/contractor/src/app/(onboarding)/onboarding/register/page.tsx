"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerContractor, type RegistrationData } from "@/lib/actions/onboarding";
import { toast } from "sonner";
import type { ContractorSkillCategory, ExperienceLevel } from "@8gent/shared";

const SKILL_CATEGORIES: { value: ContractorSkillCategory; label: string }[] = [
  { value: "development", label: "Development" },
  { value: "content_creation", label: "Content Creation" },
  { value: "research", label: "Research" },
  { value: "consulting", label: "Consulting" },
  { value: "management", label: "Management" },
  { value: "customer_service", label: "Customer Service" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RegistrationData>({
    displayName: "",
    email: "",
    bio: "",
    timezone: "",
    location: "",
    availabilityPreference: "flexible",
    portfolioLinks: [""],
    skills: [],
    agreedToTerms: false,
  });

  const totalSteps = 5;

  function updateField<K extends keyof RegistrationData>(key: K, value: RegistrationData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSkill(category: ContractorSkillCategory) {
    setForm((prev) => {
      const existing = prev.skills.find((s) => s.category === category);
      if (existing) {
        return { ...prev, skills: prev.skills.filter((s) => s.category !== category) };
      }
      return { ...prev, skills: [...prev.skills, { category, level: "intermediate" as ExperienceLevel }] };
    });
  }

  function updateSkillLevel(category: ContractorSkillCategory, level: ExperienceLevel) {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.category === category ? { ...s, level } : s)),
    }));
  }

  async function handleSubmit() {
    if (!form.agreedToTerms) {
      toast.error("You must agree to the terms of service");
      return;
    }
    setSubmitting(true);
    try {
      const result = await registerContractor(form);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Application submitted!");
        router.push("/onboarding/status");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return form.displayName && form.email;
      case 2: return form.timezone && form.location;
      case 3: return form.skills.length > 0;
      case 4: return true;
      case 5: return form.agreedToTerms;
      default: return false;
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i + 1 <= step ? "bg-[var(--color-primary)]" : "bg-[var(--color-muted)]"
            }`}
          />
        ))}
      </div>
      <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
        Step {step} of {totalSteps}
      </p>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Personal Information</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Full Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              placeholder="Tell us about yourself and your experience"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Location & Availability</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              placeholder="City, Country"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => updateField("timezone", e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            >
              <option value="">Select timezone</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Availability Preference</label>
            <div className="flex gap-3">
              {(["full_time", "part_time", "flexible"] as const).map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => updateField("availabilityPreference", pref)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    form.availabilityPreference === pref
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                  }`}
                >
                  {pref.replace("_", "-")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Skills Assessment</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Select your skill areas and experience level in each.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SKILL_CATEGORIES.map((cat) => {
              const selected = form.skills.find((s) => s.category === cat.value);
              return (
                <div
                  key={cat.value}
                  className={`rounded-lg border p-4 transition-colors ${
                    selected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => toggleSkill(cat.value)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="font-medium">{cat.label}</span>
                  </label>
                  {selected && (
                    <select
                      value={selected.level}
                      onChange={(e) => updateSkillLevel(cat.value, e.target.value as ExperienceLevel)}
                      className="mt-2 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
                    >
                      {EXPERIENCE_LEVELS.map((lvl) => (
                        <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Portfolio & Work Samples</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Add links to your portfolio, GitHub, or past work samples.
          </p>
          {form.portfolioLinks.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="url"
                value={link}
                onChange={(e) => {
                  const updated = [...form.portfolioLinks];
                  updated[i] = e.target.value;
                  updateField("portfolioLinks", updated);
                }}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                placeholder="https://..."
              />
              {form.portfolioLinks.length > 1 && (
                <button
                  type="button"
                  onClick={() => updateField("portfolioLinks", form.portfolioLinks.filter((_, j) => j !== i))}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-destructive)] hover:bg-[var(--color-muted)]"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateField("portfolioLinks", [...form.portfolioLinks, ""])}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            + Add another link
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Terms of Service</h2>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-sm">
            <p className="mb-2 font-medium">8gent Contractor Agreement</p>
            <p className="mb-2">
              By agreeing to these terms, you acknowledge that you are an independent contractor
              and not an employee of 8gent. You agree to perform work through the platform&apos;s
              harness environment and submit all deliverables through the platform.
            </p>
            <p className="mb-2">
              All work performed through the platform is subject to quality monitoring, telemetry
              capture, and performance scoring. Your tier level, task access, and compensation are
              determined by your performance metrics.
            </p>
            <p>
              You agree to maintain the confidentiality of all client information and project
              details. Direct communication with clients outside the platform is prohibited.
            </p>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.agreedToTerms}
              onChange={(e) => updateField("agreedToTerms", e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">
              I have read and agree to the Contractor Agreement and Terms of Service
            </span>
          </label>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-lg border border-[var(--color-border)] px-6 py-2 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {step < totalSteps ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canProceed()}
            className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        )}
      </div>
    </div>
  );
}
