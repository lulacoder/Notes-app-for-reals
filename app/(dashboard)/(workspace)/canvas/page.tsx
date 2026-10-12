import { Suspense } from "react";
import { ContentSkeleton } from "@/components/DashboardSkeleton";
import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { CanvasListPageClient } from "./CanvasListPageClient";

async function CanvasListPageContent() {
  const preloadedCanvases = await preloadAuthQuery(api.canvases.listCanvases);

  return <CanvasListPageClient preloadedCanvases={preloadedCanvases} />;
}

export default function CanvasListPage() {
 return <Suspense fallback={<ContentSkeleton />}><CanvasListPageContent /></Suspense>;
}
