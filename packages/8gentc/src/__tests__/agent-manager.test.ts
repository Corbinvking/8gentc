import { describe, it, expect, beforeEach } from "vitest";
import { AgentManager } from "../agents/index.js";

describe("AgentManager", () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager();
  });

  it("creates an agent with correct defaults", () => {
    const agent = manager.create({ name: "Test Agent", ownerId: "user-1" });

    expect(agent.id).toBeDefined();
    expect(agent.name).toBe("Test Agent");
    expect(agent.ownerId).toBe("user-1");
    expect(agent.status).toBe("idle");
    expect(agent.skills).toEqual([]);
    expect(agent.config.modelPreference).toBe("auto");
  });

  it("starts an agent and transitions to running", () => {
    const agent = manager.create({ name: "Test", ownerId: "user-1" });
    const started = manager.start(agent.id);

    expect(started.status).toBe("running");
    manager.destroy(agent.id);
  });

  it("pauses and resumes an agent", () => {
    const agent = manager.create({ name: "Test", ownerId: "user-1" });
    manager.start(agent.id);

    const paused = manager.pause(agent.id);
    expect(paused.status).toBe("paused");

    const resumed = manager.resume(agent.id);
    expect(resumed.status).toBe("running");

    manager.destroy(agent.id);
  });

  it("throws on invalid state transitions", () => {
    const agent = manager.create({ name: "Test", ownerId: "user-1" });

    expect(() => manager.pause(agent.id)).toThrow("Invalid transition: idle -> paused");
  });

  it("lists agents by owner", () => {
    manager.create({ name: "A1", ownerId: "user-1" });
    manager.create({ name: "A2", ownerId: "user-1" });
    manager.create({ name: "B1", ownerId: "user-2" });

    const user1Agents = manager.listByOwner("user-1");
    expect(user1Agents).toHaveLength(2);

    const user2Agents = manager.listByOwner("user-2");
    expect(user2Agents).toHaveLength(1);

    manager.destroyAll();
  });

  it("destroys an agent", () => {
    const agent = manager.create({ name: "Test", ownerId: "user-1" });
    manager.destroy(agent.id);

    expect(manager.getAgent(agent.id)).toBeUndefined();
  });

  it("updates agent config", () => {
    const agent = manager.create({ name: "Test", ownerId: "user-1" });
    const updated = manager.updateConfig(agent.id, { modelPreference: "complex" });

    expect(updated.config.modelPreference).toBe("complex");
    manager.destroy(agent.id);
  });
});
