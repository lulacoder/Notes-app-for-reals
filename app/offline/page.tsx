"use client";

import { useEffect, useRef, useState } from "react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import type { Id } from "@/convex/_generated/dataModel";
import {
  noteText,
  offlineLibrary,
  offlineOwner,
  readCachedNote,
  writeDraft,
  type NoteText,
} from "@/lib/offline-notes";

interface OpenNote {
  id: Id<"notes">;
  key: string;
  base: NoteText;
  text: NoteText;
}

export default function OfflinePage() {
  const [library, setLibrary] = useState<Awaited<ReturnType<typeof offlineLibrary>>>();
  const [open, setOpen] = useState<OpenNote>();
  const [message, setMessage] = useState("Loading notes…");
  const [owner, setOwner] = useState<string | null>(null);
  const pending = useRef(Promise.resolve());
  const writeFailed = useRef(false);
  const opened = useRef<OpenNote | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const account = offlineOwner();
    const requested = new URLSearchParams(location.search).get("note");
    async function load() {
      if (!account) {
        setMessage("Sign in online to make notes available on this device.");
        return;
      }
      const items = await offlineLibrary(account);
      if (!alive || offlineOwner() !== account) return;
      setOwner(account);
      setLibrary(items);
      const id = items.titles.find((note) => note._id === requested)?._id;
      if (!id) {
        setMessage(requested ? "This note is unavailable offline." : "");
        return;
      }
      const cached = await readCachedNote(account, id);
      const drafts = items.drafts
        .filter((d) => d.id === id)
        .sort((a, b) => b.updated - a.updated);
      const draft = drafts[0];
      if (!alive) return;
      if (!cached && !draft) {
        setMessage("Open this note online once to read it offline.");
        return;
      }
      const base = draft?.base ?? noteText(cached!);
      const note = { id, key: draft?.key ?? crypto.randomUUID(), base, text: draft?.text ?? base };
      async function edit(lockGranted: boolean) {
        if (!alive) return;
        if (!lockGranted) {
          setMessage("This draft is open in another tab.");
          return;
        }
        opened.current = note;
        setOpen(note);
        setMessage(draft ? "Saved on this device" : "Available offline");
        await untilClosed;
      }
      if (navigator.locks)
        await navigator.locks.request(note.key, { ifAvailable: true }, (lock) => edit(!!lock));
      else await edit(true);
    }
    let release: (() => void) | undefined;
    const untilClosed = new Promise<void>((resolve) => {
      release = resolve;
    });
    void load().catch(() => {
      if (alive) setMessage("Could not read notes on this device.");
    });

    let probing = false;
    async function reconnect() {
      if (!navigator.onLine || probing || writeFailed.current) return;
      probing = true;
      try {
        const response = await fetch("/manifest.json", { cache: "no-store" });
        if (!response.ok || !(await response.json()).start_url) return;
        let writing;
        do {
          writing = pending.current;
          await writing;
        } while (writing !== pending.current);
        if (alive && !writeFailed.current)
          location.replace(requested ? `/notes/${encodeURIComponent(requested)}` : "/notes");
      } catch {
        /* Stay in the offline editor until the site is reachable. */
      } finally {
        probing = false;
      }
    }
    function accountChanged() {
      if (offlineOwner() !== account) location.reload();
    }
    window.addEventListener("storage", accountChanged);
    window.addEventListener("pageshow", accountChanged);
    window.addEventListener("online", reconnect);
    const interval = setInterval(reconnect, 10000);
    void reconnect();
    return () => {
      alive = false;
      release?.();
      clearInterval(interval);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("storage", accountChanged);
      window.removeEventListener("pageshow", accountChanged);
    };
  }, []);

  function change(fields: Partial<NoteText>) {
    const current = opened.current;
    if (!owner || !current || offlineOwner() !== owner) return;
    const text = { ...current.text, ...fields };
    const next = { ...current, text };
    opened.current = next;
    setOpen(next);
    setMessage("Saving on this device…");
    pending.current = writeDraft(current.key, owner, current.id, current.base, {
      ...text,
      title: text.title || "Untitled",
    })
      .then(() => {
        if (opened.current !== next) return;
        writeFailed.current = false;
        setMessage("Saved on this device");
      })
      .catch(() => {
        if (opened.current !== next) return;
        writeFailed.current = true;
        setMessage("Device storage failed. Copy your writing before closing.");
      });
  }
  const draftsByNote = new Map(
    library?.drafts.toSorted((a, b) => a.updated - b.updated).map((draft) => [draft.id, draft]),
  );
  return (
    <main className="mx-auto flex h-dvh max-w-4xl flex-col bg-background p-4 text-foreground">
      <header className="flex items-center justify-between gap-4 border-b py-3">
        <h1 className="text-lg font-semibold">Offline notes</h1>
        {open && (
          <a href="/offline" className="underline">
            All notes
          </a>
        )}
      </header>
      <p role="status" className="my-2 text-sm text-muted-foreground">
        {message}
      </p>
      {open ? (
        <>
          <input
            aria-label="Note title"
            className="py-3 text-2xl font-semibold"
            value={open.text.title}
            onChange={(event) => change({ title: event.target.value })}
          />
          <div className="min-h-0 flex-1">
            <RichTextEditor
              content={open.text.content}
              onChange={(content) => change({ content })}
            />
          </div>
        </>
      ) : (
        <ul className="overflow-auto">
          {library?.titles.map((note) => {
            const draft = draftsByNote.get(note._id);
            const title = draft?.text.title || note.title || "Untitled";
            return (
              <li key={note._id} className="border-b py-3">
                {library.available.has(note._id) || draft ? (
                  <a className="block underline" href={`/offline?note=${note._id}`}>
                    {title}
                  </a>
                ) : (
                  <span className="text-muted-foreground">{title} · Available online</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {library && !library.titles.length && <p>No notes saved on this device yet.</p>}
    </main>
  );
}
