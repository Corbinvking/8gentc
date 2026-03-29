"use client";

import { useCallback, useRef, useState } from "react";
import { capturePrompt, captureLlmCall, startSession, endSession } from "@/lib/actions/telemetry";

export function useTelemetry(taskId: string, harnessType: string) {
  const sessionIdRef = useRef<string | null>(null);
  const [tokenCount, setTokenCount] = useState(0);
  const [promptCount, setPromptCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  const start = useCallback(async () => {
    const result = await startSession(taskId, harnessType);
    sessionIdRef.current = result.sessionId;
  }, [taskId, harnessType]);

  const stop = useCallback(async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }
  }, []);

  const logPrompt = useCallback(
    async (promptText: string) => {
      setPromptCount((c) => c + 1);
      const tokens = Math.ceil(promptText.length / 4);
      setTokenCount((c) => c + tokens);
      await capturePrompt(taskId, harnessType, promptText);
    },
    [taskId, harnessType]
  );

  const logLlmCall = useCallback(
    async (data: { model: string; inputTokens: number; outputTokens: number; latencyMs: number; cost: number }) => {
      setTokenCount((c) => c + data.inputTokens + data.outputTokens);
      setTotalCost((c) => c + data.cost);
      await captureLlmCall(taskId, data);
    },
    [taskId]
  );

  return {
    start,
    stop,
    logPrompt,
    logLlmCall,
    tokenCount,
    promptCount,
    totalCost,
    isActive: sessionIdRef.current !== null,
  };
}
