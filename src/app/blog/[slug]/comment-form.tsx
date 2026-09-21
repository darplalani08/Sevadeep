"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { commentSchema, type CommentValues } from "@/lib/validations/auth";

export function CommentForm({ postSlug }: { postSlug: string }) {
  const [submitted, setSubmitted] = React.useState(false);
  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { name: "", email: "", comment: "" },
  });

  const onSubmit = async (values: CommentValues) => {
    void postSlug;
    void values;
    await new Promise((r) => setTimeout(r, 500));
    setSubmitted(true);
    form.reset();
    toast.success("Comment submitted for review");
  };

  return (
    <div className="mt-12 border-t border-border pt-8">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {submitted ? "Thanks for your comment!" : "Recent Comments (0)"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Submit a Comment — your email address will not be published.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Comment</FormLabel>
                <FormControl>
                  <Textarea placeholder="Write your comment…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-fit rounded-full sm:col-span-2" disabled={form.formState.isSubmitting}>
            Submit Comment
          </Button>
        </form>
      </Form>
    </div>
  );
}
