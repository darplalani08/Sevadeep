"use client";

import * as React from "react";
import { CheckCircle2, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { submitMealSponsorship } from "@/lib/api/donations";

const tiers = [
  { amount: 100, meals: 4 },
  { amount: 500, meals: 20 },
  { amount: 1000, meals: 40 },
  { amount: 2000, meals: 80 },
  { amount: 3000, meals: 120 },
  { amount: 4000, meals: 160 },
];

export function MealSponsorForm() {
  const [selected, setSelected] = React.useState<number | null>(3000);
  const [customAmount, setCustomAmount] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const amount = selected ?? (Number(customAmount) || 0);

  const handleContribute = async () => {
    if (!amount) {
      toast.error("Select a tier or enter an amount");
      return;
    }
    setSubmitting(true);
    const result = await submitMealSponsorship(amount);
    setSubmitting(false);
    if (result.success) setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Thank you for your contribution!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Rs. {amount.toLocaleString("en-IN")} sponsors meals for those who need them most.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
        <HeartHandshake className="size-5 text-primary" />
        Sponsor a meal for people
      </h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {tiers.map((tier) => (
          <button
            key={tier.amount}
            type="button"
            onClick={() => {
              setSelected(tier.amount);
              setCustomAmount("");
            }}
            className={cn(
              "rounded-xl border p-3 text-center transition-colors",
              selected === tier.amount ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            )}
          >
            <p className="font-heading text-lg font-bold text-foreground">₹{tier.amount.toLocaleString("en-IN")}/-</p>
            <p className="text-xs text-muted-foreground">meal for {tier.meals} people</p>
          </button>
        ))}
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-foreground">Other Amount</label>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rs.</span>
          <Input
            type="number"
            min={0}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelected(null);
            }}
            placeholder="0"
          />
        </div>
      </div>

      <Button size="lg" className="mt-6 w-full rounded-full" onClick={handleContribute} disabled={submitting}>
        {submitting ? "Processing…" : "Contribute"}
      </Button>
    </div>
  );
}
