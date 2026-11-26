import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import {
  acknowledgeDraft,
  cacheNote,
  listDrafts,
  noteText,
  recordSubmittedIfCurrent,
  sameText,
  type LocalDraft,
  type NoteText,
} from "./offline-notes";

interface NoteClient {
  query(
    ref: typeof api.notes.getNote,
    args: FunctionArgs<typeof api.notes.getNote>,
  ): Promise<FunctionReturnType<typeof api.notes.getNote>>;
  mutation(
    ref: typeof api.notes.updateNote,
    args: FunctionArgs<typeof api.notes.updateNote>,
  ): Promise<FunctionReturnType<typeof api.notes.updateNote>>;
}

export interface DraftConflict {
  draft: LocalDraft;
  remote: NoteText | null;
}

const activeDrafts = new Set<string>();

export function holdDraft(key: string) {
  activeDrafts.add(key);
  let release: (() => void) | undefined;
  const untilClosed = new Promise<void>((resolve) => {
    release = resolve;
  });
  if (navigator.locks) void navigator.locks.request(key, () => untilClosed);
  return () => {
    activeDrafts.delete(key);
    release?.();
    window.dispatchEvent(new Event("noteworthy:draft-released"));
  };
}

// A new page may replay a mutation whose original acknowledgement was lost.
export async function syncDraft(
  client: NoteClient,
  draft: LocalDraft,
): Promise<DraftConflict | null> {
  const remote = await client.query(api.notes.getNote, { id: draft.id });
  if (!remote || remote.isDeleted || remote.userId !== draft.owner) return { draft, remote: null };
  if (
    !sameText(remote, draft.text) &&
    !sameText(remote, draft.base) &&
    !sameText(draft.submitted, remote)
  ) {
    await cacheNote(draft.owner, draft.id, remote);
    return { draft, remote: noteText(remote) };
  }
  if (!(await recordSubmittedIfCurrent(draft, remote))) return null;
  // Even a matching query snapshot must be confirmed by the server after reconnect.
  await client.mutation(api.notes.updateNote, {
    id: draft.id,
    ...draft.text,
    expected: noteText(remote),
    activeOnly: true,
  });
  await cacheNote(draft.owner, draft.id, draft.text);
  await acknowledgeDraft(draft.key, draft.text);
  return null;
}

export async function syncOfflineNotes(client: NoteClient, owner: string) {
  const conflicts: DraftConflict[] = [];
  let failed = false;
  let busy = false;
  for (const draft of await listDrafts(owner)) {
    if (activeDrafts.has(draft.key)) continue;
    async function sync() {
      const conflict = await syncDraft(client, draft);
      if (conflict) conflicts.push(conflict);
    }
    try {
      if (navigator.locks) {
        await navigator.locks.request(draft.key, { ifAvailable: true }, async (lock) => {
          if (lock) await sync();
          else busy = true;
        });
      } else await sync();
    } catch {
      failed = true;
    }
  }
  return { conflicts, failed, busy };
}
