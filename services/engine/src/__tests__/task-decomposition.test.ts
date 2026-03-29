import { describe, it, expect } from "vitest";
import { estimateWorkstream } from "../services/task-decomposition/estimator.js";

describe("estimateWorkstream", () => {
  it("returns base estimates for tier 3 development", () => {
    const est = estimateWorkstream("development", "Build a feature", 3);
    expect(est.tokens).toBeGreaterThan(0);
    expect(est.durationMinutes).toBeGreaterThan(0);
    expect(est.complexityTier).toBe(3);
  });

  it("lower tiers produce lower estimates", () => {
    const tier1 = estimateWorkstream("development", "Simple task", 1);
    const tier5 = estimateWorkstream("development", "Simple task", 5);

    expect(tier1.tokens).toBeLessThan(tier5.tokens);
    expect(tier1.durationMinutes).toBeLessThan(tier5.durationMinutes);
  });

  it("clamps complexity tier to 1-5", () => {
    const est0 = estimateWorkstream("content", "x", 0);
    expect(est0.complexityTier).toBe(1);

    const est10 = estimateWorkstream("content", "x", 10);
    expect(est10.complexityTier).toBe(5);
  });

  it("scales with description length", () => {
    const short = estimateWorkstream("research", "Do research", 3);
    const long = estimateWorkstream("research", "x".repeat(1000), 3);

    expect(long.tokens).toBeGreaterThan(short.tokens);
  });

  it("handles all domain types", () => {
    const domains = ["development", "content", "research", "consulting", "design", "mixed"] as const;

    for (const domain of domains) {
      const est = estimateWorkstream(domain, "task", 3);
      expect(est.tokens).toBeGreaterThan(0);
    }
  });
});
