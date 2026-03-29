import { describe, it, expect, beforeEach } from "vitest";
import { SkillRegistry, builtInSkills } from "../skills/index.js";

describe("SkillRegistry", () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  it("registers and retrieves a skill", () => {
    const skill = builtInSkills[0];
    registry.register(skill);

    expect(registry.get(skill.id)).toBe(skill);
    expect(registry.has(skill.id)).toBe(true);
  });

  it("throws when registering a duplicate skill", () => {
    const skill = builtInSkills[0];
    registry.register(skill);

    expect(() => registry.register(skill)).toThrow("already registered");
  });

  it("lists all registered skills", () => {
    for (const skill of builtInSkills) {
      registry.register(skill);
    }

    expect(registry.listAll()).toHaveLength(builtInSkills.length);
  });

  it("lists skills for an agent", () => {
    for (const skill of builtInSkills) {
      registry.register(skill);
    }

    const agentSkills = registry.listForAgent(["web-search", "summarize"]);
    expect(agentSkills).toHaveLength(2);
  });

  it("executes a skill", async () => {
    for (const skill of builtInSkills) {
      registry.register(skill);
    }

    const result = await registry.execute("web-search", {
      agentId: "a1",
      userId: "u1",
      input: "test query",
      config: {},
    });

    expect(result.success).toBe(true);
  });

  it("returns failure for unknown skill", async () => {
    const result = await registry.execute("nonexistent", {
      agentId: "a1",
      userId: "u1",
      input: "test",
      config: {},
    });

    expect(result.success).toBe(false);
  });
});
