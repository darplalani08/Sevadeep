// Starting opportunity catalogue for the volunteer matcher.
//
// IMPORTANT: sevadeep.org does not publish a structured list of volunteering roles (the live
// volunteer form loads its categories dynamically and returned no data during the content
// audit — see scraper/content/volunteer-register.json). Every entry below is therefore flagged
// `isDemo: true` and is rendered in the UI with a "Demo opportunity" label. They are modelled on
// activities the site *does* document (Pune doorstep pickups, NGO verification, Narayan Seva meal
// sponsorship, donation drives, gallery/event coverage) so the matcher has realistic inputs.
//
// Administrators can add, edit and deactivate opportunities from /admin/opportunities; the seed
// runs only when the table is empty, so edits survive restarts.

export type OpportunitySeed = {
  id: string;
  title: string;
  summary: string;
  requiredSkills: string[];
  interestTags: string[];
  availabilityNeeds: string[];
  location: string;
  isDemo: boolean;
};

export const defaultOpportunities: OpportunitySeed[] = [
  {
    id: "teaching-support",
    title: "Teaching Support (After-School Classes)",
    summary:
      "Run after-school reading, English and maths sessions for children supported by SevaDeep's partner NGOs.",
    requiredSkills: ["Teaching & Tutoring", "Spoken English", "Mathematics"],
    interestTags: ["Child Education", "Skill Development"],
    availabilityNeeds: ["Weekday Evenings", "Weekends"],
    location: "Pune",
    isDemo: true,
  },
  {
    id: "donation-pickup",
    title: "Donation Pickup & Field Visits",
    summary:
      "Collect donated clothes, furniture and appliances from donors' doorsteps across Pune and deliver them to the matched NGO.",
    requiredSkills: ["Driving", "Logistics & Sorting", "Event Management"],
    interestTags: ["Donation Drives", "Rural & Tribal Outreach"],
    availabilityNeeds: ["Weekends", "Weekday Mornings", "Flexible"],
    location: "Pune",
    isDemo: true,
  },
  {
    id: "donation-sorting",
    title: "Donation Sorting & Inventory",
    summary:
      "Sort, quality-check and log incoming donations so each NGO receives items that match the needs it listed.",
    requiredSkills: ["Logistics & Sorting", "Data Entry"],
    interestTags: ["Donation Drives"],
    availabilityNeeds: ["Weekends", "One-off Events"],
    location: "Pune",
    isDemo: true,
  },
  {
    id: "meal-drive",
    title: "Narayan Seva Meal Drive Support",
    summary:
      "Help serve sponsored meals, manage queues and document the drive for the donors who funded it.",
    requiredSkills: ["Event Management", "Logistics & Sorting", "Photography"],
    interestTags: ["Food & Nutrition", "Donation Drives"],
    availabilityNeeds: ["Weekends", "One-off Events"],
    location: "Pune",
    isDemo: true,
  },
  {
    id: "digital-storytelling",
    title: "Digital Storytelling & Social Media",
    summary:
      "Turn completed donation cycles into posts, photo stories and blog articles that bring in the next donor.",
    requiredSkills: ["Social Media", "Content Writing", "Photography", "Graphic Design"],
    interestTags: ["Storytelling & Awareness"],
    availabilityNeeds: ["Remote / From Home", "Flexible"],
    location: "Remote",
    isDemo: true,
  },
  {
    id: "ngo-onboarding",
    title: "NGO Onboarding & Verification",
    summary:
      "Call and document prospective partner NGOs, check their registration papers and prepare them for listing.",
    requiredSkills: ["Data Entry", "Marathi / Hindi Translation", "Accounting"],
    interestTags: ["NGO Capacity Building"],
    availabilityNeeds: ["Weekday Mornings", "Weekday Evenings", "Remote / From Home"],
    location: "Pune / Remote",
    isDemo: true,
  },
  {
    id: "computer-literacy",
    title: "Computer Literacy Workshops",
    summary:
      "Teach basic computer and internet skills to students and women's groups at partner NGO centres.",
    requiredSkills: ["Computer Skills", "Teaching & Tutoring"],
    interestTags: ["Skill Development", "Child Education", "Women Empowerment"],
    availabilityNeeds: ["Weekends", "Weekday Evenings"],
    location: "Pune",
    isDemo: true,
  },
  {
    id: "elder-companionship",
    title: "Old Age Home Companionship",
    summary:
      "Spend structured time with residents of partner old age homes — conversation, reading and basic health checks.",
    requiredSkills: ["Counselling", "Medical / First Aid", "Marathi / Hindi Translation"],
    interestTags: ["Elderly Care", "Healthcare"],
    availabilityNeeds: ["Weekends", "Weekday Mornings"],
    location: "Pune",
    isDemo: true,
  },
  {
    id: "fundraising-outreach",
    title: "Fundraising & Corporate Outreach",
    summary:
      "Build the CSR pipeline: approach companies, prepare proposals and track pledged donation drives.",
    requiredSkills: ["Fundraising", "Accounting", "Content Writing"],
    interestTags: ["NGO Capacity Building"],
    availabilityNeeds: ["Remote / From Home", "Flexible", "Weekday Evenings"],
    location: "Pune / Remote",
    isDemo: true,
  },
];
