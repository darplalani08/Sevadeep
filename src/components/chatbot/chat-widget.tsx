"use client";

// Floating NGO assistance widget.
//
// All reasoning happens locally in src/lib/chatbot/engine.ts against the knowledge base in
// content/chatbot.ts — there is no network request and no AI provider, so replies are instant
// and work offline. The UI holds only presentation state; the matching logic is not duplicated
// here.

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Eraser, MessageCircle, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { answer, MAX_MESSAGE_LENGTH } from "@/lib/chatbot/engine";
import { chatbotKnowledgeBase, chatbotWelcome } from "@content/chatbot";

type ChatLink = { label: string; href: string };

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  links?: ChatLink[];
};

let messageCounter = 0;
const nextId = () => `m${(messageCounter += 1)}`;

function welcomeMessages(): ChatMessage[] {
  return [
    { id: nextId(), role: "assistant", text: chatbotWelcome.greeting },
    { id: nextId(), role: "assistant", text: chatbotWelcome.disclaimer },
  ];
}

const isExternal = (href: string) =>
  href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");

export function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>(welcomeMessages);
  const [suggestions, setSuggestions] = React.useState<string[]>(chatbotWelcome.suggestions);
  const [lastIntentId, setLastIntentId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [inputError, setInputError] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  React.useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes the panel from anywhere inside it.
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const send = React.useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) {
        setInputError("Type a question first.");
        return;
      }

      const truncated = text.slice(0, MAX_MESSAGE_LENGTH);
      setInputError(
        text.length > MAX_MESSAGE_LENGTH
          ? `Only the first ${MAX_MESSAGE_LENGTH} characters were read.`
          : null
      );

      const reply = answer(truncated, chatbotKnowledgeBase, lastIntentId);

      setMessages((previous) => [
        ...previous,
        { id: nextId(), role: "user", text: truncated },
        { id: nextId(), role: "assistant", text: reply.answer, links: reply.links },
      ]);
      setSuggestions(reply.suggestions.length ? reply.suggestions : chatbotWelcome.suggestions);
      setLastIntentId(reply.intentId);
      setDraft("");
    },
    [lastIntentId]
  );

  const clearConversation = () => {
    setMessages(welcomeMessages());
    setSuggestions(chatbotWelcome.suggestions);
    setLastIntentId(null);
    setInputError(null);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="SevaDeep assistant"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-x-4 bottom-20 z-50 flex max-h-[min(34rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[23.5rem]"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
              <div className="min-w-0">
                <p className="font-heading text-sm font-semibold">SevaDeep Assistant</p>
                <p className="truncate text-[0.7rem] text-primary-foreground/80">
                  Answers from SevaDeep&apos;s own information
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={clearConversation}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="inline-flex size-8 items-center justify-center rounded-full text-primary-foreground/90 transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                >
                  <Eraser className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                  className="inline-flex size-8 items-center justify-center rounded-full text-primary-foreground/90 transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
              data-lenis-prevent
            >
              <div aria-live="polite" aria-atomic="false" className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        message.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground"
                      )}
                    >
                      <p className="whitespace-pre-line">{message.text}</p>
                      {message.links && message.links.length > 0 && (
                        <ul className="mt-2.5 flex flex-wrap gap-1.5">
                          {message.links.map((link) => (
                            <li key={`${link.href}-${link.label}`}>
                              {isExternal(link.href) ? (
                                <a
                                  href={link.href}
                                  className="inline-flex items-center rounded-full border border-primary/30 bg-background px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                  {link.label}
                                </a>
                              ) : (
                                <Link
                                  href={link.href}
                                  onClick={() => setOpen(false)}
                                  className="inline-flex items-center rounded-full border border-primary/30 bg-background px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                  {link.label}
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="border-t border-border px-4 pt-3">
                <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Suggested
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        onClick={() => send(suggestion)}
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(draft);
              }}
              className="flex items-start gap-2 p-4 pt-3"
            >
              <div className="flex-1">
                <label htmlFor="chat-input" className="sr-only">
                  Ask the SevaDeep assistant a question
                </label>
                <input
                  id="chat-input"
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    if (inputError) setInputError(null);
                  }}
                  maxLength={MAX_MESSAGE_LENGTH}
                  autoComplete="off"
                  placeholder="Ask about enrolment, tracking, volunteering…"
                  aria-invalid={inputError ? true : undefined}
                  aria-describedby={inputError ? "chat-input-error" : undefined}
                  className="h-10 w-full rounded-full border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                />
                {inputError && (
                  <p id="chat-input-error" className="mt-1.5 px-2 text-xs text-destructive">
                    {inputError}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                className="size-10 shrink-0 rounded-full"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close SevaDeep assistant" : "Open SevaDeep assistant"}
        className="fixed right-4 bottom-4 z-50 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:right-6 sm:bottom-6"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </>
  );
}
