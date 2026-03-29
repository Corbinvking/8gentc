import { describe, it, expect } from "vitest";
import { sanitizeWorkstreams, removeDependencyCycles } from "../services/task-decomposition/decomposer.js";

describe("sanitizeWorkstreams", () => {
  it("clamps complexityTier to 1-5", () => {
    const result = sanitizeWorkstreams([
      { title: "A", description: "a", domain: "development", complexityTier: 0, dependencies: [], successCriteria: [] },
      { title: "B", description: "b", domain: "development", complexityTier: 10, dependencies: [], successCriteria: [] },
      { title: "C", description: "c", domain: "development", complexityTier: 3, dependencies: [], successCriteria: [] },
    ]);

    expect(result[0].complexityTier).toBe(1);
    expect(result[1].complexityTier).toBe(5);
    expect(result[2].complexityTier).toBe(3);
  });

  it("validates domain against allowed enum", () => {
    const result = sanitizeWorkstreams([
      { title: "A", description: "a", domain: "magic" as any, complexityTier: 2, dependencies: [], successCriteria: [] },
      { title: "B", description: "b", domain: "development", complexityTier: 2, dependencies: [], successCriteria: [] },
    ]);

    expect(result[0].domain).toBe("mixed");
    expect(result[1].domain).toBe("development");
  });

  it("rejects empty titles", () => {
    const result = sanitizeWorkstreams([
      { title: "", description: "a", domain: "development", complexityTier: 2, dependencies: [], successCriteria: [] },
      { title: "  ", description: "b", domain: "development", complexityTier: 2, dependencies: [], successCriteria: [] },
      { title: "Valid", description: "c", domain: "development", complexityTier: 2, dependencies: [], successCriteria: [] },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Valid");
  });

  it("adds default success criteria when empty", () => {
    const result = sanitizeWorkstreams([
      { title: "A", description: "a", domain: "development", complexityTier: 2, dependencies: [], successCriteria: [] },
    ]);

    expect(result[0].successCriteria).toEqual(["Task completed successfully"]);
  });

  it("filters null/undefined from dependencies", () => {
    const result = sanitizeWorkstreams([
      { title: "A", description: "a", domain: "development", complexityTier: 2, dependencies: [null as any, "B", undefined as any, ""], successCriteria: ["done"] },
    ]);

    expect(result[0].dependencies).toEqual(["B"]);
  });
});

describe("removeDependencyCycles", () => {
  it("passes through acyclic dependencies", () => {
    const ws = [
      { title: "A", description: "a", domain: "development" as const, complexityTier: 2, dependencies: [], successCriteria: ["done"] },
      { title: "B", description: "b", domain: "development" as const, complexityTier: 2, dependencies: ["A"], successCriteria: ["done"] },
      { title: "C", description: "c", domain: "development" as const, complexityTier: 2, dependencies: ["B"], successCriteria: ["done"] },
    ];

    const result = removeDependencyCycles(ws);
    expect(result[0].dependencies).toEqual([]);
    expect(result[1].dependencies).toEqual(["A"]);
    expect(result[2].dependencies).toEqual(["B"]);
  });

  it("removes back-edge in a simple A -> B -> A cycle", () => {
    const ws = [
      { title: "A", description: "a", domain: "development" as const, complexityTier: 2, dependencies: ["B"], successCriteria: ["done"] },
      { title: "B", description: "b", domain: "development" as const, complexityTier: 2, dependencies: ["A"], successCriteria: ["done"] },
    ];

    const result = removeDependencyCycles(ws);
    const totalDeps = result[0].dependencies.length + result[1].dependencies.length;
    expect(totalDeps).toBeLessThanOrEqual(1);
  });

  it("removes back-edge in a longer cycle A -> B -> C -> A", () => {
    const ws = [
      { title: "A", description: "a", domain: "development" as const, complexityTier: 2, dependencies: [], successCriteria: ["done"] },
      { title: "B", description: "b", domain: "development" as const, complexityTier: 2, dependencies: ["A"], successCriteria: ["done"] },
      { title: "C", description: "c", domain: "development" as const, complexityTier: 2, dependencies: ["B", "A"], successCriteria: ["done"] },
    ];

    const result = removeDependencyCycles(ws);
    const allDeps = result.flatMap((w) => w.dependencies);
    expect(allDeps).not.toContain(undefined);

    const adjList = new Map(result.map((w) => [w.title, w.dependencies]));
    expect(hasCycle(adjList)).toBe(false);
  });

  it("handles workstreams with no dependencies", () => {
    const ws = [
      { title: "A", description: "a", domain: "development" as const, complexityTier: 2, dependencies: [], successCriteria: ["done"] },
      { title: "B", description: "b", domain: "development" as const, complexityTier: 2, dependencies: [], successCriteria: ["done"] },
    ];

    const result = removeDependencyCycles(ws);
    expect(result).toEqual(ws);
  });

  it("removes references to non-existent workstreams", () => {
    const ws = [
      { title: "A", description: "a", domain: "development" as const, complexityTier: 2, dependencies: ["NonExistent"], successCriteria: ["done"] },
    ];

    const result = removeDependencyCycles(ws);
    expect(result[0].dependencies).toEqual([]);
  });
});

function hasCycle(adjList: Map<string, string[]>): boolean {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    inStack.add(node);
    for (const dep of adjList.get(node) ?? []) {
      if (inStack.has(dep)) return true;
      if (!visited.has(dep) && dfs(dep)) return true;
    }
    inStack.delete(node);
    return false;
  }

  for (const node of adjList.keys()) {
    if (!visited.has(node) && dfs(node)) return true;
  }
  return false;
}
