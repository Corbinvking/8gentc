"use client";

import { useState } from "react";
import { File, FolderOpen, Plus, Trash2, Edit2, Check, X } from "lucide-react";

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript", tsx: "typescriptreact",
  js: "javascript", jsx: "javascriptreact",
  py: "python", html: "html", css: "css",
  sql: "sql", json: "json", md: "markdown",
  sh: "shell", yml: "yaml", yaml: "yaml",
};

export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

interface FileTreeProps {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (path: string) => void;
  onAddFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
}

export function FileTree({ files, activeFile, onSelectFile, onAddFile, onDeleteFile, onRenameFile }: FileTreeProps) {
  const [adding, setAdding] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const sortedPaths = Object.keys(files).sort();

  function handleAdd() {
    const name = newFileName.trim();
    if (!name) return;
    onAddFile(name);
    setNewFileName("");
    setAdding(false);
  }

  function handleRename(oldPath: string) {
    const newPath = renameValue.trim();
    if (!newPath || newPath === oldPath) {
      setRenamingFile(null);
      return;
    }
    onRenameFile(oldPath, newPath);
    setRenamingFile(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
          <FolderOpen className="h-3.5 w-3.5" /> Files
        </h4>
        <button
          onClick={() => setAdding(true)}
          className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          title="New file"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {sortedPaths.map((path) => (
          <div key={path} className="group relative">
            {renamingFile === path ? (
              <div className="flex items-center gap-1 px-3 py-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(path);
                    if (e.key === "Escape") setRenamingFile(null);
                  }}
                  className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 py-0.5 text-xs focus:outline-none"
                  autoFocus
                />
                <button onClick={() => handleRename(path)} className="text-[var(--color-success)]">
                  <Check className="h-3 w-3" />
                </button>
                <button onClick={() => setRenamingFile(null)} className="text-[var(--color-muted-foreground)]">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSelectFile(path)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                  activeFile === path
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                }`}
              >
                <File className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{path}</span>
                <span className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100">
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingFile(path);
                      setRenameValue(path);
                    }}
                    className="rounded p-0.5 hover:bg-[var(--color-muted)]"
                  >
                    <Edit2 className="h-3 w-3" />
                  </span>
                  {sortedPaths.length > 1 && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(path);
                      }}
                      className="rounded p-0.5 text-[var(--color-destructive)] hover:bg-[var(--color-muted)]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  )}
                </span>
              </button>
            )}
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-1 px-3 py-1">
            <File className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewFileName(""); }
              }}
              placeholder="filename.ts"
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 py-0.5 text-xs focus:outline-none"
              autoFocus
            />
            <button onClick={handleAdd} className="text-[var(--color-success)]">
              <Check className="h-3 w-3" />
            </button>
            <button onClick={() => { setAdding(false); setNewFileName(""); }} className="text-[var(--color-muted-foreground)]">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
