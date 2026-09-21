import { z } from "zod";

export const phoneLoginSchema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone number"),
  notRobot: z.literal(true, { error: "Please confirm you're not a robot" }),
});

export type PhoneLoginValues = z.infer<typeof phoneLoginSchema>;

export const commentSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.email("Enter a valid email address"),
  comment: z.string().trim().min(3, "Write a comment").max(1000),
});

export type CommentValues = z.infer<typeof commentSchema>;
