import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BlogPost } from "@content/blog";
import { getReadingTime } from "@content/blog";

export function BlogCard({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  const hasPhoto = !post.image.endsWith("sevadeep-r-logo.png");
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        {hasPhoto ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 380px, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5">
            <Flame className="size-10 text-primary/50" />
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">{post.category}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-heading text-lg leading-snug font-semibold text-foreground group-hover:text-primary">
          {post.title}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{post.paragraphs[0]}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {new Date(post.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {getReadingTime(post)} min read
          </span>
        </div>
      </div>
    </Link>
  );
}
