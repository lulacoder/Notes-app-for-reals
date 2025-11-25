import { formatDistanceToNow } from "date-fns";

export function getRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}
