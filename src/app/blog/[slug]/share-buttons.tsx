"use client";

import * as React from "react";
import { Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FacebookIcon, LinkedInIcon, XIcon } from "@/components/common/social-icons";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [canNativeShare, setCanNativeShare] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator.share is client-only; must run post-mount to avoid a hydration mismatch
  React.useEffect(() => setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const shareLinks = [
    {
      label: "Facebook",
      icon: FacebookIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "X",
      icon: XIcon,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      label: "LinkedIn",
      icon: LinkedInIcon,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {shareLinks.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Share on ${s.label}`}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <s.icon className="size-4" />
        </a>
      ))}
      <Button variant="outline" size="icon" aria-label="Copy link" onClick={copyLink}>
        <Link2 className="size-4" />
      </Button>
      {canNativeShare && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Share"
          onClick={() => navigator.share({ title, url }).catch(() => {})}
        >
          <Share2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
