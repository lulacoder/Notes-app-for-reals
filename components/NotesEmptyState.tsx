import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceEmptyState } from "@/components/WorkspaceEmptyState";

interface NotesEmptyStateProps {
  onCreateNote: () => void;
  creating: boolean;
}

export function NotesEmptyState({ onCreateNote, creating }: NotesEmptyStateProps) {
  return (
    <WorkspaceEmptyState
      className="flex-1"
      icon={<FileText size={34} />}
      title="Make room for an idea."
      description="Create a note to start collecting your thoughts, or open Canvas to map them out."
    >
      <Button onClick={onCreateNote} disabled={creating}>
        <Plus size={16} /> {creating ? "Creating..." : "Create your first note"}
      </Button>
    </WorkspaceEmptyState>
  );
}
