"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTelemetry } from "@/hooks/use-telemetry";
import { submitDeliverable } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { Code, FileText, Search, MessageSquare, Send, Coins, ChevronLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface TaskInfo {
  title: string;
  description: string;
  harnessType: string;
  subtasks: string[];
  successCriteria: string[];
}

export default function WorkspacePage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [harnessType, setHarnessType] = useState("coding");
  const [taskInfo] = useState<TaskInfo>({
    title: "Task",
    description: "Loading task details...",
    harnessType: "coding",
    subtasks: [],
    successCriteria: [],
  });
  const telemetry = useTelemetry(taskId, harnessType);

  const [promptInput, setPromptInput] = useState("");
  const [output, setOutput] = useState("");
  const [code, setCode] = useState("// Start working here...\n");
  const [clarification, setClarification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    telemetry.start();
    return () => {
      telemetry.stop();
    };
  }, []);

  async function handlePromptSubmit() {
    if (!promptInput.trim()) return;
    await telemetry.logPrompt(promptInput);
    setOutput((prev) => prev + `\n--- Prompt submitted ---\n${promptInput}\n`);

    await telemetry.logLlmCall({
      model: "claude-3.5-sonnet",
      inputTokens: Math.ceil(promptInput.length / 4),
      outputTokens: 150,
      latencyMs: 1200,
      cost: 0.003,
    });

    setOutput((prev) => prev + `\n[AI response would appear here]\n`);
    setPromptInput("");
  }

  async function handleSubmitDeliverable() {
    setSubmitting(true);
    try {
      const content = harnessType === "coding" ? code : output;
      const result = await submitDeliverable(taskId, content, []);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        await telemetry.stop();
        toast.success("Deliverable submitted!");
      }
    } catch {
      toast.error("Failed to submit deliverable");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-3">
          <Link href="/tasks" className="rounded-lg p-1 hover:bg-[var(--color-muted)]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold">{taskInfo.title}</h1>
          <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs capitalize">
            {harnessType}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <Coins className="h-4 w-4" />
            <span>{telemetry.tokenCount.toLocaleString()} tokens</span>
            <span className="text-xs">· ${telemetry.totalCost.toFixed(4)}</span>
          </div>
          <button
            onClick={handleSubmitDeliverable}
            disabled={submitting}
            className="rounded-lg bg-[var(--color-success)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Deliverable"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — Task Context */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-[var(--color-border)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Task Context</h3>
          <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">{taskInfo.description}</p>

          {taskInfo.subtasks.length > 0 && (
            <>
              <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Subtasks</h4>
              <ul className="mb-4 space-y-1">
                {taskInfo.subtasks.map((st, i) => (
                  <li key={i} className="text-sm">
                    <input type="checkbox" className="mr-2" />
                    {st}
                  </li>
                ))}
              </ul>
            </>
          )}

          {taskInfo.successCriteria.length > 0 && (
            <>
              <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                Success Criteria
              </h4>
              <ul className="space-y-1">
                {taskInfo.successCriteria.map((cr, i) => (
                  <li key={i} className="text-sm text-[var(--color-muted-foreground)]">
                    • {cr}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Center Panel — Harness */}
        <div className="flex flex-1 flex-col">
          <div className="flex border-b border-[var(--color-border)]">
            {[
              { key: "coding", icon: Code, label: "Code" },
              { key: "content", icon: FileText, label: "Content" },
              { key: "research", icon: Search, label: "Research" },
            ].map((h) => (
              <button
                key={h.key}
                onClick={() => setHarnessType(h.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium ${
                  harnessType === h.key
                    ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)]"
                }`}
              >
                <h.icon className="h-3.5 w-3.5" />
                {h.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {harnessType === "coding" ? (
              <MonacoEditor
                height="100%"
                defaultLanguage="typescript"
                value={code}
                onChange={(value) => setCode(value ?? "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16 },
                  wordWrap: "on",
                }}
              />
            ) : (
              <div className="h-full p-4">
                <textarea
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  className="h-full w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  placeholder={
                    harnessType === "content"
                      ? "Content workspace — write and iterate on content here..."
                      : "Research workspace — compile sources and synthesis here..."
                  }
                />
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <div className="border-t border-[var(--color-border)] p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePromptSubmit()}
                placeholder="Enter prompt for AI assistant..."
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
              <button
                onClick={handlePromptSubmit}
                disabled={!promptInput.trim()}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {telemetry.promptCount} prompts sent · All prompts are captured for quality scoring
            </p>
          </div>
        </div>

        {/* Right Panel — Output / Communication */}
        <div className="w-72 flex-shrink-0 border-l border-[var(--color-border)]">
          <div className="border-b border-[var(--color-border)] p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" /> Clarifications
            </h3>
          </div>
          <div className="flex h-[calc(100%-6rem)] flex-col p-3">
            <div className="flex-1 overflow-y-auto">
              <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                No clarification messages yet.
                Send a message to request information.
              </p>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={clarification}
                onChange={(e) => setClarification(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs focus:outline-none"
              />
              <button className="rounded bg-[var(--color-muted)] px-2 py-1 text-xs">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
