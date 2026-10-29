import { preloadedQueryResult } from "convex/nextjs";
import { Suspense } from "react";
import { NotesSkeleton } from "@/components/DashboardSkeleton";
import { api } from "@/convex/_generated/api";
import { preloadAuthQuery, fetchAuthQuery } from "@/lib/auth-server";
import { KanbanPageClient } from "./KanbanPageClient";

async function KanbanPageContent({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const [preloadedBoards, preloadedTags] = await Promise.all([
    preloadAuthQuery(api.kanban.listBoards),
    preloadAuthQuery(api.tags.listTags),
  ]);
  const params = await searchParams;
  const boards = preloadedQueryResult(preloadedBoards);
  const firstBoard =
    boards.find((board) => board._id === params.board) ?? boards[0];
  const [columns, cards] = firstBoard
    ? await Promise.all([
        fetchAuthQuery(api.kanban.listColumns, { boardId: firstBoard._id }),
        fetchAuthQuery(api.kanban.listCards, { boardId: firstBoard._id }),
      ])
    : [[], []];

  return (
    <KanbanPageClient
      preloadedBoards={preloadedBoards}
      preloadedTags={preloadedTags}
      initialBoardData={
        firstBoard ? { boardId: firstBoard._id, columns, cards } : null
      }
    />
  );
}

export default function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <KanbanPageContent searchParams={searchParams} />
    </Suspense>
  );
}
