import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title = "No results found",
  description = "Try adjusting your search or filters.",
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <SearchX className="size-10 text-muted-foreground" />
      <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-5 rounded-full" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
