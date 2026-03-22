import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CanvasNotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Canvas not found</h2>
      <p className="text-sm text-muted-foreground">
        This canvas may have been removed or moved.
      </p>
      <Button asChild>
        <Link href="/canvas">Back to canvases</Link>
      </Button>
    </div>
  );
}
