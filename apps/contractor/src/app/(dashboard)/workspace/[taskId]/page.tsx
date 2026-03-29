"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTelemetry } from "@/hooks/use-telemetry";
import { submitDeliverable } from "@/lib/actions/tasks";
import { callLlmViaGateway } from "@/lib/actions/llm";
import { saveWorkspaceState, loadWorkspaceState } from "@/lib/actions/workspace-state";
import { createAttestationRecord } from "@/lib/quality";
import { SubmissionChecklist } from "@/components/submission-checklist";
import { FileTree, getLanguageFromPath } from "@/components/file-tree";
import { ContentHarness } from "@/components/content-harness";
import { ResearchHarness } from "@/components/research-harness";
import { toast } from "sonner";
import { Code, FileText, Search, MessageSquare, Send, Coins, ChevronLeft, Loader2, Shield, Terminal } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { HarnessType } from "@8gent/shared";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const STORAGE_PREFIX = "harness_session_";
const AUTO_SAVE_INTERVAL_MS = 30_000;
const DEFAULT_FILE = "main.ts";

interface TaskInfo {
  title: string;
  description: string;
  harnessType: string;
  subtasks: string[];
  successCriteria: string[];
}

interface ContentIteration {
  prompt: string;
  output: string;
  timestamp: number;
}

interface ResearchSource {
  url: string;
  title: string;
  notes: string;
  addedAt: number;
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
  const [files, setFiles] = useState<Record<string, string>>({ [DEFAULT_FILE]: "// Start working here...\n" });
  const [activeFile, setActiveFile] = useState(DEFAULT_FILE);
  const [clarification, setClarification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showOutputPane, setShowOutputPane] = useState(false);
  const sessionStarted = useRef(false);

  // Content harness state
  const [contentText, setContentText] = useState("");
  const [contentIterations, setContentIterations] = useState<ContentIteration[]>([]);
  const [latestLlmContent, setLatestLlmContent] = useState<string | null>(null);

