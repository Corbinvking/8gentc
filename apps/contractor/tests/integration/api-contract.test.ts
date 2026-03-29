import { describe, it, expect } from "vitest";
import { platformCClient } from "@8gent/api-client/platform-c";
import { platformBClient } from "@8gent/api-client/platform-b";

describe("Platform B <-> Platform C API Contract", () => {
  describe("platformCClient", () => {
    it("has all required dispatch methods", () => {
      expect(typeof platformCClient.getAvailableTasks).toBe("function");
      expect(typeof platformCClient.acceptTask).toBe("function");
      expect(typeof platformCClient.rejectTask).toBe("function");
    });

    it("has all required task methods", () => {
      expect(typeof platformCClient.getTaskDetails).toBe("function");
      expect(typeof platformCClient.getTaskContext).toBe("function");
      expect(typeof platformCClient.submitDeliverable).toBe("function");
      expect(typeof platformCClient.submitRevision).toBe("function");
      expect(typeof platformCClient.sendClarification).toBe("function");
      expect(typeof platformCClient.getClarifications).toBe("function");
    });

    it("has all required telemetry methods", () => {
      expect(typeof platformCClient.logPrompt).toBe("function");
      expect(typeof platformCClient.logLlmCall).toBe("function");
      expect(typeof platformCClient.logSession).toBe("function");
      expect(typeof platformCClient.getContractorScores).toBe("function");
      expect(typeof platformCClient.getBenchmarks).toBe("function");
    });

    it("has correct base URL", () => {
      expect(platformCClient.baseUrl).toBeDefined();
    });
  });

  describe("platformBClient", () => {
    it("has all required contractor methods", () => {
      expect(typeof platformBClient.offerTask).toBe("function");
      expect(typeof platformBClient.getAvailableContractors).toBe("function");
      expect(typeof platformBClient.getContractorSkills).toBe("function");
      expect(typeof platformBClient.notifyContractor).toBe("function");
      expect(typeof platformBClient.getSchedule).toBe("function");
    });

    it("has correct base URL", () => {
      expect(platformBClient.baseUrl).toBeDefined();
    });
  });
});
