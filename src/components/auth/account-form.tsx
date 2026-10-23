"use client";

// Username/password sign-in and registration for donor and NGO accounts.
//
// Replaces PhoneLoginForm, which was a mock: it sent no SMS, accepted any six digits and created
// no session. This one posts real credentials, and the server sets an httpOnly session cookie.
// The visual language is unchanged — same card, inputs, button and copy style as the rest of the
// site — so the two login pages look exactly as they did.

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  loginSchema,
  registerSchema,
  type LoginValues,
  type RegisterValues,
} from "@/lib/validations/auth";

type Role = "donor" | "ngo";
type Mode = "login" | "register";

function PasswordInput({
  id,
  autoComplete,
  ...field
}: React.ComponentProps<typeof Input> & { id: string }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className="pr-10"
        {...field}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function AccountForm({ role }: { role: Role }) {
  const [mode, setMode] = React.useState<Mode>("login");
  const label = role === "ngo" ? "NGO" : "Donor";

  return (
    <div>
      <div
        role="group"
        aria-label={`${label} account`}
        className="mb-5 inline-flex rounded-full border border-border bg-muted/50 p-1"
      >
        {(["login", "register"] as Mode[]).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className={
              mode === option
                ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {option === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <LoginForm role={role} onNeedAccount={() => setMode("register")} />
      ) : (
        <RegisterForm role={role} onHaveAccount={() => setMode("login")} />
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function LoginForm({ role, onNeedAccount }: { role: Role; onNeedAccount: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, role }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? "Sign-in failed.");
        return;
      }
      toast.success("Signed in");
      router.replace("/account");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username *</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="your username"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password *</FormLabel>
              <FormControl>
                <PasswordInput id="login-password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2 rounded-full"
          disabled={form.formState.isSubmitting}
        >
          <LogIn className="size-4" />
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <button
            type="button"
            onClick={onNeedAccount}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </button>
          .
        </p>
      </form>
    </Form>
  );
}

function RegisterForm({ role, onHaveAccount }: { role: Role; onHaveAccount: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      phone: "",
      organisation: "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email || undefined,
          phone: values.phone || undefined,
          organisation: values.organisation || undefined,
          role,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; fieldErrors?: Record<string, string> }
        | null;

      if (!response.ok) {
        if (body?.fieldErrors) {
          for (const [field, message] of Object.entries(body.fieldErrors)) {
            form.setError(field as keyof RegisterValues, { message });
          }
        }
        setError(body?.error ?? "Could not create the account.");
        return;
      }

      toast.success("Account created");
      router.replace("/account");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{role === "ngo" ? "Contact person *" : "Full name *"}</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {role === "ngo" && (
          <FormField
            control={form.control}
            name="organisation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organisation</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Registered NGO name"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username *</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. asha.patil"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                3–32 characters: letters, digits, dots, hyphens and underscores.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password *</FormLabel>
                <FormControl>
                  <PasswordInput id="register-password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password *</FormLabel>
                <FormControl>
                  <PasswordInput id="register-confirm" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="Optional"
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="Optional"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>Contact only — never used to sign in.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2 rounded-full"
          disabled={form.formState.isSubmitting}
        >
          <UserPlus className="size-4" />
          {form.formState.isSubmitting ? "Creating…" : `Create ${role === "ngo" ? "NGO" : "donor"} account`}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <button
            type="button"
            onClick={onHaveAccount}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </button>
          .
        </p>
      </form>
    </Form>
  );
}
