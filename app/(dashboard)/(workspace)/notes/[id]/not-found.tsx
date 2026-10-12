import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NoteNotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Note not found</h2>
      <p className="text-sm text-muted-foreground">
        This note may have been removed or moved.
      </p>
      <Button asChild>
        <Link href="/notes">Back to notes</Link>
      </Button>
    </div>
  );
}
