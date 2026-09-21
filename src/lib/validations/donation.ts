import { z } from "zod";

export const donationCategoryIds = [
  "clothes",
  "furniture",
  "appliances",
  "toys",
  "books",
  "shoes",
  "electronics",
  "bicycles",
  "food",
] as const;

export const donationItemSchema = z.object({
  category: z.enum(donationCategoryIds, { error: "Select a donation category" }),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(500),
  details: z.string().min(3, "Add a short description of the item").max(500),
});

export const donationDetailsSchema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  city: z.string().trim().min(2, "Enter your location/city"),
  fulfilment: z.enum(["pickup", "dropoff"], { error: "Choose pickup or drop-off" }),
  address: z.string().trim().min(5, "Enter the pickup/drop-off address").max(300),
  notes: z.string().max(500).optional(),
});

export const donationFormSchema = donationDetailsSchema.extend({
  items: z.array(donationItemSchema).min(1, "Add at least one item to donate"),
});

export type DonationDetailsValues = z.infer<typeof donationDetailsSchema>;
export type DonationFormValues = z.infer<typeof donationFormSchema>;
export type DonationItemValues = z.infer<typeof donationItemSchema>;
