import { z } from "zod";

// Username/password credentials for every account type. The OTP mock these replace never sent a
// code, accepted any six digits and created no session — see SEVADEEP_AUDIT.md §3.

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,31}$/,
    "3–32 characters: letters, digits, dots, hyphens and underscores"
  );

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username").max(64),
  password: z.string().min(1, "Enter your password").max(200),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Enter your name").max(120),
    username,
    password: z.string().min(12, "At least 12 characters").max(200),
    confirmPassword: z.string().min(1, "Confirm your password"),
    email: z
      .string()
      .trim()
      .max(120)
      .optional()
      .refine(
        (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v),
        "Enter a valid email address"
      ),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit number"),
    // NGO accounts only.
    organisation: z.string().trim().max(160).optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const commentSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.email("Enter a valid email address"),
  comment: z.string().trim().min(3, "Write a comment").max(1000),
});

export type CommentValues = z.infer<typeof commentSchema>;
