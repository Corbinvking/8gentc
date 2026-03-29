import { NoteEditorPage } from "@/components/workspace/note-editor-page";

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  return <NoteEditorPage noteId={noteId} />;
}
