import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { CalendarDays, Clock, Flame, User } from "lucide-react";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { BlogCard } from "@/components/cards/blog-card";
import { ShareButtons } from "./share-buttons";
import { CommentForm } from "./comment-form";
import { getBlogPost, getBlogPosts, getReadingTime, getRelatedPosts } from "@/lib/api/blog";
import { siteConfig } from "@content/site";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.paragraphs[0],
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.paragraphs[0], images: [{ url: post.image }] },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(slug);
  const url = `${siteConfig.url}/blog/${slug}`;

  return (
    <article>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container className="max-w-3xl">
          <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />
          <h1 className="mt-4 text-display-2 font-heading font-semibold text-balance text-foreground">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="size-4" /> {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {new Date(post.date).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> {getReadingTime(post)} min read
            </span>
          </div>
        </Container>
      </div>

      <Section className="pt-10">
        <Container className="max-w-3xl">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted">
            {post.image.endsWith("sevadeep-r-logo.png") ? (
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5">
                <Flame className="size-14 text-primary/50" />
              </div>
            ) : (
              <Image src={post.image} alt={post.title} fill priority sizes="768px" className="object-cover" />
            )}
          </div>

          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none text-[15px] leading-relaxed">
            {post.paragraphs.map((p) => (
              <p key={p.slice(0, 30)}>{p}</p>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <span className="text-sm font-medium text-foreground">Share this article</span>
            <ShareButtons url={url} title={post.title} />
          </div>

          <CommentForm postSlug={post.slug} />
        </Container>
      </Section>

      {related.length > 0 && (
        <Section className="bg-secondary/30 pt-0">
          <Container>
            <h2 className="font-heading text-xl font-semibold text-foreground">More from the blog</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </article>
  );
}
