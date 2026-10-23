import { z } from "zod";

import { volunteerAvailability, volunteerInterests, volunteerSkills } from "@content/volunteering";

export const volunteerCategories = [
  "Field Visits & Pickups",
  "Content & Social Media",
  "Event Support",
  "NGO Onboarding",
  "Fundraising",
  "Other",
] as const;

export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

// The original SevaDeep volunteer fields, plus the skill/interest/availability profile the
// matching engine scores against. One schema is shared by the browser form and the route handler.
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

  skills: z.array(z.enum(volunteerSkills)).min(1, "Select at least one skill").max(volunteerSkills.length),
  interests: z
    .array(z.enum(volunteerInterests))
    .min(1, "Select at least one cause that interests you")
    .max(volunteerInterests.length),
  availability: z
    .array(z.enum(volunteerAvailability))
    .min(1, "Tell us when you're available")
    .max(volunteerAvailability.length),
  preferredActivities: z.array(z.string().trim().max(120)).max(20).optional(),
  hoursPerWeek: z
    .number()
    .int("Enter whole hours")
    .min(1, "Enter at least 1 hour")
    .max(60, "60 hours a week is the maximum")
    .optional(),
});

export type VolunteerValues = z.infer<typeof volunteerSchema>;
