import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const MAX_NOTE_VERSIONS = 50;

export async function trimNoteVersions(ctx: MutationCtx, noteId: Id<"notes">) {
  const versions = await ctx.db
    .query("noteVersions")
    .withIndex("by_note_created", (q) => q.eq("noteId", noteId))
    .order("desc")
    .collect();

  for (const version of versions.slice(MAX_NOTE_VERSIONS)) {
    await ctx.db.delete("noteVersions", version._id);
  }
}
