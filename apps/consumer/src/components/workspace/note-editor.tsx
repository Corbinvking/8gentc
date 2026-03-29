"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useCallback, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  editable?: boolean;
}

const DEBOUNCE_MS = 800;

export function NoteEditor({
  content,
  onUpdate,
  editable = true,
}: NoteEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const flushPendingSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingContentRef.current !== null) {
      onUpdateRef.current(pendingContentRef.current);
      pendingContentRef.current = null;
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      pendingContentRef.current = html;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pendingContentRef.current = null;
        onUpdateRef.current(html);
        debounceRef.current = null;
      }, DEBOUNCE_MS);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc dark:prose-invert max-w-none min-h-[300px] focus:outline-none px-6 py-4",
      },
    },
  });

  useEffect(() => {
    const handleBeforeUnload = () => flushPendingSave();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            icon={Bold}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            icon={Italic}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            icon={Strikethrough}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            icon={Code}
          />
          <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive("heading", { level: 1 })}
            icon={Heading1}
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
            icon={Heading2}
          />
          <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            icon={List}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            icon={ListOrdered}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive("taskList")}
            icon={CheckSquare}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            icon={Quote}
          />
          <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
          <ToolbarButton
            onClick={setLink}
            active={editor.isActive("link")}
            icon={LinkIcon}
          />
          <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            active={false}
            icon={Undo}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            active={false}
            icon={Redo}
          />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  icon: Icon,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded p-1.5 transition-colors",
        active
          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
