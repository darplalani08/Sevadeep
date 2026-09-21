// Mock submission endpoints. Each simulates network latency and returns a typed result so
// forms can be wired to a real backend (Firebase Functions, REST, etc.) later by editing only
// this file.
import type { DonationFormValues } from "@/lib/validations/donation";
import type { NgoRegistrationValues } from "@/lib/validations/ngo-registration";
import type { VolunteerValues } from "@/lib/validations/volunteer";

function delay<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type SubmissionResult = { success: true; referenceId: string } | { success: false; error: string };

function makeReferenceId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function submitDonation(values: DonationFormValues): Promise<SubmissionResult> {
  void values;
  return delay({ success: true, referenceId: makeReferenceId("SD-DON") });
}

export async function submitNgoRegistration(values: NgoRegistrationValues): Promise<SubmissionResult> {
  void values;
  return delay({ success: true, referenceId: makeReferenceId("SD-NGO") });
}

export async function submitVolunteerApplication(values: VolunteerValues): Promise<SubmissionResult> {
  void values;
  return delay({ success: true, referenceId: makeReferenceId("SD-VOL") });
}

export async function requestOtp(phone: string): Promise<SubmissionResult> {
  void phone;
  return delay({ success: true, referenceId: makeReferenceId("OTP") }, 600);
}

export async function submitMealSponsorship(amount: number): Promise<SubmissionResult> {
  void amount;
  return delay({ success: true, referenceId: makeReferenceId("SD-MEAL") });
}
