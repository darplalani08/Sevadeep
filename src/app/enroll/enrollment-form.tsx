"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/common/chip-group";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { enrollmentSchema, type EnrollmentValues } from "@/lib/validations/enrollment";
import { studentClasses, supportTypes } from "@content/education";

type SubmittedApplication = {
  reference: string;
  trackingCode: string;
  status: string;
  submittedAt: string;
};

export function EnrollmentForm() {
  const [submitted, setSubmitted] = React.useState<SubmittedApplication | null>(null);
  const [duplicateReference, setDuplicateReference] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      studentName: "",
      guardianName: "",
      contactNumber: "",
      email: "",
      city: "",
      notes: "",
      supportNeeded: [],
      consent: false,
    },
  });

  // Double submissions are guarded three times over: the button is disabled while
  // `formState.isSubmitting` is true, react-hook-form refuses to re-enter its own handler, and
  // the server collapses an identical payload onto one row via a UNIQUE dedupe index (returning
  // 409 with the original reference).
  const onSubmit = async (values: EnrollmentValues) => {
    setFormError(null);
    setDuplicateReference(null);

    try {
      const response = await fetch("/api/enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, email: values.email || undefined }),
      });

      const body = (await response.json().catch(() => null)) as
        | (SubmittedApplication & {
            error?: string;
            code?: string;
            reference?: string;
            fieldErrors?: Record<string, string>;
          })
        | null;

      if (response.status === 409 && body?.reference) {
        setDuplicateReference(body.reference);
        setFormError(body.error ?? "This application has already been submitted.");
        return;
      }

      if (!response.ok || !body?.reference || !body?.trackingCode) {
        // Surface server-side field errors on the matching inputs.
        if (body?.fieldErrors) {
          for (const [field, message] of Object.entries(body.fieldErrors)) {
            form.setError(field as keyof EnrollmentValues, { message });
          }
        }
        setFormError(body?.error ?? "We could not save your application. Please try again.");
        return;
      }

      // Only now — after the server confirmed the row was committed — is this a success.
      setSubmitted({
        reference: body.reference,
        trackingCode: body.trackingCode,
        status: body.status,
        submittedAt: body.submittedAt,
      });
      toast.success("Application submitted", {
        description: `Your reference is ${body.reference}.`,
      });
    } catch {
      setFormError("We could not reach the server. Check that the site is running and retry.");
    }
  };

  if (submitted) {
    return <SubmissionReceipt application={submitted} />;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        {formError && (
          <div
            role="alert"
            className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p>{formError}</p>
              {duplicateReference && (
                <p className="mt-1.5">
                  Reference <span className="font-mono">{duplicateReference}</span> —{" "}
                  <Link href="/track" className="font-medium underline underline-offset-4">
                    track it here
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="studentName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student&apos;s Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Student's name" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="guardianName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent / Guardian Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Parent or guardian" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Number *</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    autoComplete="tel-national"
                    {...field}
                  />
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
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Optional"
                    autoComplete="email"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>Optional — we will call if no email is given.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="studentAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student&apos;s Age *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={3}
                    max={30}
                    placeholder="e.g. 12"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === "" ? undefined : Number(event.target.value)
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="studentClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Class *</FormLabel>
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {studentClasses.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Pune" autoComplete="address-level2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="supportNeeded"
          render={({ field, fieldState }) => (
            <FormItem>
              <ChipGroup
                name="supportNeeded"
                legend="Educational support needed"
                description="Select everything that applies."
                required
                options={supportTypes}
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anything else we should know?</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Optional — the student's situation, school name, preferred timings…"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consent"
          render={({ field, fieldState }) => (
            <FormItem>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={field.value === true}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  aria-invalid={fieldState.error ? true : undefined}
                  className="mt-0.5 size-4 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
                <span>
                  I agree to SevaDeep contacting me about this application and sharing it with the
                  partner NGO that can provide the support. *
                </span>
              </label>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Submitting…" : "Submit Application"}
        </Button>
      </form>
    </Form>
  );
}

function SubmissionReceipt({ application }: { application: SubmittedApplication }) {
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy — please note it down manually.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="size-7" />
      </span>
      <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
        Application submitted
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Saved to SevaDeep&apos;s records with the status{" "}
        <strong className="text-foreground">{application.status}</strong>. Note both values below
        — you need them together to check your status.
      </p>

      <dl className="mt-6 grid gap-3 text-left sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Application reference
          </dt>
          <dd className="mt-1 flex items-center justify-between gap-2">
            <span className="font-mono text-lg font-semibold text-foreground">
              {application.reference}
            </span>
            <button
              type="button"
              onClick={() => copy("Reference", application.reference)}
              aria-label="Copy application reference"
              className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Copy className="size-4" />
            </button>
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Private tracking code
          </dt>
          <dd className="mt-1 flex items-center justify-between gap-2">
            <span className="font-mono text-lg font-semibold tracking-widest text-foreground">
              {application.trackingCode}
            </span>
            <button
              type="button"
              onClick={() => copy("Tracking code", application.trackingCode)}
              aria-label="Copy tracking code"
              className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Copy className="size-4" />
            </button>
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        This code is shown once and is not stored in a readable form. Keep it safe.
      </p>

      <Link
        href={`/track?ref=${encodeURIComponent(application.reference)}`}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Go to application tracking
      </Link>
    </div>
  );
}
