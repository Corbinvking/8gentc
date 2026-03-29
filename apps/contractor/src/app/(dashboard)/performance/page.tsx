"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, TrendingUp, Zap, Clock, FileCheck, MessageSquare, AlertTriangle, RefreshCw } from "lucide-react";
import { getPerformanceScores, getBenchmarkData } from "@/lib/actions/scoring";

interface ScoreData {
  date: string;
  composite: number;
  tokenEfficiency: number;
  promptQuality: number;
  outputQuality: number;
  speed: number;
}

const DIMENSIONS = [
  { key: "tokenEfficiency", label: "Token Efficiency", icon: Zap, tip: "Use fewer tokens relative to task benchmarks" },
  { key: "promptQuality", label: "Prompt Quality", icon: MessageSquare, tip: "Write clear, specific, effective prompts" },
  { key: "outputQuality", label: "Output Quality", icon: FileCheck, tip: "Minimize revisions, maximize client satisfaction" },
  { key: "speed", label: "Speed", icon: Clock, tip: "Complete tasks within estimated duration" },
] as const;

export default function PerformancePage() {
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [source, setSource] = useState<"platform_c" | "local_fallback" | "loading">("loading");
  const [benchmark, setBenchmark] = useState<{ avgScore: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPerformanceScores();
      setSource(result.source);

      if (result.scores.length > 0) {
        const mapped = result.scores
          .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime())
          .slice(-8)
          .map((s, i) => ({
            date: `Week ${i + 1}`,
            composite: s.composite,
            tokenEfficiency: s.tokenEfficiency,
            promptQuality: s.promptQuality,
            outputQuality: s.outputQuality,
            speed: s.speed,
          }));
        setScores(mapped);
      }

      const benchmarkResult = await getBenchmarkData("general");
      setBenchmark(benchmarkResult.benchmark);
    } catch {
      setSource("local_fallback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const latest = scores.length > 0 ? scores[scores.length - 1] : null;
  const previous = scores.length > 1 ? scores[scores.length - 2] : null;
  const trend = latest && previous ? latest.composite - previous.composite : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Performance</h1>
        <div className="flex items-center gap-2">
          {source === "local_fallback" && (
            <span className="flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 px-3 py-1 text-xs text-[var(--color-warning)]">
              <AlertTriangle className="h-3 w-3" />
              Using cached scores — Platform C unavailable
            </span>
          )}
          {source === "platform_c" && (
            <span className="rounded-full bg-[var(--color-success)]/10 px-3 py-1 text-xs text-[var(--color-success)]">
              Live from Platform C
            </span>
          )}
          <button
            onClick={fetchScores}
            className="rounded-lg p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            title="Refresh scores"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {scores.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-[var(--color-muted-foreground)]" />
          <h2 className="mb-2 font-semibold">No Performance Data Yet</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Complete tasks in the workspace to generate performance scores.
            Scores are computed by Platform C from your telemetry data.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                <BarChart3 className="h-4 w-4" />
                Composite Score
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold">{latest?.composite ?? "—"}</span>
                {trend !== 0 && (
                  <span className={`flex items-center text-sm font-medium ${trend > 0 ? "text-[var(--color-success)]" : "text-[var(--color-destructive)]"}`}>
                    <TrendingUp className={`h-3 w-3 ${trend < 0 ? "rotate-180" : ""}`} />
                    {trend > 0 ? "+" : ""}{trend.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {DIMENSIONS.map((dim) => {
              const value = latest?.[dim.key] ?? 0;
              return (
                <div key={dim.key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                  <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                    <dim.icon className="h-4 w-4" />
                    {dim.label}
                  </div>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{dim.tip}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <h2 className="mb-4 font-semibold">Score Trend</h2>
            <div className="space-y-4">
              {scores.map((week) => (
                <div key={week.date} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-[var(--color-muted-foreground)]">{week.date}</span>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-[var(--color-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                        style={{ width: `${week.composite}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-sm font-semibold">{week.composite}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <h2 className="mb-4 font-semibold">Tier Comparison</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Your composite score of <strong>{latest?.composite ?? 0}</strong> is compared
              against {benchmark ? `a benchmark of ${benchmark.avgScore} avg` : "tier averages"}.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DIMENSIONS.map((dim) => {
                const value = latest?.[dim.key] ?? 0;
                const tierAvg = benchmark?.avgScore ?? 60;
                const isAbove = value > tierAvg;
                return (
                  <div key={dim.key} className="flex items-center justify-between rounded-lg bg-[var(--color-muted)] p-3">
                    <span className="text-sm">{dim.label}</span>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${isAbove ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>
                        {value} vs {tierAvg} avg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
