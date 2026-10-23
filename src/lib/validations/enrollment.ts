import { z } from "zod";

import { studentClasses, supportTypes } from "@content/education";

// One schema, used by react-hook-form in the browser *and* by the route handler on the server,
// so client-side validation can never be the only gate.
//
// Note: every field's input and output type is identical (no `coerce`, no `transform`), which is
// what lets the same schema drive react-hook-form's generics and the API's `safeParse`.
export const enrollmentSchema = z.object({
  studentName: z.string().trim().min(2, "Enter the student's full name").max(100),
  guardianName: z.string().trim().min(2, "Enter the parent or guardian's name").max(100),
  contactNumber: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine(
      (value) => !value || /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value),
      "Enter a valid email address"
    ),
  studentAge: z
    .number({ error: "Enter the student's age" })
    .int("Age must be a whole number")
    .min(3, "Age must be at least 3")
    .max(30, "Age must be 30 or below"),
  studentClass: z.enum(studentClasses, { error: "Select the student's current class" }),
  city: z.string().trim().min(2, "Enter your city").max(80),
  supportNeeded: z
    .array(z.enum(supportTypes))
    .min(1, "Select at least one kind of support needed")
    .max(supportTypes.length),
  notes: z.string().trim().max(1000, "Please keep this under 1000 characters").optional(),
  consent: z
    .boolean()
    .refine(
      (value) => value === true,
      "Please confirm you agree to SevaDeep contacting you about this application"
    ),
});

export type EnrollmentValues = z.infer<typeof enrollmentSchema>;

export const trackingLookupSchema = z.object({
  reference: z
    .string()
    .trim()
    .regex(/^SD-\d{4}-\d{6}$/i, "References look like SD-2026-000001"),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6}$/, "Your tracking code is 6 letters and digits"),
});

export type TrackingLookupValues = z.infer<typeof trackingLookupSchema>;
