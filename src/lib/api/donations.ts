// Mock submission endpoints. Each simulates network latency and returns a typed result so
// forms can be wired to a real backend (Firebase Functions, REST, etc.) later by editing only
// this file.
//
// Volunteer registration no longer lives here: it posts to POST /api/volunteers, which validates
// server-side, writes to SQLite and returns the computed opportunity matches. Student enrolment
// and application tracking were added the same way (POST /api/enrollment, POST /api/track). The
// functions below are still mocks — donations, NGO registration, OTP and meal sponsorship have
// not been migrated.
import type { DonationFormValues } from "@/lib/validations/donation";
import type { NgoRegistrationValues } from "@/lib/validations/ngo-registration";

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

export async function requestOtp(phone: string): Promise<SubmissionResult> {
  void phone;
  return delay({ success: true, referenceId: makeReferenceId("OTP") }, 600);
}

export async function submitMealSponsorship(amount: number): Promise<SubmissionResult> {
  void amount;
  return delay({ success: true, referenceId: makeReferenceId("SD-MEAL") });
}
