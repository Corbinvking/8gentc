"use client";

import { useState, useEffect } from "react";
import { submitDispute, getMyDisputes } from "@/lib/actions/disputes";
import { getPayoutAccountStatus } from "@/lib/actions/stripe";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Clock, AlertTriangle, FileText, CreditCard, CheckCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

interface EarningsData {
  currentPeriod: number;
  pending: number;
  totalEarnings: number;
  projected: number;
  tasksThisPeriod: number;
  avgPerTask: number;
}

interface PayoutHistory {
  id: string;
  amount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  processedAt?: string;
}

interface DisputeRecord {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;
  adminNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  payoutId: string | null;
  taskId: string | null;
}

const MOCK_EARNINGS: EarningsData = {
  currentPeriod: 425.50,
  pending: 175.00,
  totalEarnings: 3250.75,
  projected: 520.00,
  tasksThisPeriod: 8,
  avgPerTask: 53.19,
};

const MOCK_HISTORY: PayoutHistory[] = [
  { id: "p1", amount: 612.50, status: "completed", periodStart: "2026-03-01", periodEnd: "2026-03-15", processedAt: "2026-03-17" },
  { id: "p2", amount: 487.25, status: "completed", periodStart: "2026-02-15", periodEnd: "2026-02-28", processedAt: "2026-03-02" },
  { id: "p3", amount: 395.00, status: "completed", periodStart: "2026-02-01", periodEnd: "2026-02-14", processedAt: "2026-02-16" },
];

export default function EarningsPage() {
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeTaskId, setDisputeTaskId] = useState("");
  const [disputePayoutId, setDisputePayoutId] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [hasStripeAccount, setHasStripeAccount] = useState<boolean | null>(null);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);

  useEffect(() => {
    getPayoutAccountStatus()
      .then((r) => setHasStripeAccount(r.status === "active"))
      .catch(() => setHasStripeAccount(false));

    getMyDisputes()
      .then((d) => setDisputes(d as unknown as DisputeRecord[]))
      .catch(() => {});
  }, []);

  async function handleSubmitDispute() {
    if (!disputeReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setSubmittingDispute(true);
    try {
      await submitDispute({
        taskId: disputeTaskId || undefined,
        payoutId: disputePayoutId || undefined,
        reason: disputeReason,
      });
      toast.success("Dispute submitted");
      setShowDispute(false);
      setDisputeReason("");
      setDisputeTaskId("");
      setDisputePayoutId("");
      const updated = await getMyDisputes();
      setDisputes(updated as unknown as DisputeRecord[]);
    } catch {
      toast.error("Failed to submit dispute");
    } finally {
      setSubmittingDispute(false);
    }
  }

  const stats = [
    { label: "Current Period", value: `$${MOCK_EARNINGS.currentPeriod.toFixed(2)}`, icon: DollarSign },
    { label: "Pending Payout", value: `$${MOCK_EARNINGS.pending.toFixed(2)}`, icon: Clock },
    { label: "Total Earnings", value: `$${MOCK_EARNINGS.totalEarnings.toFixed(2)}`, icon: TrendingUp },
    { label: "Projected", value: `$${MOCK_EARNINGS.projected.toFixed(2)}`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <button
          onClick={() => setShowDispute(!showDispute)}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-muted)]"
        >
          <AlertTriangle className="h-4 w-4" />
          Dispute
        </button>
      </div>

      {/* Stripe Connect banner */}
      {hasStripeAccount === false && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-[var(--color-warning)]" />
            <div>
              <p className="text-sm font-medium">Set up your payout account to receive earnings</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Connect your Stripe account to start getting paid for completed tasks.</p>
            </div>
          </div>
          <Link
            href="/settings/payments"
            className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            <ExternalLink className="h-4 w-4" /> Set Up Payouts
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <stat.icon className="h-4 w-4" />
              {stat.label}
            </div>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="font-semibold">Period Summary</h3>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">Tasks completed</span>
              <span className="font-medium">{MOCK_EARNINGS.tasksThisPeriod}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">Average per task</span>
              <span className="font-medium">${MOCK_EARNINGS.avgPerTask.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">Payout threshold</span>
              <span className="font-medium">$25.00 minimum</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">Payout cycle</span>
              <span className="font-medium">Weekly</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="font-semibold">Performance Multiplier</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-[var(--color-success)]/10 p-2">
              <span>Score 90+</span>
              <span className="font-bold text-[var(--color-success)]">1.3x</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--color-primary)]/10 p-2">
              <span>Score 75-89</span>
              <span className="font-bold text-[var(--color-primary)]">1.1x</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--color-muted)] p-2">
              <span>Score 60-74</span>
              <span className="font-bold">1.0x</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--color-warning)]/10 p-2">
              <span>Score &lt;60</span>
              <span className="font-bold text-[var(--color-warning)]">0.9x</span>
            </div>
          </div>
        </div>
      </div>

      {showDispute && (
        <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
            Submit a Dispute
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Payout Period</label>
              <select
                value={disputePayoutId}
                onChange={(e) => setDisputePayoutId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm"
              >
                <option value="">Select a payout (optional)</option>
                {MOCK_HISTORY.map((p) => (
                  <option key={p.id} value={p.id}>
                    {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()} (${p.amount.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Task ID (optional)</label>
              <input
                type="text"
                value={disputeTaskId}
                onChange={(e) => setDisputeTaskId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm"
                placeholder="Task ID if disputing a specific task"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Reason</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm"
                placeholder="Describe the issue with your score or payout..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmitDispute}
                disabled={submittingDispute}
                className="rounded-lg bg-[var(--color-warning)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submittingDispute ? "Submitting..." : "Submit Dispute"}
              </button>
              <button
                onClick={() => setShowDispute(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolved disputes */}
      {disputes.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> My Disputes
            </h2>
          </div>
          {disputes.map((d) => (
            <div key={d.id} className="border-b border-[var(--color-border)] px-6 py-4 last:border-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm">{d.reason}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    Filed {new Date(d.createdAt).toLocaleDateString()}
                    {d.taskId && ` · Task: ${d.taskId}`}
                    {d.payoutId && ` · Payout: ${d.payoutId}`}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  d.status === "resolved" ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                    : d.status === "rejected" ? "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]"
                    : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                }`}>
                  {d.status}
                </span>
              </div>
              {d.resolution && (
                <div className="mt-2 rounded-lg bg-[var(--color-muted)] p-3">
                  <p className="text-xs font-medium">Resolution</p>
                  <p className="mt-1 text-sm">{d.resolution}</p>
                  {d.resolvedAt && (
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Resolved {new Date(d.resolvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileText className="h-4 w-4" /> Payout History
          </h2>
        </div>
        {MOCK_HISTORY.map((payout) => (
          <div
            key={payout.id}
            className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 last:border-0"
          >
            <div>
              <p className="text-sm font-medium">
                {new Date(payout.periodStart).toLocaleDateString()} –{" "}
                {new Date(payout.periodEnd).toLocaleDateString()}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {payout.processedAt
                  ? `Processed ${new Date(payout.processedAt).toLocaleDateString()}`
                  : "Processing..."}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">${payout.amount.toFixed(2)}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  payout.status === "completed"
                    ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                    : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                }`}
              >
                {payout.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
