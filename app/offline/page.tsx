"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CloudOff, FileText } from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Brand } from "@/components/marketing/Brand";
import type { Id } from "@/convex/_generated/dataModel";
import {
  noteText,
  offlineLibrary,
  offlineOwner,
  readCachedNote,
  writeDraft,
  type NoteText,
} from "@/lib/offline-notes";
import { getRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

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
  const storageFailed = message.startsWith("Device storage failed");
  return (
    <main className="mx-auto flex h-dvh max-w-4xl flex-col bg-background px-4 text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/40">
        <div className="flex min-w-0 items-center gap-3">
          {open && (
            <a
              href="/offline"
              aria-label="All offline notes"
              className="-ml-2 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </a>
          )}
          <Brand />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <CloudOff className="size-3.5" />
          Offline
        </span>
      </header>
      {open ? (
        <>
          <div className="flex items-center gap-2 pt-4">
            <input
              aria-label="Note title"
              placeholder="Untitled"
              className="min-w-0 flex-1 border-none bg-transparent text-xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50 sm:text-2xl"
              value={open.text.title}
              onChange={(event) => change({ title: event.target.value })}
            />
            <p
              role="status"
              className={cn(
                "shrink-0 text-xs",
                storageFailed ? "text-destructive" : "whitespace-nowrap text-muted-foreground",
              )}
            >
              {message}
            </p>
          </div>
          <div className="min-h-0 flex-1 py-3">
            <RichTextEditor
              content={open.text.content}
              onChange={(content) => change({ content })}
            />
          </div>
        </>
      ) : (
        <section className="min-h-0 flex-1 overflow-auto py-4">
          <h1 className="px-2 text-sm font-medium text-muted-foreground">Notes on this device</h1>
          {message && (
            <p role="status" className="px-2 pt-2 text-sm text-muted-foreground">
              {message}
            </p>
          )}
          {library && !library.titles.length && (
            <p className="px-2 pt-2 text-sm text-muted-foreground">No notes saved on this device yet.</p>
          )}
          <ul className="mt-2 space-y-0.5">
            {library?.titles.map((note) => {
              const draft = draftsByNote.get(note._id);
              const title = draft?.text.title || note.title || "Untitled";
              const readable = library.available.has(note._id) || !!draft;
              return (
                <li key={note._id}>
                  {readable ? (
                    <a
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-accent"
                      href={`/offline?note=${note._id}`}
                    >
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{title}</span>
                      </span>
                      {draft && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Edited offline {getRelativeTime(draft.updated)}
                        </span>
                      )}
                    </a>
                  ) : (
                    <div
                      className="flex items-center justify-between gap-3 px-2 py-2.5 text-muted-foreground"
                      title="Open this note online once to read it offline"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="size-4 shrink-0" />
                        <span className="truncate">{title}</span>
                      </span>
                      <span className="shrink-0 text-xs">Needs connection</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
