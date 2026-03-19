import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { CanvasListPageClient } from "./CanvasListPageClient";

export default async function CanvasListPage() {
  const preloadedCanvases = await preloadAuthQuery(api.canvases.listCanvases);

  return <CanvasListPageClient preloadedCanvases={preloadedCanvases} />;
}
