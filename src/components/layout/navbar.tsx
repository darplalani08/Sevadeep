"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ChevronDown, Menu, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { contact, ngoNavGroup, primaryNav, siteConfig, studentNavGroup } from "@content/site";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  const isActive = (href: string) => {
    const base = href.split("#")[0];
    // Anchor links (e.g. "/#about") only point at a section of the home page, not a distinct
    // route, so they should never light up as "active" while browsing other pages.
    if (base === "" || base === "/") return false;
    return pathname.startsWith(base);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <motion.div
          initial={false}
          animate={{
            paddingBlock: scrolled ? 10 : 18,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "border-b transition-colors duration-300",
            scrolled
              ? "border-border/60 bg-background/75 shadow-sm backdrop-blur-lg supports-backdrop-filter:bg-background/60"
              : "border-transparent bg-transparent"
          )}
        >
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label={`${siteConfig.name} home`}>
              <Image
                src={siteConfig.logo}
                alt={`${siteConfig.name} logo`}
                width={40}
                height={40}
                className="size-9 sm:size-10"
                priority
              />
              <span className="flex flex-col leading-none">
                <span className="font-heading text-lg font-bold tracking-tight sm:text-xl">
                  <span className="text-primary">Seva</span>
                  <span className="text-accent-600 dark:text-accent-400">Deep</span>
                </span>
                <span className="hidden text-[0.65rem] font-medium tracking-wide text-muted-foreground sm:block">
                  {siteConfig.tagline}
                </span>
              </span>
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground",
                    isActive(item.href) && "text-foreground"
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <motion.span
                      layoutId="nav-active-indicator"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                  )}
                >
                  {studentNavGroup.label}
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {studentNavGroup.items.map((item) => (
                    <DropdownMenuItem key={item.href} render={<Link href={item.href}>{item.label}</Link>} />
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                  )}
                >
                  {ngoNavGroup.label}
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ngoNavGroup.items.map((item) => (
                    <DropdownMenuItem key={item.href} render={<Link href={item.href}>{item.label}</Link>} />
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <a
                href={contact.phoneHref}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "gap-1.5 rounded-full !bg-primary !text-primary-foreground hover:!bg-primary-600"
                )}
              >
                <Phone className="size-3.5" />
                {contact.phone}
              </a>
              <Link href="/donor-login" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}>
                Login
              </Link>
              <ThemeToggle />
            </div>

            <div className="flex items-center gap-1 lg:hidden">
              <ThemeToggle />
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                className="inline-flex size-9 items-center justify-center rounded-full text-foreground hover:bg-muted"
              >
                <Menu className="size-5" />
              </button>
            </div>
          </nav>
        </motion.div>
      </header>
      <MobileMenu open={mobileOpen} onOpenChange={setMobileOpen} isActive={isActive} />
      {/* Spacer so fixed header doesn't overlap page content */}
      <div aria-hidden className="h-[68px] sm:h-[76px]" />
    </>
  );
}
