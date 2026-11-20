import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftStatus = "empty" | "unsaved" | "saved" | "too-long";

export type NoteDraft = {
  length: number;
  maxLength: number;
  status: NoteDraftStatus;
  canSave: boolean;
};

// The action trims a note before it saves it, so the draft is judged trimmed.
export function describeDraft(
  draft: string,
  savedBody: string | null
): NoteDraft {
  const trimmed = draft.trim();
  const status = statusOf(trimmed, savedBody);
  return {
    length: trimmed.length,
    maxLength: MAX_NOTE_LENGTH,
    status,
    canSave: status === "unsaved",
  };
}

function statusOf(trimmed: string, savedBody: string | null): NoteDraftStatus {
  if (trimmed.length > MAX_NOTE_LENGTH) return "too-long";
  if (trimmed.length === 0) return "empty";
  if (trimmed === savedBody) return "saved";
  return "unsaved";
}
