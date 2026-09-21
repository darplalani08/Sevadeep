"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitNgoRegistration } from "@/lib/api/donations";
import { ngoRegistrationSchema, type NgoRegistrationValues } from "@/lib/validations/ngo-registration";
import { puneAreas } from "@content/ngos";

export function NgoRegistrationForm() {
  const [referenceId, setReferenceId] = React.useState<string | null>(null);

  const form = useForm<NgoRegistrationValues>({
    resolver: zodResolver(ngoRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      alternateMobile: "",
      state: "Maharashtra",
      city: "Pune",
      area: "",
      address: "",
      awards: "",
      description: "",
    },
  });

  const onSubmit = async (values: NgoRegistrationValues) => {
    const result = await submitNgoRegistration(values);
    if (result.success) setReferenceId(result.referenceId);
  };

  if (referenceId) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
          Your NGO has registered successfully!
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Please wait for admin confirmation. We&apos;ll reach out on the mobile number you provided.
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
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NGO Name *</FormLabel>
                <FormControl><Input placeholder="Registered NGO name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl><Input placeholder="ngo@example.org" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile (Login Id) *</FormLabel>
                <FormControl><Input placeholder="10-digit mobile number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="alternateMobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alternate Mobile</FormLabel>
                <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>City Area</FormLabel>
                <FormControl>
                  <Input list="pune-areas" placeholder="Start typing your area…" {...field} />
                </FormControl>
                <datalist id="pune-areas">
                  {puneAreas.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address *</FormLabel>
              <FormControl><Textarea placeholder="Full address" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="awards"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Awards & Recognition</FormLabel>
              <FormControl><Textarea placeholder="Optional" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl><Textarea placeholder="Tell us about your NGO's work" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full rounded-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Submitting…" : "Submit"}
        </Button>
      </form>
    </Form>
  );
}
