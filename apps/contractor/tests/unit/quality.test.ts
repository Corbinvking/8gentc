import { describe, it, expect } from "vitest";
import { runQualityChecks, getSubmissionChecklist, canRequestRevision } from "../../src/lib/quality";

describe("quality control", () => {
  describe("runQualityChecks", () => {
    it("passes for valid coding content", () => {
      const code = "function hello() {\n  return 'world';\n}\n" + "a".repeat(60);
      const results = runQualityChecks("coding", code, []);
      const failed = results.filter((r) => !r.passed);
      expect(failed.length).toBe(0);
    });

    it("fails for empty content", () => {
      const results = runQualityChecks("coding", "", []);
      const failed = results.filter((r) => !r.passed);
      expect(failed.length).toBeGreaterThan(0);
    });

    it("flags TODO markers in code", () => {
      const results = runQualityChecks("coding", "function test() {\n  // TODO: implement\n  return null;\n}", []);
      const todoCheck = results.find((r) => r.type === "code_quality");
      expect(todoCheck?.passed).toBe(false);
    });

    it("flags console.log in code", () => {
      const results = runQualityChecks(
        "coding",
        "function test() {\n  console.log('debug');\n  return true;\n}",
        []
      );
      const debugCheck = results.find((r) => r.type === "debug_statements");
      expect(debugCheck?.passed).toBe(false);
    });

    it("checks citations in research", () => {
      const results = runQualityChecks("research", "This is research without any sources or links.", []);
      const citationCheck = results.find((r) => r.type === "citation_check");
      expect(citationCheck?.passed).toBe(false);
    });

    it("passes citation check when sources present", () => {
      const results = runQualityChecks("research", "According to https://example.com, this is true.", []);
      const citationCheck = results.find((r) => r.type === "citation_check");
      expect(citationCheck?.passed).toBe(true);
    });
  });

  describe("getSubmissionChecklist", () => {
    it("returns common items for all harness types", () => {
      const codingList = getSubmissionChecklist("coding");
      const contentList = getSubmissionChecklist("content");

      expect(codingList.find((i) => i.id === "requirements_met")).toBeTruthy();
      expect(contentList.find((i) => i.id === "requirements_met")).toBeTruthy();
    });

    it("returns coding-specific items", () => {
      const list = getSubmissionChecklist("coding");
      expect(list.find((i) => i.id === "code_tested")).toBeTruthy();
    });

    it("returns research-specific items", () => {
      const list = getSubmissionChecklist("research");
      expect(list.find((i) => i.id === "sources_verified")).toBeTruthy();
    });
  });

  describe("canRequestRevision", () => {
    it("allows revisions under max", () => {
      expect(canRequestRevision(0)).toBe(true);
      expect(canRequestRevision(1)).toBe(true);
    });

    it("disallows revisions at max", () => {
      expect(canRequestRevision(2)).toBe(false);
    });
  });
});
