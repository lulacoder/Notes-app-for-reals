import { Suspense } from "react";
import { NotesSkeleton } from "@/components/DashboardSkeleton";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { CanvasEditorPageClient } from "./CanvasEditorPageClient";

async function CanvasEditorPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canvasId = id as Id<"canvases">;
  const preloadedCanvas = await preloadAuthQuery(api.canvases.getCanvas, { id: canvasId });

  return <CanvasEditorPageClient canvasId={canvasId} preloadedCanvas={preloadedCanvas} />;
}

export default function CanvasEditorPage(props: { params: Promise<{ id: string }> }) {
 return <Suspense fallback={<NotesSkeleton />}><CanvasEditorPageContent {...props} /></Suspense>;
}
