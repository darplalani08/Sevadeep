import { Quote } from "lucide-react";

type TestimonialCardProps = {
  name: string;
  location: string;
  timeAgo: string;
  quote: string;
};

export function TestimonialCard({ name, location, timeAgo, quote }: TestimonialCardProps) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
      <Quote className="size-7 text-accent-500" />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary">
          {initial}
        </span>
        <div className="text-sm">
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-muted-foreground">
            {location} &middot; {timeAgo}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
