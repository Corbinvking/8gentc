"use client";

import { useState, useEffect } from "react";
import { setupPayoutAccount, getPayoutAccountStatus, getPayoutDashboardLink, getPayoutOnboardingLink } from "@/lib/actions/stripe";
import { toast } from "sonner";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type AccountStatus = "none" | "incomplete" | "active" | "error";

export default function PaymentsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<AccountStatus>("none");
  const [details, setDetails] = useState<{
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
  }>({});

  useEffect(() => {
    getPayoutAccountStatus()
      .then((result) => {
        setStatus(result.status);
        if ("chargesEnabled" in result) {
          setDetails({
            chargesEnabled: result.chargesEnabled,
            payoutsEnabled: result.payoutsEnabled,
            detailsSubmitted: result.detailsSubmitted,
          });
        }
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSetup() {
    setActionLoading(true);
    try {
      const result = await setupPayoutAccount();
      if (result.onboardingUrl) {
        window.location.href = result.onboardingUrl;
      }
    } catch {
      toast.error("Failed to set up payout account");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCompleteSetup() {
    setActionLoading(true);
    try {
      const result = await getPayoutOnboardingLink();
      if ("url" in result && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error ?? "Failed to get onboarding link");
      }
    } catch {
      toast.error("Failed to get onboarding link");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManage() {
    setActionLoading(true);
    try {
      const result = await getPayoutDashboardLink();
      if ("url" in result && result.url) {
        window.open(result.url, "_blank");
      } else {
        toast.error(result.error ?? "Failed to get dashboard link");
      }
    } catch {
      toast.error("Failed to open dashboard");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="rounded-lg p-1 hover:bg-[var(--color-muted)]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Payment Settings</h1>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
            <CreditCard className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Stripe Connect</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Connect your Stripe account to receive payouts for completed tasks.
            </p>

            <div className="mt-4">
              {status === "none" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>No payout account configured. Set up Stripe Connect to receive earnings.</span>
                  </div>
                  <button
                    onClick={handleSetup}
                    disabled={actionLoading}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Set Up Payouts
                  </button>
                </div>
              )}

              {status === "incomplete" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Your Stripe onboarding is incomplete. Please finish setup to receive payouts.</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <StatusRow label="Identity verification" done={details.detailsSubmitted} />
                    <StatusRow label="Charges enabled" done={details.chargesEnabled} />
                    <StatusRow label="Payouts enabled" done={details.payoutsEnabled} />
                  </div>
                  <button
                    onClick={handleCompleteSetup}
                    disabled={actionLoading}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Complete Setup
                  </button>
                </div>
              )}

              {status === "active" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--color-success)]/10 p-3 text-sm text-[var(--color-success)]">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Your payout account is active and ready to receive payments.</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <StatusRow label="Identity verification" done={true} />
                    <StatusRow label="Charges enabled" done={true} />
                    <StatusRow label="Payouts enabled" done={true} />
                  </div>
                  <button
                    onClick={handleManage}
                    disabled={actionLoading}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-muted)] disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Manage Payouts
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-destructive)]/10 p-3 text-sm text-[var(--color-destructive)]">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Failed to retrieve account status. Please try again later.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle className="h-3.5 w-3.5 text-[var(--color-success)]" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
      )}
      <span className={done ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"}>{label}</span>
    </div>
  );
}
