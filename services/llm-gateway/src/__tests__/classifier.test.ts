import { describe, it, expect } from "vitest";
import { classifyComplexity } from "../router/classifier.js";

describe("classifyComplexity", () => {
  it("returns simple for known simple task types", () => {
    expect(classifyComplexity({ prompt: "Translate this", taskType: "translation" })).toBe("simple");
    expect(classifyComplexity({ prompt: "Format this", taskType: "formatting" })).toBe("simple");
    expect(classifyComplexity({ prompt: "FAQ", taskType: "faq" })).toBe("simple");
  });

  it("returns complex for known complex task types", () => {
    expect(classifyComplexity({ prompt: "Design the system", taskType: "architecture" })).toBe("complex");
    expect(classifyComplexity({ prompt: "Review code", taskType: "code-review" })).toBe("complex");
  });

  it("classifies short prompts as simple", () => {
    expect(classifyComplexity({ prompt: "Hello world" })).toBe("simple");
  });

  it("classifies long prompts as complex", () => {
    const longPrompt = "x".repeat(6000);
    expect(classifyComplexity({ prompt: longPrompt })).toBe("complex");
  });

  it("detects complexity indicators in prompt text", () => {
    const prompt = "Please analyze the trade-offs and design a comprehensive step-by-step solution for this entire system. " + "x".repeat(500);
    expect(classifyComplexity({ prompt })).toBe("complex");
  });

  it("returns standard for medium-length generic prompts", () => {
    const prompt = "a".repeat(1000);
    expect(classifyComplexity({ prompt })).toBe("standard");
  });
});
