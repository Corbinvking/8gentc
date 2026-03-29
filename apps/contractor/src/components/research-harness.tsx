"use client";

import { useState } from "react";
import { Link as LinkIcon, Plus, Trash2, Check, BookOpen, Download, Copy, AlertCircle } from "lucide-react";

interface Source {
  url: string;
  title: string;
  notes: string;
  addedAt: number;
}

interface ResearchHarnessProps {
  sections: Record<string, string>;
  onSectionChange: (key: string, value: string) => void;
  sources: Source[];
  onAddSource: (source: Omit<Source, "addedAt">) => void;
  onRemoveSource: (index: number) => void;
}

const SECTION_KEYS = [
  { key: "summary", label: "Summary", placeholder: "High-level summary of findings..." },
  { key: "keyFindings", label: "Key Findings", placeholder: "Bullet-point key findings..." },
  { key: "analysis", label: "Detailed Analysis", placeholder: "In-depth analysis and discussion..." },
];

export function ResearchHarness({
  sections,
  onSectionChange,
  sources,
  onAddSource,
  onRemoveSource,
}: ResearchHarnessProps) {
  const [showSources, setShowSources] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [copied, setCopied] = useState(false);

  function handleAddSource() {
    if (!newUrl.trim() && !newTitle.trim()) return;
    onAddSource({ url: newUrl.trim(), title: newTitle.trim() || newUrl.trim(), notes: newNotes.trim() });
    setNewUrl("");
    setNewTitle("");
    setNewNotes("");
  }

  const citedIndices = new Set<number>();
  const allSectionText = Object.values(sections).join(" ");
  sources.forEach((_, i) => {
    if (allSectionText.includes(`[${i + 1}]`)) {
      citedIndices.add(i);
    }
  });
  const uncitedCount = sources.length - citedIndices.size;

  function compileOutput(): string {
    let out = "";
    for (const { key, label } of SECTION_KEYS) {
      const text = sections[key]?.trim();
      if (text) {
        out += `## ${label}\n\n${text}\n\n`;
      }
    }
    if (sources.length > 0) {
      out += "## Sources\n\n";
      sources.forEach((s, i) => {
        out += `[${i + 1}] ${s.title}${s.url ? ` — ${s.url}` : ""}${s.notes ? ` (${s.notes})` : ""}\n`;
      });
    }
    return out;
  }

  function handleCopy() {
    navigator.clipboard.writeText(compileOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([compileOutput()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research-output.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main sections */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5">
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase">Structured Research</span>
          </div>
          <div className="flex gap-1">
            <button onClick={handleCopy} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]">
              <Download className="h-3 w-3" /> Download
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-0 overflow-y-auto">
          {SECTION_KEYS.map(({ key, label, placeholder }) => (
            <div key={key} className="border-b border-[var(--color-border)]">
              <div className="bg-[var(--color-muted)]/50 px-4 py-1.5">
                <h4 className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">{label}</h4>
              </div>
              <textarea
                value={sections[key] ?? ""}
                onChange={(e) => onSectionChange(key, e.target.value)}
                className="w-full resize-none bg-[var(--color-background)] px-4 py-3 text-sm focus:outline-none"
                placeholder={placeholder}
                rows={key === "analysis" ? 10 : 4}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sources sidebar */}
      {showSources && (
        <div className="w-64 flex-shrink-0 overflow-y-auto border-l border-[var(--color-border)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
              <LinkIcon className="h-3.5 w-3.5" /> Sources ({sources.length})
            </h4>
            {uncitedCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-[var(--color-warning)]">
                <AlertCircle className="h-3 w-3" /> {uncitedCount} uncited
              </span>
            )}
          </div>

          <div className="p-3 space-y-2">
            {sources.map((source, i) => (
              <div key={i} className={`rounded-lg border p-2 text-xs ${citedIndices.has(i) ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5" : "border-[var(--color-border)]"}`}>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] font-bold text-[var(--color-muted-foreground)]">[{i + 1}]</span>
                  <button onClick={() => onRemoveSource(i)} className="text-[var(--color-destructive)] hover:opacity-70">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-0.5 font-medium">{source.title}</p>
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-[var(--color-primary)] hover:underline">
                    {source.url}
                  </a>
                )}
                {source.notes && <p className="mt-0.5 text-[var(--color-muted-foreground)]">{source.notes}</p>}
              </div>
            ))}

            <div className="space-y-1.5 rounded-lg border border-dashed border-[var(--color-border)] p-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Source title"
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs focus:outline-none"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs focus:outline-none"
              />
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAddSource()}
              />
              <button onClick={handleAddSource} className="flex w-full items-center justify-center gap-1 rounded bg-[var(--color-muted)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-border)]">
                <Plus className="h-3 w-3" /> Add Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
