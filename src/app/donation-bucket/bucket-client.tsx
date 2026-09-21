"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { CheckCircle2, Home, Minus, Package, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { submitDonation } from "@/lib/api/donations";
import { useDonationBucket } from "@/lib/donation-bucket-context";
import { donationDetailsSchema, donationCategoryIds, type DonationDetailsValues } from "@/lib/validations/donation";
import { donationCategories } from "@content/site";
import { getNgoById } from "@/lib/api/ngos";
import type { Ngo } from "@/lib/api/types";

const STEPS = ["Review Items", "Your Details", "Confirmation"] as const;

export function BucketClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ngoId = searchParams.get("ngo");
  const bucket = useDonationBucket();

  const [step, setStep] = React.useState(0);
  const [ngo, setNgo] = React.useState<Ngo | null>(null);
  const [addingItem, setAddingItem] = React.useState(false);
  const [newCategory, setNewCategory] = React.useState<string>("");
  const [newQty, setNewQty] = React.useState("1");
  const [newDetails, setNewDetails] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [referenceId, setReferenceId] = React.useState<string | null>(null);
  const [submittedDetails, setSubmittedDetails] = React.useState<DonationDetailsValues | null>(null);

  React.useEffect(() => {
    if (ngoId) getNgoById(ngoId).then(setNgo);
  }, [ngoId]);

  const form = useForm<DonationDetailsValues>({
    resolver: zodResolver(donationDetailsSchema),
    defaultValues: { mobile: "", fullName: "", city: "Pune", fulfilment: "pickup", address: "", notes: "" },
  });
  const fulfilment = useWatch({ control: form.control, name: "fulfilment" });

  const handleAddCustomItem = () => {
    if (!newCategory) {
      toast.error("Select a donation category");
      return;
    }
    const label = donationCategories.find((c) => c.id === newCategory)?.label ?? newCategory;
    bucket.addItem({ label, category: label, quantity: Math.max(1, Number(newQty) || 1) });
    setNewCategory("");
    setNewQty("1");
    setNewDetails("");
    setAddingItem(false);
    toast.success(`Added "${label}" to your bucket`);
  };

  const onSubmitDetails = async (values: DonationDetailsValues) => {
    setSubmitting(true);
    const result = await submitDonation({ ...values, items: bucket.items.map((i) => ({ category: i.category as never, quantity: i.quantity, details: i.label })) });
    setSubmitting(false);
    if (result.success) {
      setReferenceId(result.referenceId);
      setSubmittedDetails(values);
      setStep(2);
      bucket.clear();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "Donation Bucket" }]} />
          <h1 className="mt-3 text-display-3 font-heading font-semibold text-foreground">Donation Bucket</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {ngo ? `Donating to ${ngo.name}` : "Review your items, then choose pickup or drop-off."}
          </p>
        </Container>
      </div>

      <Section className="pt-10">
        <Container className="max-w-3xl">
          <ol className="mb-10 flex items-center justify-between">
            {STEPS.map((label, i) => (
              <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                      i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i < step ? <CheckCircle2 className="size-4" /> : i + 1}
                  </span>
                  <span className={cn("hidden text-sm font-medium sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className={cn("mx-2 h-0.5 flex-1 rounded-full", i < step ? "bg-primary" : "bg-muted")} />
                )}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {bucket.items.length === 0 && !addingItem ? (
                <EmptyState
                  title="Your bucket is empty"
                  description="Browse current NGO needs and click “Donate This”, or add a general item below."
                  actionLabel="Browse NGO Needs"
                  onAction={() => router.push("/ngo-needs")}
                />
              ) : (
                <div className="space-y-3">
                  {bucket.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Package className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category}
                          {item.ngoName ? ` · for ${item.ngoName}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => bucket.updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => bucket.updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        onClick={() => bucket.removeItem(item.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {addingItem ? (
                <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[2fr_1fr_auto]">
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v ?? "")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {donationCategoryIds.map((id) => (
                        <SelectItem key={id} value={id}>
                          {donationCategories.find((c) => c.id === id)?.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder="Qty"
                  />
                  <Button type="button" onClick={handleAddCustomItem} className="rounded-full">
                    Add
                  </Button>
                  <Textarea
                    value={newDetails}
                    onChange={(e) => setNewDetails(e.target.value)}
                    placeholder="Optional details about the item"
                    className="sm:col-span-3"
                  />
                </div>
              ) : (
                <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => setAddingItem(true)}>
                  <Plus className="size-4" /> Add another item
                </Button>
              )}

              <div className="mt-8 flex justify-end">
                <Button
                  size="lg"
                  className="rounded-full"
                  disabled={bucket.items.length === 0}
                  onClick={() => setStep(1)}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
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
                          <FormLabel>Mobile</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit mobile number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location / City</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fulfilment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How should we collect your donation?</FormLabel>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => field.onChange("pickup")}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors",
                              field.value === "pickup" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <Truck className="size-5" />
                            Doorstep Pickup
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange("dropoff")}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors",
                              field.value === "dropoff" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <Home className="size-5" />
                            I&apos;ll Drop It Off
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{fulfilment === "pickup" ? "Pickup Address" : "Drop-off Address"}</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Flat / street / landmark / pincode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Anything else we should know?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                      Back
                    </Button>
                    <Button type="submit" size="lg" className="rounded-full" disabled={submitting}>
                      {submitting ? "Confirming…" : "Confirm Donation"}
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}

          {step === 2 && referenceId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center shadow-sm"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="size-8" />
              </span>
              <h2 className="mt-5 font-heading text-2xl font-semibold text-foreground">Thank you, {submittedDetails?.fullName}!</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Your donation request has been received. Our team will {submittedDetails?.fulfilment === "pickup" ? "arrange a doorstep pickup" : "confirm your drop-off details"} shortly and keep you posted on WhatsApp/SMS.
              </p>
              <p className="mt-4 rounded-full bg-muted px-4 py-1.5 font-mono text-sm text-foreground">
                Reference: {referenceId}
              </p>
              <div className="mt-8 flex gap-3">
                <Link href="/" className={cn(buttonVariants(), "rounded-full")}>
                  Back to Home
                </Link>
                <Link href="/ngo-needs" className={cn(buttonVariants({ variant: "outline" }), "gap-2 rounded-full")}>
                  <ShoppingBag className="size-4" /> Donate More
                </Link>
              </div>
            </motion.div>
          )}
        </Container>
      </Section>
    </>
  );
}
