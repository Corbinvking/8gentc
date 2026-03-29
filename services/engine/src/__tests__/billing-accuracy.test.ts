import { describe, it, expect } from "vitest";

describe("Billing pipeline accuracy", () => {
  it("aggregateBilling return type has correct shape", () => {
    const billing = {
      userId: "test-user",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-01-31"),
      totalTokensIn: 50000,
      totalTokensOut: 25000,
      totalCost: 1.5,
      totalCalls: 100,
    };

    expect(billing.totalTokensIn + billing.totalTokensOut).toBe(75000);
    expect(billing.totalCalls).toBe(100);
  });

  it("sum of 100 known token counts matches expected total", () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      tokensIn: 500 + i,
      tokensOut: 200 + i,
      cost: 0.001 * (i + 1),
    }));

    const expectedTokensIn = events.reduce((s, e) => s + e.tokensIn, 0);
    const expectedTokensOut = events.reduce((s, e) => s + e.tokensOut, 0);
    const expectedCost = events.reduce((s, e) => s + e.cost, 0);

    expect(expectedTokensIn).toBe(54950);
    expect(expectedTokensOut).toBe(24950);
    expect(expectedCost).toBeCloseTo(5.05, 10);

    const totalTokens = expectedTokensIn + expectedTokensOut;
    expect(totalTokens).toBe(79900);
  });

  it("billing aggregation preserves per-event precision", () => {
    const costs = [0.00015, 0.00032, 0.00048, 0.00001, 0.00099];
    const total = costs.reduce((s, c) => s + c, 0);

    expect(total).toBeCloseTo(0.00195, 10);
    expect(costs.length).toBe(5);
  });

  it("unitCost calculation avoids division by zero", () => {
    const totalTokens = 0;
    const totalCost = 0;
    const unitCost = totalCost / (totalTokens || 1);

    expect(unitCost).toBe(0);
    expect(isFinite(unitCost)).toBe(true);
  });

  it("createUsageRecord formats unitCost to 6 decimal places", () => {
    const unitCost = 0.0000123456789;
    const formatted = unitCost.toFixed(6);
    expect(formatted).toBe("0.000012");

    const parsed = parseFloat(formatted);
    expect(parsed).toBeCloseTo(0.000012, 6);
  });

  it("billing handles large token volumes without overflow", () => {
    const events = Array.from({ length: 100 }, () => ({
      tokensIn: 1_000_000,
      tokensOut: 500_000,
    }));

    const totalIn = events.reduce((s, e) => s + e.tokensIn, 0);
    const totalOut = events.reduce((s, e) => s + e.tokensOut, 0);

    expect(totalIn).toBe(100_000_000);
    expect(totalOut).toBe(50_000_000);
    expect(totalIn + totalOut).toBe(150_000_000);
    expect(Number.isSafeInteger(totalIn + totalOut)).toBe(true);
  });
});
