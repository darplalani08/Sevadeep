"use client";

// Accessible multi-select rendered as chips.
//
// Built on native checkbox inputs inside a fieldset so screen readers announce the group name
// and each option's checked state, and so the whole group is keyboard navigable with Tab/Space
// without any custom key handling.

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChipGroupProps = {
  /** Visible legend for the group. */
  legend: string;
  description?: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  name: string;
  required?: boolean;
  error?: string;
  className?: string;
};

export function ChipGroup({
  legend,
  description,
  options,
  value,
  onChange,
  name,
  required,
  error,
  className,
}: ChipGroupProps) {
  const errorId = `${name}-error`;
  const descriptionId = `${name}-description`;

  const toggle = (option: string) => {
    onChange(
      value.includes(option) ? value.filter((v) => v !== option) : [...value, option]
    );
  };

  return (
    <fieldset
      className={cn("space-y-2", className)}
      aria-describedby={cn(description && descriptionId, error && errorId) || undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="text-sm font-medium text-foreground">
        {legend}
        {required && " *"}
      </legend>
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value.includes(option);
          return (
            <label
              key={option}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background",
                checked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={option}
                checked={checked}
                onChange={() => toggle(option)}
                className="sr-only"
              />
              <Check
                aria-hidden
                className={cn("size-3.5 shrink-0", checked ? "opacity-100" : "opacity-0")}
              />
              {option}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
