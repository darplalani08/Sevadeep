"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Phone, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { contact, ngoNavGroup, primaryNav, siteConfig, studentNavGroup } from "@content/site";

type MobileMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: (href: string) => boolean;
};

export function MobileMenu({ open, onOpenChange, isActive }: MobileMenuProps) {
  const [ngoOpen, setNgoOpen] = React.useState(false);
  const [studentOpen, setStudentOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-y-0 right-0 z-[70] flex w-[85%] max-w-sm flex-col bg-background shadow-2xl lg:hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Link href="/" onClick={() => onOpenChange(false)} className="flex items-center gap-2">
                <Image src={siteConfig.logo} alt="" width={32} height={32} className="size-8" />
                <span className="font-heading text-lg font-bold">
                  <span className="text-primary">Seva</span>
                  <span className="text-accent-600 dark:text-accent-400">Deep</span>
                </span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => onOpenChange(false)}
                className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="flex flex-col gap-1">
                {primaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "block rounded-lg px-3 py-3 text-base font-medium",
                        isActive(item.href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => setStudentOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                    aria-expanded={studentOpen}
                  >
                    {studentNavGroup.label}
                    <ChevronDown className={cn("size-4 transition-transform", studentOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {studentOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-3"
                      >
                        {studentNavGroup.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => onOpenChange(false)}
                              className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setNgoOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                    aria-expanded={ngoOpen}
                  >
                    {ngoNavGroup.label}
                    <ChevronDown className={cn("size-4 transition-transform", ngoOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {ngoOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-3"
                      >
                        {ngoNavGroup.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => onOpenChange(false)}
                              className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              </ul>
            </nav>

            <div className="flex flex-col gap-2 border-t border-border p-5">
              <a href={contact.phoneHref} className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 rounded-full")}>
                <Phone className="size-4" />
                {contact.phone}
              </a>
              <Link
                href="/donor-login"
                onClick={() => onOpenChange(false)}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full rounded-full")}
              >
                Donor Login
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
