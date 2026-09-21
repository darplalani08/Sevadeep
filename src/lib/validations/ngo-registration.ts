import { z } from "zod";

export const ngoRegistrationSchema = z.object({
  name: z.string().trim().min(2, "Enter the NGO name").max(150),
  email: z.email("Enter a valid email address"),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number (this will be the login ID)"),
  alternateMobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  state: z.string().trim().min(2, "Select a state"),
  city: z.string().trim().min(2, "Select a city"),
  area: z.string().trim().min(1, "Select a city area"),
  address: z.string().trim().min(5, "Enter the full address").max(300),
  awards: z.string().max(500).optional().or(z.literal("")),
  description: z.string().trim().min(20, "Describe the NGO's work in at least 20 characters").max(1000),
});

export type NgoRegistrationValues = z.infer<typeof ngoRegistrationSchema>;
