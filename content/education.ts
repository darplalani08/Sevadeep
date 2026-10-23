// Vocabularies for the student enrolment workflow — shared by the public form, the server-side
// validation schema and the admin dashboard filters.

export const supportTypes = [
  "After-School Tuition",
  "Study Material & Books",
  "School Fees Assistance",
  "Computer & Digital Literacy",
  "Spoken English",
  "Exam Coaching",
  "Career Guidance",
  "Uniform & Shoes",
] as const;

export const studentClasses = [
  "Pre-primary",
  "Class 1-2",
  "Class 3-5",
  "Class 6-8",
  "Class 9-10",
  "Class 11-12",
  "Diploma / ITI",
  "Undergraduate",
] as const;

export const applicationStatuses = [
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
] as const;

export type SupportType = (typeof supportTypes)[number];
export type StudentClass = (typeof studentClasses)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];

/** Applicant-facing guidance shown on the tracking page for each status. */
export const statusGuidance: Record<ApplicationStatus, string> = {
  Submitted:
    "Your application has been received and is queued for review. Nothing is needed from you right now — keep your reference and tracking code safe.",
  "Under Review":
    "A SevaDeep coordinator is checking the details and looking for a partner NGO that can provide this support. You may get a call on the number you gave us.",
  Approved:
    "Support has been arranged. The SevaDeep team will contact you on your registered number with the next steps, including which partner NGO will help.",
  Rejected:
    "SevaDeep could not place this request — usually because no partner NGO currently covers that need or area. Please call the team if you would like to discuss alternatives.",
};
