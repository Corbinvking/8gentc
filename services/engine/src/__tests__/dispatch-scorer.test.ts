import { describe, it, expect } from "vitest";
import { scoreMatch, type ContractorProfile } from "../services/dispatch-matching/scorer.js";
import type { Workstream } from "@8gent/shared";

function makeWorkstream(overrides?: Partial<Workstream>): Workstream {
  return {
    id: "ws-1",
    taskId: "t-1",
    title: "Test workstream",
    domain: "development",
    complexityTier: 3,
    dependencies: [],
    successCriteria: [],
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContractor(overrides?: Partial<ContractorProfile>): ContractorProfile {
  return {
    id: "c-1",
    userId: "u-1",
    displayName: "Test Contractor",
    skills: ["javascript", "typescript", "react"],
    rating: 4,
    completedTasks: 10,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    activeTasks: 1,
    maxConcurrentTasks: 5,
    compositeScore: 80,
    tokenEfficiencyScore: 75,
    availableHoursPerWeek: 40,
    ...overrides,
  };
}

describe("scoreMatch", () => {
  it("returns a composite score between 0 and 100", () => {
    const score = scoreMatch(makeWorkstream(), makeContractor());
    expect(score.composite).toBeGreaterThanOrEqual(0);
    expect(score.composite).toBeLessThanOrEqual(100);
  });

  it("ranks higher-skilled contractors higher", () => {
    const ws = makeWorkstream({ domain: "development" });

    const good = scoreMatch(ws, makeContractor({ skills: ["javascript", "typescript", "react", "node"] }));
    const poor = scoreMatch(ws, makeContractor({ skills: ["cooking", "painting"] }));

    expect(good.skillMatch).toBeGreaterThan(poor.skillMatch);
    expect(good.composite).toBeGreaterThan(poor.composite);
  });

  it("penalizes overloaded contractors", () => {
    const ws = makeWorkstream();

    const light = scoreMatch(ws, makeContractor({ activeTasks: 0 }));
    const heavy = scoreMatch(ws, makeContractor({ activeTasks: 4 }));

    expect(light.currentWorkload).toBeGreaterThan(heavy.currentWorkload);
  });

  it("considers performance history", () => {
    const ws = makeWorkstream();

    const high = scoreMatch(ws, makeContractor({ compositeScore: 95 }));
    const low = scoreMatch(ws, makeContractor({ compositeScore: 20 }));

    expect(high.performanceHistory).toBeGreaterThan(low.performanceHistory);
  });
});
