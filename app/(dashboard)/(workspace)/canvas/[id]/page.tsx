import { Suspense } from "react";
import { ContentSkeleton } from "@/components/DashboardSkeleton";
import type { Id } from "@/convex/_generated/dataModel";
import { preloadCanvas } from "@/lib/document-server";
import { CanvasEditorPageClient } from "./CanvasEditorPageClient";

async function CanvasEditorPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canvasId = id as Id<"canvases">;
  const preloadedCanvas = await preloadCanvas(canvasId);

  return <CanvasEditorPageClient canvasId={canvasId} preloadedCanvas={preloadedCanvas} />;
}

export default function CanvasEditorPage(props: { params: Promise<{ id: string }> }) {
 return <Suspense fallback={<ContentSkeleton />}><CanvasEditorPageContent {...props} /></Suspense>;
}
