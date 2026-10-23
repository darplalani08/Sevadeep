// Vocabularies shared by the volunteer registration form, the matching engine and the admin
// dashboard. Keeping them in one place means a skill added here is immediately selectable in
// the form, scoreable by the matcher and filterable in the dashboard.

export const volunteerSkills = [
  "Teaching & Tutoring",
  "Spoken English",
  "Mathematics",
  "Computer Skills",
  "Driving",
  "Logistics & Sorting",
  "Photography",
  "Graphic Design",
  "Social Media",
  "Content Writing",
  "Fundraising",
  "Event Management",
  "Data Entry",
  "Counselling",
  "Medical / First Aid",
  "Accounting",
  "Marathi / Hindi Translation",
  "Carpentry & Repairs",
] as const;

export const volunteerInterests = [
  "Child Education",
  "Skill Development",
  "Women Empowerment",
  "Elderly Care",
  "Animal Care",
  "Environment",
  "Healthcare",
  "Rural & Tribal Outreach",
  "Food & Nutrition",
  "Donation Drives",
  "NGO Capacity Building",
  "Storytelling & Awareness",
] as const;

export const volunteerAvailability = [
  "Weekday Mornings",
  "Weekday Evenings",
  "Weekends",
  "One-off Events",
  "Remote / From Home",
  "Flexible",
] as const;

export type VolunteerSkill = (typeof volunteerSkills)[number];
export type VolunteerInterest = (typeof volunteerInterests)[number];
export type VolunteerAvailability = (typeof volunteerAvailability)[number];
