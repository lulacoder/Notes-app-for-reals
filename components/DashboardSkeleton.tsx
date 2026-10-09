export function DashboardSkeleton() {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" aria-busy="true" aria-label="Loading workspace">
      <header className="h-14 border-b px-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
        <span className="font-semibold">Noteworthy</span>
      </header>
      <NotesSkeleton />
    </div>
  );
}

export function NotesSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 w-full" aria-busy="true" aria-label="Loading notes">
      <aside className="hidden md:block w-64 shrink-0 border-r p-4 space-y-4">
        <div className="h-8 rounded bg-muted animate-pulse" />
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-12 rounded bg-muted animate-pulse" />
        ))}
      </aside>
      <div className="flex-1 p-6 space-y-5">
        <div className="h-9 w-1/3 rounded bg-muted animate-pulse" />
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
