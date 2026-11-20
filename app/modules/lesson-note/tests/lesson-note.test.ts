import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { describeNoteDraft } from "../index";

describe("describeNoteDraft", () => {
  it("is empty and cannot be saved before the Student writes anything", () => {
    expect(describeNoteDraft("", null)).toEqual({
      length: 0,
      maxLength: MAX_NOTE_LENGTH,
      status: "empty",
      canSave: false,
    });
  });

  it("treats a whitespace-only draft as empty", () => {
    const draft = describeNoteDraft("   \n ", null);
    expect(draft.status).toBe("empty");
    expect(draft.canSave).toBe(false);
  });

  it("treats a draft blanked out over a saved note as empty", () => {
    const draft = describeNoteDraft("  ", "an old note");
    expect(draft.status).toBe("empty");
    expect(draft.canSave).toBe(false);
  });

  it("is unsaved and can be saved once the Student types", () => {
    const draft = describeNoteDraft("generics are neat", null);
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
    expect(draft.length).toBe(17);
  });

  it("is saved when the box matches the saved note", () => {
    const draft = describeNoteDraft("my note", "my note");
    expect(draft.status).toBe("saved");
    expect(draft.canSave).toBe(false);
  });

  it("is unsaved when the box differs from the saved note", () => {
    const draft = describeNoteDraft("my note, edited", "my note");
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("allows a note of exactly the maximum length", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null);
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("refuses a note one character over the maximum", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(draft.status).toBe("too-long");
    expect(draft.canSave).toBe(false);
    expect(draft.length).toBe(MAX_NOTE_LENGTH + 1);
  });

  it("reports too long even when an over-long note was somehow saved", () => {
    const body = "a".repeat(MAX_NOTE_LENGTH + 1);
    expect(describeNoteDraft(body, body).status).toBe("too-long");
  });

  it("counts and compares the note as it will be saved, without surrounding whitespace", () => {
    const draft = describeNoteDraft("  my note \n", "my note");
    expect(draft.status).toBe("saved");
    expect(draft.length).toBe(7);
  });

  it("does not count surrounding whitespace towards the maximum", () => {
    const draft = describeNoteDraft(` ${"a".repeat(MAX_NOTE_LENGTH)} `, null);
    expect(draft.status).toBe("unsaved");
  });
});
