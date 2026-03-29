"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Zap, Clock, FileCheck, MessageSquare } from "lucide-react";

interface ScoreData {
  date: string;
  composite: number;
  tokenEfficiency: number;
  promptQuality: number;
  outputQuality: number;
  speed: number;
}

const MOCK_SCORES: ScoreData[] = [
  { date: "Week 1", composite: 65, tokenEfficiency: 70, promptQuality: 60, outputQuality: 68, speed: 62 },
  { date: "Week 2", composite: 72, tokenEfficiency: 75, promptQuality: 68, outputQuality: 74, speed: 71 },
  { date: "Week 3", composite: 68, tokenEfficiency: 72, promptQuality: 65, outputQuality: 70, speed: 65 },
  { date: "Week 4", composite: 78, tokenEfficiency: 80, promptQuality: 75, outputQuality: 80, speed: 77 },
];

const DIMENSIONS = [
  { key: "tokenEfficiency", label: "Token Efficiency", icon: Zap, tip: "Use fewer tokens relative to task benchmarks" },
  { key: "promptQuality", label: "Prompt Quality", icon: MessageSquare, tip: "Write clear, specific, effective prompts" },
  { key: "outputQuality", label: "Output Quality", icon: FileCheck, tip: "Minimize revisions, maximize client satisfaction" },
  { key: "speed", label: "Speed", icon: Clock, tip: "Complete tasks within estimated duration" },
] as const;

export default function PerformancePage() {
  const [scores] = useState<ScoreData[]>(MOCK_SCORES);
  const latest = scores[scores.length - 1];
  const previous = scores[scores.length - 2];

  const trend = latest && previous ? latest.composite - previous.composite : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Performance</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          Your composite score of <strong>{latest?.composite ?? 0}</strong> puts you in the{" "}
          <strong className="text-[var(--color-primary)]">top 30%</strong> of Tier 1 contractors
          for overall performance.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DIMENSIONS.map((dim) => {
            const value = latest?.[dim.key] ?? 0;
            const tierAvg = 55 + Math.random() * 20;
            const isAbove = value > tierAvg;
            return (
              <div key={dim.key} className="flex items-center justify-between rounded-lg bg-[var(--color-muted)] p-3">
                <span className="text-sm">{dim.label}</span>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isAbove ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>
                    {value} vs {tierAvg.toFixed(0)} avg
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
