import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { KanbanPageClient } from "./KanbanPageClient";

export default async function KanbanPage() {
  const preloadedBoards = await preloadAuthQuery(api.kanban.listBoards);
  const preloadedTags = await preloadAuthQuery(api.tags.listTags);

  return (
    <KanbanPageClient
      preloadedBoards={preloadedBoards}
      preloadedTags={preloadedTags}
    />
  );
}
