"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/common/chip-group";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MatchResults } from "@/components/volunteer/match-results";
import {
  defaultWeights,
  matchVolunteer,
  type MatchResult,
  type MatchWeights,
  type Opportunity,
} from "@/lib/matching/engine";
import { bloodGroups, volunteerCategories, volunteerSchema, type VolunteerValues } from "@/lib/validations/volunteer";
import { volunteerAvailability, volunteerInterests, volunteerSkills } from "@content/volunteering";

type RegistrationResult = {
  reference: string;
  matches: MatchResult[];
  weights: MatchWeights;
};

export function VolunteerForm() {
  const [result, setResult] = React.useState<RegistrationResult | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [duplicateReference, setDuplicateReference] = React.useState<string | null>(null);
  const [catalogue, setCatalogue] = React.useState<Opportunity[]>([]);
  const [weights, setWeights] = React.useState<MatchWeights>(defaultWeights);

  const form = useForm<VolunteerValues>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      areaOfInterest: "",
      fullName: "",
      email: "",
      mobile: "",
      dateOfBirth: "",
      aadhar: "",
      skills: [],
      interests: [],
      availability: [],
      preferredActivities: [],
    },
  });

  // The opportunity catalogue is administrator-owned, so it is fetched rather than bundled —
  // the preferred-activity picker and the live preview both score against the real rows.
  React.useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/opportunities", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const body = (await response.json()) as {
          opportunities: Opportunity[];
          weights: MatchWeights;
        };
        setCatalogue(body.opportunities ?? []);
        if (body.weights) setWeights(body.weights);
      } catch {
        // A missing catalogue only disables the optional preview; submission still works.
      }
    })();
    return () => controller.abort();
  }, []);

  // useWatch rather than form.watch(): the latter re-reads on every render, which makes the
  // React Compiler skip optimising this component entirely.
  const watchedSkills = useWatch({ control: form.control, name: "skills" });
  const watchedInterests = useWatch({ control: form.control, name: "interests" });
  const watchedAvailability = useWatch({ control: form.control, name: "availability" });
  const watchedPreferred = useWatch({ control: form.control, name: "preferredActivities" });

  // Live, client-side preview using the very same engine the server uses, so the volunteer sees
  // their ranking change as they tick boxes. The authoritative scores still come from the API.
  const preview = React.useMemo(() => {
    if (!catalogue.length) return [];
    if (!watchedSkills?.length && !watchedInterests?.length) return [];
    return matchVolunteer(
      {
        skills: watchedSkills ?? [],
        interests: watchedInterests ?? [],
        availability: watchedAvailability ?? [],
        preferredActivities: watchedPreferred ?? [],
      },
      catalogue,
      weights,
      { limit: 3 }
    );
  }, [catalogue, watchedSkills, watchedInterests, watchedAvailability, watchedPreferred, weights]);

  // Same three-layer double-submit guard as the enrolment form: the disabled button,
  // react-hook-form's own re-entry guard, and the server's UNIQUE dedupe index.
  const onSubmit = async (values: VolunteerValues) => {
    setFormError(null);
    setDuplicateReference(null);

    try {
      const response = await fetch("/api/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json().catch(() => null)) as
        | (RegistrationResult & {
            error?: string;
            reference?: string;
            fieldErrors?: Record<string, string>;
          })
        | null;

      if (response.status === 409 && body?.reference) {
        setDuplicateReference(body.reference);
        setFormError(body.error ?? "You have already registered with these details.");
        return;
      }

      if (!response.ok || !body?.reference) {
        if (body?.fieldErrors) {
          for (const [field, message] of Object.entries(body.fieldErrors)) {
            form.setError(field as keyof VolunteerValues, { message });
          }
        }
        setFormError(body?.error ?? "We could not save your registration. Please try again.");
        return;
      }

      setResult({
        reference: body.reference,
        matches: body.matches ?? [],
        weights: body.weights ?? weights,
      });
      toast.success("Registration saved", { description: `Your reference is ${body.reference}.` });
    } catch {
      setFormError("We could not reach the server. Check that the site is running and retry.");
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
            Thanks for volunteering!
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your registration is saved and a coordinator will reach out on WhatsApp. Registering is
            not the same as being accepted onto a role — the matches below are recommendations for
            that conversation.
          </p>
          <p className="mt-4 inline-block rounded-full bg-muted px-4 py-1.5 font-mono text-sm text-foreground">
            Reference: {result.reference}
          </p>
        </div>

        <MatchResults matches={result.matches} weights={result.weights} />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
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
                  Existing reference: <span className="font-mono">{duplicateReference}</span>
                </p>
              )}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How would you like to serve? *</FormLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {volunteerCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
          name="areaOfInterest"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area Of Interest *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Weekend pickups in Kothrud" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
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
                <FormLabel>Email Address *</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile (WhatsApp) *</FormLabel>
                <FormControl>
                  <Input placeholder="10-digit number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date Of Birth *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bloodGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Blood Group *</FormLabel>
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bloodGroups.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
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
            name="aadhar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aadhar Card *</FormLabel>
                <FormControl>
                  <Input placeholder="12-digit Aadhar number" {...field} />
                </FormControl>
                <FormDescription>
                  Only the last 4 digits are stored (XXXX-XXXX-1234).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-5 border-t border-border pt-6">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Your volunteering profile
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These three answers drive the match score: skills count for{" "}
              {Math.round(weights.skill * 100)}%, interests {Math.round(weights.interest * 100)}%
              and availability {Math.round(weights.availability * 100)}%.
            </p>
          </div>

          <FormField
            control={form.control}
            name="skills"
            render={({ field, fieldState }) => (
              <FormItem>
                <ChipGroup
                  name="skills"
                  legend="Skills you can offer"
                  description="Pick everything you're comfortable doing."
                  required
                  options={volunteerSkills}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="interests"
            render={({ field, fieldState }) => (
              <FormItem>
                <ChipGroup
                  name="interests"
                  legend="Causes that interest you"
                  required
                  options={volunteerInterests}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="availability"
            render={({ field, fieldState }) => (
              <FormItem>
                <ChipGroup
                  name="availability"
                  legend="When are you available?"
                  description="“Flexible” fits any schedule."
                  required
                  options={volunteerAvailability}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              </FormItem>
            )}
          />

          {catalogue.length > 0 && (
            <FormField
              control={form.control}
              name="preferredActivities"
              render={({ field, fieldState }) => (
                <FormItem>
                  <ChipGroup
                    name="preferredActivities"
                    legend="Activities you'd particularly like"
                    description="Optional — a named preference adds a small boost to that activity's score."
                    options={catalogue.map((o) => o.title)}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="hoursPerWeek"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Hours per week you can give</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    placeholder="Optional"
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
        </div>

        {preview.length > 0 && (
          <div
            aria-live="polite"
            className="rounded-xl border border-accent/40 bg-accent/5 p-4"
          >
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Sparkles className="size-4 text-accent-600 dark:text-accent-400" />
              Live preview of your top matches
            </p>
            <ul className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
              {preview.map((match) => (
                <li key={match.opportunityId} className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground">{match.title}</span>
                  <span className="font-mono text-xs font-semibold text-primary">
                    {match.score}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-xs text-muted-foreground">
              Recalculated as you edit. Submit to save your registration and see the full
              explanation for each match.
            </p>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Submitting…" : "Submit & See My Matches"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Looking for educational support instead?{" "}
          <Link href="/enroll" className="font-medium text-primary underline-offset-4 hover:underline">
            Student enrolment
          </Link>
          .
        </p>
      </form>
    </Form>
  );
}
