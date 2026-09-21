import { z } from "zod";

export const volunteerCategories = [
  "Field Visits & Pickups",
  "Content & Social Media",
  "Event Support",
  "NGO Onboarding",
  "Fundraising",
  "Other",
] as const;

export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const volunteerSchema = z.object({
  category: z.enum(volunteerCategories, { error: "Select how you'd like to serve" }),
  areaOfInterest: z.string().trim().min(2, "Tell us your area of interest").max(200),
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.email("Enter a valid email address"),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit WhatsApp number"),
  dateOfBirth: z.string().min(1, "Enter your date of birth"),
  bloodGroup: z.enum(bloodGroups, { error: "Select your blood group" }),
  aadhar: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Enter a valid 12-digit Aadhar number"),
});

export type VolunteerValues = z.infer<typeof volunteerSchema>;
