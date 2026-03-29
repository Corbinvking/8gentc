"use client";

import { useState, useMemo } from "react";
import { Eye, History, Download, ChevronDown, Copy, Check, RotateCcw } from "lucide-react";

interface Iteration {
  prompt: string;
  output: string;
  timestamp: number;
}

interface ContentHarnessProps {
  content: string;
  onContentChange: (content: string) => void;
  iterations: Iteration[];
  onRestoreIteration: (index: number) => void;
  latestLlmOutput: string | null;
  onAcceptGenerated: () => void;
}

export function ContentHarness({
  content,
  onContentChange,
  iterations,
  onRestoreIteration,
  latestLlmOutput,
  onAcceptGenerated,
}: ContentHarnessProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  const previewHtml = useMemo(() => simpleMarkdownToHtml(content), [content]);

  function handleCopy(format: "markdown" | "plain") {
    const text = format === "plain" ? content.replace(/[#*_`~\[\]]/g, "") : content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deliverable.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5">
        <div className="flex gap-1">
          <button
            onClick={() => { setShowPreview(!showPreview); setShowHistory(false); }}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${showPreview ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"}`}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
          <button
            onClick={() => { setShowHistory(!showHistory); setShowPreview(false); }}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${showHistory ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"}`}
          >
            <History className="h-3 w-3" /> History ({iterations.length})
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            <Download className="h-3 w-3" /> Export <ChevronDown className="h-3 w-3" />
          </button>
          {showExport && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-lg">
              <button onClick={() => { handleCopy("markdown"); setShowExport(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-muted)]">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy as Markdown
              </button>
              <button onClick={() => { handleCopy("plain"); setShowExport(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-muted)]">
                <Copy className="h-3 w-3" /> Copy as Plain Text
              </button>
              <button onClick={() => { handleDownload(); setShowExport(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-muted)]">
                <Download className="h-3 w-3" /> Download as .md
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LLM generation preview banner */}
      {latestLlmOutput && (
        <div className="border-b border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-primary)]">AI Generated Content</span>
            <div className="flex gap-1">
              <button onClick={onAcceptGenerated} className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-xs text-[var(--color-primary-foreground)]">
                Accept
              </button>
            </div>
          </div>
          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-[var(--color-foreground)]">{latestLlmOutput.slice(0, 500)}{latestLlmOutput.length > 500 ? "..." : ""}</pre>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main editor */}
        <div className={`flex-1 ${showHistory ? "border-r border-[var(--color-border)]" : ""}`}>
          {showPreview ? (
            <div className="h-full overflow-y-auto p-4 prose-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="h-full w-full resize-none bg-[var(--color-background)] p-4 text-sm focus:outline-none"
              placeholder="Write or paste your content here. Use prompts below to generate AI content..."
            />
          )}
        </div>

        {/* Iteration history sidebar */}
        {showHistory && (
          <div className="w-64 flex-shrink-0 overflow-y-auto">
            <div className="p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Iteration History</h4>
              {iterations.length === 0 ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">No iterations yet. Submit prompts to build history.</p>
              ) : (
                <div className="space-y-2">
                  {iterations.map((iter, i) => (
                    <div key={i} className="rounded-lg border border-[var(--color-border)] p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                          #{i + 1} · {new Date(iter.timestamp).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={() => onRestoreIteration(i)}
                          className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-primary)] hover:bg-[var(--color-muted)]"
                        >
                          <RotateCcw className="h-2.5 w-2.5" /> Restore
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--color-foreground)]">
                        <strong>Prompt:</strong> {iter.prompt.slice(0, 60)}...
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                        {iter.output.slice(0, 80)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function simpleMarkdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>").replace(/$/, "</p>");
}
