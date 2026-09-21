"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitVolunteerApplication } from "@/lib/api/donations";
import { bloodGroups, volunteerCategories, volunteerSchema, type VolunteerValues } from "@/lib/validations/volunteer";

export function VolunteerForm() {
  const [referenceId, setReferenceId] = React.useState<string | null>(null);

  const form = useForm<VolunteerValues>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      areaOfInterest: "",
      fullName: "",
      email: "",
      mobile: "",
      dateOfBirth: "",
      aadhar: "",
    },
  });

  const onSubmit = async (values: VolunteerValues) => {
    const result = await submitVolunteerApplication(values);
    if (result.success) setReferenceId(result.referenceId);
  };

  if (referenceId) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">Thanks for volunteering!</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          We&apos;ve received your application and will reach out on WhatsApp shortly.
        </p>
        <p className="mt-4 rounded-full bg-muted px-4 py-1.5 font-mono text-sm text-foreground">
          Reference: {referenceId}
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How would you like to serve? *</FormLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {volunteerCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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
              <FormControl><Input placeholder="e.g. Weekend pickups in Kothrud" {...field} /></FormControl>
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
                <FormControl><Input placeholder="Your name" {...field} /></FormControl>
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
                <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
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
                <FormControl><Input placeholder="10-digit number" {...field} /></FormControl>
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
                <FormControl><Input type="date" {...field} /></FormControl>
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
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bloodGroups.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
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
                <FormControl><Input placeholder="12-digit Aadhar number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="lg" className="w-full rounded-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Submitting…" : "Submit Application"}
        </Button>
      </form>
    </Form>
  );
}
