// Site-wide constants sourced from the sevadeep.org crawl (see /scraper/SITEMAP.md).

export const siteConfig = {
  name: "SevaDeep",
  tagline: "Connecting Donors with NGOs",
  url: "https://sevadeep.org",
  description:
    "Help poor and needy by donating your old clothes, furniture, appliances, toys, books and bicycles to verified NGOs near you. Register your donations online and SevaDeep volunteers will help find the right NGO for your donations.",
  keywords: [
    "Sevadeep Donation Platform",
    "Donate Old Items",
    "Donate Clothes",
    "Donate Food",
    "Donate Shoes",
    "Donate Toys",
    "Donate Stationery",
    "Donate Furniture",
    "Donate Electronics",
    "NGOs Near Me",
  ],
  logo: "/images/home/sevadeep-r-logo.png",
  ogImage: "/images/ngos/sevadeep-r-logo.png",
} as const;

export const contact = {
  phone: "+91-9175099256",
  phoneHref: "tel:+919175099256",
  email: "contact@sevadeep.com",
  address: "14th floor, Sky One, Kalyani Nagar, Pune 411006, MH, India",
} as const;

export const socialLinks = [
  { name: "Facebook", href: "https://www.facebook.com/Sevadeep-2299903280247561/" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/sevadeep-non-profit" },
  { name: "Instagram", href: "https://instagram.com/sevadeep.nonprofit" },
  { name: "X (Twitter)", href: "https://twitter.com/SevadeepNgos" },
] as const;

export const primaryNav = [
  { label: "About Us", href: "/#about" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Blog", href: "/blog" },
  { label: "NGOs", href: "/ngos" },
  { label: "NGO Needs", href: "/ngo-needs" },
  { label: "Sponsor A Meal", href: "/narayan-seva" },
] as const;

// Student-facing routes added by the SevaDeep platform build. Grouped into one dropdown so the
// header gains a single trigger rather than two more top-level links.
export const studentNavGroup = {
  label: "Students",
  items: [
    { label: "Student Enrolment", href: "/enroll" },
    { label: "Track Application", href: "/track" },
  ],
} as const;

export const ngoNavGroup = {
  label: "NGO",
  items: [
    { label: "NGO Login", href: "/ngo-login" },
    { label: "NGO SignUp", href: "/ngo-registration" },
  ],
} as const;

export const footerLinks = {
  company: [
    { label: "About Us", href: "/#about" },
    { label: "How Sevadeep Works", href: "/#how-it-works" },
    { label: "Leadership", href: "/#about" },
    { label: "Sevadeep Brochure", href: "/" },
    { label: "FAQs", href: "/#faqs" },
  ],
  get: [
    { label: "Browse NGOs", href: "/ngos" },
    { label: "NGO Needs", href: "/ngo-needs" },
    { label: "Donate Items", href: "/donation-bucket" },
    { label: "Sponsor A Meal", href: "/narayan-seva" },
    { label: "Gallery", href: "/gallery" },
  ],
  account: [
    { label: "Donor Login", href: "/donor-login" },
    { label: "NGO Login", href: "/ngo-login" },
    { label: "NGO Registration", href: "/ngo-registration" },
    { label: "Volunteer With Us", href: "/volunteer-register" },
  ],
  students: [
    { label: "Student Enrolment", href: "/enroll" },
    { label: "Track Application", href: "/track" },
  ],
} as const;

// Staff entry point, intentionally kept out of the header and the sitemap.
export const staffLink = { label: "Staff Login", href: "/admin/login" } as const;

export const donationCategories = [
  { id: "clothes", label: "Clothes", icon: "Shirt" },
  { id: "furniture", label: "Furniture", icon: "Sofa" },
  { id: "appliances", label: "Appliances", icon: "Refrigerator" },
  { id: "toys", label: "Toys", icon: "ToyBrick" },
  { id: "books", label: "Books & Stationery", icon: "BookOpen" },
  { id: "shoes", label: "Shoes", icon: "Footprints" },
  { id: "electronics", label: "Electronics", icon: "Laptop" },
  { id: "bicycles", label: "Bicycles", icon: "Bike" },
  { id: "food", label: "Food", icon: "UtensilsCrossed" },
] as const;

export const ngoCategories = [
  "All",
  "Art & Culture",
  "Animal Care",
  "CSR",
  "Childcare",
  "Differently-Abled",
  "Education",
  "Environment",
  "Healthcare",
  "Hospitals & Blood Banks",
  "Old Age",
  "Rural",
  "Skill Development",
  "Tribal Development",
  "Volunteer Org",
  "Women Empowerment",
  "Youth-Dev",
  "Others",
] as const;

export const faqs = [
  {
    question: "What can I donate on SevaDeep?",
    answer:
      "Physical goods only — clothes, furniture, appliances, toys, books, stationery, shoes, electronics, bicycles and food. SevaDeep does not accept cash donations; every donation is a real, usable item that goes directly to a verified NGO.",
  },
  {
    question: "Do you accept cash donations?",
    answer:
      "No. SevaDeep is built specifically around donations of physical goods so that donors can see exactly what their contribution becomes, rather than an unmarked cash transfer.",
  },
  {
    question: "How are NGOs verified before they can list needs?",
    answer:
      "Every member NGO is thoroughly screened and verified before being onboarded, so donors only see genuine, active social organisations listing their real needs.",
  },
  {
    question: "Is doorstep pickup available?",
    answer:
      "Yes, for Pune city SevaDeep arranges doorstep pickup of household items. Outside Pune, donors can arrange delivery directly to the NGO or coordinate with the SevaDeep team.",
  },
  {
    question: "Will I know what happened to my donation?",
    answer:
      "Yes. SevaDeep tracks the entire donation cycle and keeps donors informed of the outcome, so you can see the difference your donation made and share it with friends.",
  },
] as const;
