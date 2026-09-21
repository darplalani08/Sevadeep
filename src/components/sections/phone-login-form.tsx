"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requestOtp } from "@/lib/api/donations";
import { phoneLoginSchema, type PhoneLoginValues } from "@/lib/validations/auth";

export function PhoneLoginForm({ role }: { role: "NGO" | "Donor" }) {
  const [otpSent, setOtpSent] = React.useState(false);
  const [otp, setOtp] = React.useState("");

  const form = useForm<PhoneLoginValues>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { mobile: "", notRobot: undefined },
  });

  const onSubmit = async (values: PhoneLoginValues) => {
    const result = await requestOtp(values.mobile);
    if (result.success) {
      setOtpSent(true);
      toast.success(`OTP sent to ${values.mobile}`);
    }
  };

  if (otpSent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">Enter the OTP</h3>
          <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to {form.getValues("mobile")}</p>
        </div>
        <Input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit OTP"
          className="text-center tracking-[0.5em]"
          maxLength={6}
        />
        <Button
          className="w-full rounded-full"
          disabled={otp.length !== 6}
          onClick={() => toast.success(`${role} login successful (demo)`) }
        >
          <CheckCircle2 className="size-4" /> Verify &amp; Continue
        </Button>
        <button type="button" onClick={() => setOtpSent(false)} className="text-sm text-muted-foreground hover:text-foreground">
          Change number
        </button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="10 Digit Phone Number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notRobot"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <FormControl>
                  <Checkbox checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} />
                </FormControl>
                <span className="text-sm text-muted-foreground">I&apos;m not a robot</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full rounded-full" size="lg" disabled={form.formState.isSubmitting}>
          Get OTP
        </Button>
      </form>
    </Form>
  );
}