  // Research harness state
  const [researchSections, setResearchSections] = useState<Record<string, string>>({
    summary: "",
    keyFindings: "",
    analysis: "",
  });
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);

  const currentCode = files[activeFile] ?? "";

  const setCurrentCode = useCallback((value: string) => {
    setFiles((prev) => ({ ...prev, [activeFile]: value }));
  }, [activeFile]);

  // --- Persistence ---

  useEffect(() => {
    async function init() {
      if (sessionStarted.current) return;
      sessionStarted.current = true;
      telemetry.start();

      const localFiles = localStorage.getItem(`${STORAGE_PREFIX}${taskId}_files`);
      const localOutput = localStorage.getItem(`${STORAGE_PREFIX}${taskId}_output`);
      const localContent = localStorage.getItem(`${STORAGE_PREFIX}${taskId}_content`);
      const localResearch = localStorage.getItem(`${STORAGE_PREFIX}${taskId}_research`);

      if (localFiles) {
        try { setFiles(JSON.parse(localFiles)); } catch { /* ignore */ }
        const savedActive = localStorage.getItem(`${STORAGE_PREFIX}${taskId}_activeFile`);
        if (savedActive) setActiveFile(savedActive);
      }
      if (localOutput) setOutput(localOutput);
      if (localContent) setContentText(localContent);
      if (localResearch) {
        try {
          const parsed = JSON.parse(localResearch);
          if (parsed.sections) setResearchSections(parsed.sections);
          if (parsed.sources) setResearchSources(parsed.sources);
        } catch { /* ignore */ }
      }

      if (!localFiles && !localOutput) {
        try {
          const serverState = await loadWorkspaceState(taskId);
          if (serverState) {
            if (serverState.code) setFiles({ [DEFAULT_FILE]: serverState.code });
            setOutput(serverState.output);
            if (serverState.harnessType) setHarnessType(serverState.harnessType);
          }
        } catch { /* defaults */ }
      }
    }

    init();
    return () => { telemetry.stop(); };
  }, []);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${taskId}_files`, JSON.stringify(files));
    localStorage.setItem(`${STORAGE_PREFIX}${taskId}_activeFile`, activeFile);
  }, [files, activeFile, taskId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${taskId}_output`, output);
  }, [output, taskId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${taskId}_content`, contentText);
  }, [contentText, taskId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${taskId}_research`, JSON.stringify({ sections: researchSections, sources: researchSources }));
  }, [researchSections, researchSources, taskId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const allCode = Object.values(files).join("\n---FILE---\n");
      saveWorkspaceState(taskId, {
        code: allCode,
        output,
        harnessType,
        promptHistory: [],
        lastSavedAt: new Date().toISOString(),
      }).catch(() => {});
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [taskId, files, output, harnessType]);

  // --- File management ---

  function handleAddFile(path: string) {
    if (files[path] !== undefined) { toast.error("File already exists"); return; }
    setFiles((prev) => ({ ...prev, [path]: "" }));
    setActiveFile(path);
  }

  function handleDeleteFile(path: string) {
    if (Object.keys(files).length <= 1) return;
    const next = { ...files };
    delete next[path];
    setFiles(next);
    if (activeFile === path) setActiveFile(Object.keys(next)[0]);
  }

  function handleRenameFile(oldPath: string, newPath: string) {
    if (files[newPath] !== undefined) { toast.error("A file with that name already exists"); return; }
    const next = { ...files };
    next[newPath] = next[oldPath];
    delete next[oldPath];
    setFiles(next);
    if (activeFile === oldPath) setActiveFile(newPath);
  }

  // --- LLM prompt ---

  async function handlePromptSubmit() {
    if (!promptInput.trim() || llmLoading) return;
    const prompt = promptInput;
    setPromptInput("");
    setLlmLoading(true);

    setOutput((prev) => prev + `\n--- Prompt ---\n${prompt}\n\n`);

    try {
      const result = await callLlmViaGateway({ taskId, harnessType, prompt });

      telemetry.logLlmCall({
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
        cost: result.cost,
      });

      setOutput((prev) => prev + `--- Response (${result.model}) ---\n${result.content}\n\n`);

      if (harnessType === "coding" && result.content && !result.content.startsWith("[Error]")) {
        const fileBlockRegex = /```(\w+):(\S+)\n([\s\S]*?)```/g;
        let match;
        let routed = false;
        while ((match = fileBlockRegex.exec(result.content)) !== null) {
          const [, , filename, code] = match;
          setFiles((prev) => ({
            ...prev,
            [filename]: (prev[filename] ? prev[filename] + "\n\n" : "") + code,
          }));
          routed = true;
        }

        if (!routed) {
          const codeMatch = result.content.match(/```[\w]*\n([\s\S]*?)```/);
          if (codeMatch) {
            setCurrentCode(currentCode + "\n\n" + codeMatch[1]);
          }
        }
        if (!showOutputPane) setShowOutputPane(true);
      }

      if (harnessType === "content" && result.content && !result.content.startsWith("[Error]")) {
        setLatestLlmContent(result.content);
        setContentIterations((prev) => [...prev, { prompt, output: result.content, timestamp: Date.now() }]);
      }

      if (harnessType === "research" && result.content && !result.content.startsWith("[Error]")) {
        setOutput((prev) => prev);
      }
    } catch {
      setOutput((prev) => prev + `[Error] Failed to get LLM response\n\n`);
      toast.error("Failed to get AI response");
    } finally {
      setLlmLoading(false);
    }
  }

  // --- Submit ---

  function getDeliverableContent(): string {
    if (harnessType === "coding") {
      const fileEntries = Object.entries(files).map(([path, content]) => ({
        path,
        content,
        language: getLanguageFromPath(path),
      }));
      return JSON.stringify({ files: fileEntries }, null, 2);
    }
    if (harnessType === "content") return contentText;
    if (harnessType === "research") {
      let out = "";
      const sectionLabels: Record<string, string> = { summary: "Summary", keyFindings: "Key Findings", analysis: "Detailed Analysis" };
      for (const [key, label] of Object.entries(sectionLabels)) {
        const text = researchSections[key]?.trim();
        if (text) out += `## ${label}\n\n${text}\n\n`;
      }
      if (researchSources.length > 0) {
        out += "## Sources\n\n";
        researchSources.forEach((s, i) => {
          out += `[${i + 1}] ${s.title}${s.url ? ` — ${s.url}` : ""}${s.notes ? ` (${s.notes})` : ""}\n`;
        });
      }
      return out;
    }
    return output;
  }

  async function handleSubmitDeliverable(checkedItems: string[]) {
    setSubmitting(true);
    try {
      const content = getDeliverableContent();

      const attestation = createAttestationRecord(
        taskId,
        "current-user",
        harnessType as HarnessType,
        checkedItems,
        content,
        []
      );
      console.log("[Attestation]", JSON.stringify(attestation));

      const result = await submitDeliverable(taskId, content, []);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        await telemetry.stop();
        [
          `${STORAGE_PREFIX}${taskId}_files`,
          `${STORAGE_PREFIX}${taskId}_activeFile`,
          `${STORAGE_PREFIX}${taskId}_output`,
          `${STORAGE_PREFIX}${taskId}_content`,
          `${STORAGE_PREFIX}${taskId}_research`,
        ].forEach((k) => localStorage.removeItem(k));
        setShowChecklist(false);
        toast.success("Deliverable submitted!");
      }
    } catch {
      toast.error("Failed to submit deliverable");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Render ---

  const monacoLang = getLanguageFromPath(activeFile);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-3">
          <Link href="/tasks" className="rounded-lg p-1 hover:bg-[var(--color-muted)]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold">{taskInfo.title}</h1>
          <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs capitalize">{harnessType}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <Coins className="h-4 w-4" />
            <span>{telemetry.tokenCount.toLocaleString()} tokens</span>
            <span className="text-xs">· ${telemetry.totalCost.toFixed(4)}</span>
          </div>
          <button
            onClick={() => setShowChecklist(!showChecklist)}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-success)] px-4 py-2 text-sm font-medium text-white"
          >
            <Shield className="h-4 w-4" />
            {showChecklist ? "Close Checklist" : "Submit Deliverable"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Task Context + File Tree (coding) */}
        <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-[var(--color-border)]">
          {harnessType === "coding" ? (
            <div className="flex h-full flex-col">
              <FileTree
                files={files}
                activeFile={activeFile}
                onSelectFile={setActiveFile}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
              />
              <div className="border-t border-[var(--color-border)] p-3">
                <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Task</h4>
                <p className="text-xs text-[var(--color-muted-foreground)]">{taskInfo.description}</p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Task Context</h3>
              <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">{taskInfo.description}</p>
              {taskInfo.subtasks.length > 0 && (
                <>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Subtasks</h4>
                  <ul className="mb-4 space-y-1">
                    {taskInfo.subtasks.map((st, i) => (
                      <li key={i} className="text-sm"><input type="checkbox" className="mr-2" />{st}</li>
                    ))}
                  </ul>
                </>
              )}
              {taskInfo.successCriteria.length > 0 && (
                <>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Success Criteria</h4>
                  <ul className="space-y-1">
                    {taskInfo.successCriteria.map((cr, i) => (
                      <li key={i} className="text-sm text-[var(--color-muted-foreground)]">• {cr}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        {/* Center — Harness area */}
        <div className="flex flex-1 flex-col">
          {/* Harness tabs */}
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
            {harnessType === "coding" && (
              <button
                onClick={() => setShowOutputPane(!showOutputPane)}
                className={`ml-auto flex items-center gap-1 px-3 py-2 text-xs ${showOutputPane ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`}
              >
                <Terminal className="h-3.5 w-3.5" /> Output
              </button>
            )}
          </div>

          {/* Harness content */}
          <div className="flex-1 overflow-hidden">
            {harnessType === "coding" ? (
              <div className="flex h-full flex-col">
                <div className={showOutputPane ? "h-[60%]" : "h-full"}>
                  <MonacoEditor
                    height="100%"
                    language={monacoLang}
                    value={currentCode}
                    onChange={(value) => setCurrentCode(value ?? "")}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 16 }, wordWrap: "on" }}
                  />
                </div>
                {showOutputPane && (
                  <div className="h-[40%] border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-1">
                      <Terminal className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                      <span className="text-xs font-medium text-[var(--color-muted-foreground)]">LLM Output</span>
                    </div>
                    <pre className="h-[calc(100%-1.75rem)] overflow-y-auto bg-[#1e1e1e] p-3 font-mono text-xs text-[#d4d4d4]">
                      {output || "No output yet. Submit a prompt to see LLM responses here."}
                    </pre>
                  </div>
                )}
              </div>
            ) : harnessType === "content" ? (
              <ContentHarness
                content={contentText}
                onContentChange={setContentText}
                iterations={contentIterations}
                onRestoreIteration={(i) => setContentText(contentIterations[i].output)}
                latestLlmOutput={latestLlmContent}
                onAcceptGenerated={() => {
                  if (latestLlmContent) {
                    setContentText((prev) => (prev ? prev + "\n\n" : "") + latestLlmContent);
                    setLatestLlmContent(null);
                  }
                }}
              />
            ) : (
              <ResearchHarness
                sections={researchSections}
                onSectionChange={(key, val) => setResearchSections((prev) => ({ ...prev, [key]: val }))}
                sources={researchSources}
                onAddSource={(s) => setResearchSources((prev) => [...prev, { ...s, addedAt: Date.now() }])}
                onRemoveSource={(i) => setResearchSources((prev) => prev.filter((_, idx) => idx !== i))}
              />
            )}
          </div>

          {/* Prompt input */}
          <div className="border-t border-[var(--color-border)] p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePromptSubmit()}
                placeholder="Enter prompt for AI assistant..."
                disabled={llmLoading}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-60"
              />
              <button
                onClick={handlePromptSubmit}
                disabled={!promptInput.trim() || llmLoading}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)] disabled:opacity-50"
              >
                {llmLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {telemetry.promptCount} prompts sent · All calls route through Platform C LLM Gateway
            </p>
          </div>
        </div>

        {/* Right panel — Checklist or Clarifications */}
        <div className="w-64 flex-shrink-0 overflow-y-auto border-l border-[var(--color-border)]">
          {showChecklist ? (
            <div className="p-4">
              <SubmissionChecklist
                harnessType={harnessType}
                content={getDeliverableContent()}
                fileUrls={[]}
                onSubmit={handleSubmitDeliverable}
                submitting={submitting}
              />
            </div>
          ) : (
            <>
              <div className="border-b border-[var(--color-border)] p-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" /> Clarifications
                </h3>
              </div>
              <div className="flex h-[calc(100%-6rem)] flex-col p-3">
                <div className="flex-1 overflow-y-auto">
                  <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                    No clarification messages yet. Send a message to request information.
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
                  <button className="rounded bg-[var(--color-muted)] px-2 py-1 text-xs">Send</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
