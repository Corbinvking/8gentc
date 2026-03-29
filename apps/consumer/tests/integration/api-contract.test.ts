import { describe, it, expect } from "vitest";
import { platformCClient } from "@8gent/api-client/platform-c";

describe("Platform C API contract", () => {
  it("client exposes all expected namespaces", () => {
    expect(platformCClient.chat).toBeDefined();
    expect(platformCClient.agents).toBeDefined();
    expect(platformCClient.understanding).toBeDefined();
    expect(platformCClient.metering).toBeDefined();
    expect(platformCClient.tasks).toBeDefined();
  });

  it("chat namespace has sendMessage", () => {
    expect(typeof platformCClient.chat.sendMessage).toBe("function");
  });

  it("agents namespace has all CRUD methods", () => {
    expect(typeof platformCClient.agents.list).toBe("function");
    expect(typeof platformCClient.agents.create).toBe("function");
    expect(typeof platformCClient.agents.update).toBe("function");
    expect(typeof platformCClient.agents.delete).toBe("function");
    expect(typeof platformCClient.agents.getOutputs).toBe("function");
    expect(typeof platformCClient.agents.getStatus).toBe("function");
    expect(typeof platformCClient.agents.pause).toBe("function");
    expect(typeof platformCClient.agents.resume).toBe("function");
  });

  it("understanding namespace has required methods", () => {
    expect(typeof platformCClient.understanding.getNotifications).toBe(
      "function"
    );
    expect(typeof platformCClient.understanding.submitFeedback).toBe(
      "function"
    );
  });

  it("metering namespace has getUsage", () => {
    expect(typeof platformCClient.metering.getUsage).toBe("function");
  });

  it("tasks namespace has escalation methods", () => {
    expect(typeof platformCClient.tasks.escalate).toBe("function");
    expect(typeof platformCClient.tasks.getStatus).toBe("function");
    expect(typeof platformCClient.tasks.getDeliverables).toBe("function");
  });
});
