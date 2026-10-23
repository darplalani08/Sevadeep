// Knowledge base for the SevaDeep assistant.
//
// Every fact here is taken from the site's own content (content/site.ts, content/home.ts, the
// FAQ list, and the pages built from the sevadeep.org crawl in /scraper) or describes a route
// that exists in this application. Nothing about the NGO is invented; when the assistant has no
// verified answer it falls back to the contact details rather than guessing.
//
// Kept separate from the widget UI so the copy can be edited without touching React.

import type { KnowledgeBase } from "@/lib/chatbot/engine";
// Imported with the explicit extension so this module (and therefore the knowledge base) can
// also be loaded directly by `node --test` — see tests/chatbot.test.ts.
import { contact } from "./site.ts";

export const chatbotWelcome = {
  greeting:
    "Namaste! I'm the SevaDeep assistant. I can explain how donating works, help a student apply for educational support, check an application's status, or walk you through volunteering.",
  disclaimer:
    "I'm a rule-based assistant built on SevaDeep's own website content — not a generative AI. For anything I can't answer, I'll point you to the team.",
  suggestions: [
    "What is SevaDeep?",
    "How do I enrol a student?",
    "Track my application",
    "I want to volunteer",
  ],
};

export const chatbotKnowledgeBase: KnowledgeBase = {
  intents: [
    {
      id: "greeting",
      phrases: ["good morning", "good evening", "namaste", "hello there"],
      keywords: ["hello", "hi", "hey", "namaste", "greetings"],
      answer:
        "Hello! I can help with four things: understanding what SevaDeep does, enrolling a student for educational support, tracking an application you already submitted, and registering as a volunteer. What would you like to start with?",
      suggestions: [
        "What is SevaDeep?",
        "How do I enrol a student?",
        "Track my application",
        "I want to volunteer",
      ],
      followUps: ["mission", "enrollment", "tracking", "volunteering"],
    },
    {
      id: "mission",
      phrases: [
        "what is sevadeep",
        "about sevadeep",
        "about you",
        "your mission",
        "who are you",
        "what do you do",
        "tell me about",
      ],
      keywords: ["mission", "vision", "about", "sevadeep", "purpose", "relfor", "foundation", "who"],
      answer:
        "SevaDeep is a donation platform that connects donors with verified NGOs across India — an initiative of the Relfor Foundation, the philanthropic arm of Relfor Labs Pvt. Ltd., spearheaded by Mr. Deepak Nathani. NGOs list what they actually need; donors donate physical goods (never cash) that match those needs. Every partner NGO is screened before being onboarded, the full donation cycle is tracked, and donors are told what their donation became. SevaDeep also runs Narayan Seva, feeding the poor through sponsored meals.",
      links: [
        { label: "About SevaDeep", href: "/#about" },
        { label: "How SevaDeep works", href: "/#how-it-works" },
      ],
      suggestions: ["How does donating work?", "What can I donate?", "I want to volunteer"],
      followUps: ["how-it-works", "donate-what", "volunteering"],
    },
    {
      id: "how-it-works",
      phrases: [
        "how does it work",
        "how does sevadeep work",
        "how do i donate",
        "donation process",
        "steps to donate",
      ],
      keywords: ["work", "works", "process", "steps", "how", "procedure", "flow"],
      answer:
        "Four steps. 1) Authenticate — every member NGO is verified before onboarding, then lists its needs. 2) Donate — give against a specific NGO need, or make a general donation and SevaDeep match-makes for you. 3) Co-ordinate — either deliver the items to the NGO or have them collected; for Pune city SevaDeep arranges doorstep pickup. 4) Acknowledge — you're kept informed of the difference your donation made.",
      links: [
        { label: "The 4 steps in detail", href: "/#how-it-works" },
        { label: "Browse NGO needs", href: "/ngo-needs" },
        { label: "Start a donation", href: "/donation-bucket" },
      ],
      suggestions: ["What can I donate?", "Is pickup available?", "How are NGOs verified?"],
      followUps: ["donate-what", "pickup", "ngo-verification"],
    },
    {
      id: "donate-what",
      phrases: [
        "what can i donate",
        "which items",
        "accept cash",
        "cash donation",
        "money donation",
        "donate money",
      ],
      keywords: [
        "clothes","furniture","appliances","toys","books","stationery","shoes","electronics",
        "bicycles","food","items","cash","money","goods",
      ],
      answer:
        "Physical goods only — clothes, furniture, appliances, toys, books and stationery, shoes, electronics, bicycles and food. SevaDeep does not accept cash donations: the platform is built around real, usable items so donors can see exactly what their contribution becomes. The one money-based programme is Narayan Seva, where you sponsor meals for the needy.",
      links: [
        { label: "Donation categories", href: "/donation-bucket" },
        { label: "Sponsor a meal (Narayan Seva)", href: "/narayan-seva" },
      ],
      suggestions: ["Is pickup available?", "Which NGOs are listed?", "How does donating work?"],
      followUps: ["pickup", "ngos", "how-it-works"],
    },
    {
      id: "pickup",
      phrases: [
        "doorstep pickup",
        "pick up",
        "pickup available",
        "collect my donation",
        "come to my house",
      ],
      keywords: ["pickup", "pick-up", "collect", "collection", "doorstep", "delivery", "van"],
      answer:
        "Yes — for Pune city SevaDeep arranges doorstep pickup of household items. Outside Pune you can deliver directly to the NGO or coordinate with the SevaDeep team on " +
        contact.phone +
        ". Pickups are usually scheduled by the team after you register the donation online.",
      links: [{ label: "Register a donation", href: "/donation-bucket" }],
      suggestions: ["What can I donate?", "How do I contact SevaDeep?"],
      followUps: ["donate-what", "contact"],
    },
    {
      id: "ngo-verification",
      phrases: ["how are ngos verified", "are ngos genuine", "ngo screening", "trust the ngo"],
      keywords: ["verified", "verification", "screening", "genuine", "authentic", "trust", "fake"],
      answer:
        "Every member NGO is thoroughly screened and verified before it is onboarded, so donors only ever see genuine, active social organisations listing their real needs. Verified NGOs then publish their own needs, which is what you browse on the NGO Needs page.",
      links: [
        { label: "Browse verified NGOs", href: "/ngos" },
        { label: "Current NGO needs", href: "/ngo-needs" },
      ],
      suggestions: ["Which NGOs are listed?", "How does donating work?"],
      followUps: ["ngos", "how-it-works"],
    },
    {
      id: "ngos",
      phrases: ["which ngos", "list of ngos", "find an ngo", "ngos near me", "search ngo"],
      keywords: ["ngo", "ngos", "orphanage", "oldage", "shelter", "organisation", "organization", "near"],
      answer:
        "You can search the verified NGO directory by city, area and category — education, childcare, healthcare, old age, animal care, women empowerment, environment and more. Each NGO's listing shows its address and the needs it has published.",
      links: [
        { label: "Search NGOs", href: "/ngos" },
        { label: "NGO needs", href: "/ngo-needs" },
      ],
      suggestions: ["How are NGOs verified?", "How do I register my NGO?"],
      followUps: ["ngo-verification", "ngo-registration"],
    },
    {
      id: "ngo-registration",
      phrases: ["register my ngo", "ngo signup", "ngo sign up", "join as ngo", "list my ngo"],
      keywords: ["registration", "signup", "register", "onboard", "partner"],
      answer:
        "NGOs can apply to join from the NGO SignUp page. After registration the SevaDeep team screens the organisation before it is onboarded and allowed to list needs. Existing partner NGOs sign in from the NGO Login page.",
      links: [
        { label: "NGO SignUp", href: "/ngo-registration" },
        { label: "NGO Login", href: "/ngo-login" },
      ],
      suggestions: ["How are NGOs verified?", "How do I contact SevaDeep?"],
      followUps: ["ngo-verification", "contact"],
    },
    {
      id: "education-support",
      phrases: [
        "educational support",
        "education support",
        "help with school",
        "school fees",
        "tuition help",
        "study material",
        "scholarship",
      ],
      keywords: ["education", "educational", "school", "student", "study", "tuition", "fees", "books", "scholarship", "classes"],
      answer:
        "Educational support is the student-facing side of the platform. A student or guardian submits an enrolment application describing the support needed — after-school tuition, study material and books, school fees assistance, computer or digital literacy, spoken English, or exam coaching. The SevaDeep team reviews each application and routes it to the partner NGO best placed to help.",
      links: [
        { label: "Student enrolment form", href: "/enroll" },
        { label: "Track an application", href: "/track" },
      ],
      suggestions: ["How do I enrol a student?", "Track my application", "What happens after I apply?"],
      followUps: ["enrollment", "tracking", "application-statuses"],
    },
    {
      id: "enrollment",
      phrases: [
        "enrol a student",
        "enroll a student",
        "student enrollment",
        "student enrolment",
        "apply for support",
        "admission",
        "sign up my child",
        "register my child",
      ],
      keywords: ["enroll", "enrol", "enrolment", "enrollment", "apply", "application", "admission", "child", "daughter", "son", "guardian"],
      answer:
        "Open the student enrolment form and fill in the student's name, the parent or guardian's name, a contact number, the student's class and age, and which kind of educational support is needed. When you submit, the application is saved and you get a reference like SD-2026-000001 plus a private 6-character tracking code. Keep both — together they're how you check the status later.",
      links: [
        { label: "Open the enrolment form", href: "/enroll" },
        { label: "Track an application", href: "/track" },
      ],
      suggestions: ["Track my application", "What happens after I apply?", "Is my information private?"],
      followUps: ["tracking", "application-statuses", "privacy"],
    },
    {
      id: "tracking",
      phrases: [
        "track my application",
        "application status",
        "check my status",
        "where is my application",
        "lost my reference",
        "tracking code",
      ],
      keywords: ["track", "tracking", "status", "reference", "code", "progress", "update"],
      answer:
        "Go to the tracking page and enter your application reference (for example SD-2026-000001) together with the 6-character tracking code you were given when you submitted. The page then shows the current status, when you applied, when it was last updated and what happens next — and it refreshes itself every few seconds, so if the team changes your status while the page is open you'll see it without reloading.",
      links: [{ label: "Track an application", href: "/track" }],
      suggestions: ["What happens after I apply?", "How do I contact SevaDeep?", "Is my information private?"],
      followUps: ["application-statuses", "contact", "privacy"],
    },
    {
      id: "application-statuses",
      phrases: [
        "what happens after i apply",
        "how long does it take",
        "what does under review mean",
        "application stages",
        "approved or rejected",
      ],
      keywords: ["submitted", "review", "approved", "rejected", "pending", "stages", "next", "long", "wait", "decision"],
      answer:
        "An application moves through four statuses. Submitted — received and queued. Under Review — the team is checking the details and looking for a partner NGO that can help. Approved — support has been arranged and the team will call you on the number you gave. Rejected — SevaDeep could not place this request, usually because no partner NGO covers that need or area; you'll be told so you can look elsewhere. Only SevaDeep administrators can change a status, and your tracking page updates on its own when they do.",
      links: [{ label: "Track an application", href: "/track" }],
      suggestions: ["Track my application", "How do I contact SevaDeep?"],
      followUps: ["tracking", "contact"],
    },
    {
      id: "volunteering",
      phrases: [
        "i want to volunteer",
        "become a volunteer",
        "volunteer with you",
        "how can i help",
        "join sevadeep",
        "give my time",
      ],
      keywords: ["volunteer", "volunteering", "help", "join", "contribute", "seva", "serve", "time"],
      answer:
        "SevaDeep is looking for volunteers to expand its outreach across India. Register on the volunteer page with your skills, the causes that interest you and when you're free. As soon as you submit, the matcher scores you against every open opportunity — 50% on how well your skills cover the role, 30% on interest overlap, 20% on schedule fit — and shows you your best-fitting activities with the reason for each match. The team then follows up on WhatsApp; registering isn't the same as being accepted.",
      links: [{ label: "Volunteer registration", href: "/volunteer-register" }],
      suggestions: [
        "What volunteer opportunities are there?",
        "How does volunteer matching work?",
        "How do I contact SevaDeep?",
      ],
      followUps: ["volunteer-opportunities", "matching", "contact"],
    },
    {
      id: "volunteer-opportunities",
      phrases: [
        "volunteer opportunities",
        "what can i do as a volunteer",
        "volunteer roles",
        "volunteer activities",
      ],
      keywords: ["opportunities", "opportunity", "roles", "activities", "teaching", "tutoring", "driving", "photography", "sorting"],
      answer:
        "The opportunity catalogue covers teaching support and computer literacy workshops, donation pickups and field visits, donation sorting and inventory, Narayan Seva meal drives, digital storytelling and social media, NGO onboarding and verification, old age home companionship, and fundraising and corporate outreach. Register and the matcher will rank them for your particular skills and schedule. These entries are marked as demonstration opportunities — SevaDeep's live site doesn't publish a structured role list, so the catalogue is maintained by administrators inside this platform.",
      links: [{ label: "See your matches", href: "/volunteer-register" }],
      suggestions: ["How does volunteer matching work?", "I want to volunteer"],
      followUps: ["matching", "volunteering"],
    },
    {
      id: "matching",
      phrases: [
        "how does matching work",
        "how is the match score calculated",
        "matching algorithm",
        "match percentage",
      ],
      keywords: ["matching", "match", "score", "algorithm", "percentage", "calculated", "weight", "weights"],
      answer:
        "Each opportunity gets a score out of 100: 50% skill fit (what share of the skills the role asks for do you bring), 30% interest fit (how much of the role's cause area you said interests you), and 20% availability fit (does any of your free time overlap the role's schedule — 'Flexible' clears it automatically). Naming an activity as a preference adds a small separate boost. You also see which of your skills matched and which the team would train you on, so the percentage is explainable rather than a black box.",
      links: [{ label: "Try it on the volunteer form", href: "/volunteer-register" }],
      suggestions: ["What volunteer opportunities are there?", "I want to volunteer"],
      followUps: ["volunteer-opportunities", "volunteering"],
    },
    {
      id: "narayan-seva",
      phrases: ["sponsor a meal", "narayan seva", "narayanseva", "feed the poor", "food distribution"],
      keywords: ["meal", "meals", "narayan", "narayanseva", "feed", "feeding", "hunger", "sponsor"],
      answer:
        "Narayan Seva is SevaDeep's meal programme — you sponsor meals and the team distributes food to the needy. It's the one part of the platform that takes money rather than goods, because the meals are cooked and served on your behalf.",
      links: [{ label: "Sponsor a meal", href: "/narayan-seva" }],
      suggestions: ["What can I donate?", "How do I contact SevaDeep?"],
      followUps: ["donate-what", "contact"],
    },
    {
      id: "contact",
      phrases: ["contact you", "phone number", "email address", "get in touch", "talk to someone", "where are you located"],
      keywords: ["contact", "phone", "call", "email", "address", "office", "located", "location", "whatsapp", "reach"],
      answer:
        `You can reach the SevaDeep team on ${contact.phone} (also on WhatsApp), by email at ${contact.email}, or at the office: ${contact.address}.`,
      links: [
        { label: `Call ${contact.phone}`, href: contact.phoneHref },
        { label: `Email ${contact.email}`, href: `mailto:${contact.email}` },
      ],
      suggestions: ["What is SevaDeep?", "I want to volunteer"],
      followUps: ["mission", "volunteering"],
    },
    {
      id: "gallery",
      phrases: ["see photos", "photo gallery", "your work in pictures", "show me pictures"],
      keywords: ["gallery", "photos", "photo", "pictures", "images", "events"],
      answer:
        "The gallery has photographs from SevaDeep's donation drives, NGO visits and Narayan Seva events. The home page also carries the awards and press coverage the Relfor Foundation has received.",
      links: [
        { label: "Open the gallery", href: "/gallery" },
        { label: "SevaDeep in the news", href: "/#news" },
      ],
      suggestions: ["What is SevaDeep?", "Read the blog"],
      followUps: ["mission", "blog"],
    },
    {
      id: "blog",
      phrases: ["read the blog", "your articles", "blog posts"],
      keywords: ["blog", "article", "articles", "posts", "read", "stories"],
      answer:
        "The blog has guides on donating food, clothes and old items, what's best to donate to an orphanage or old age home, and how to help NGOs in Pune.",
      links: [{ label: "Read the blog", href: "/blog" }],
      suggestions: ["What can I donate?", "What is SevaDeep?"],
      followUps: ["donate-what", "mission"],
    },
    {
      id: "privacy",
      phrases: [
        "is my information private",
        "data privacy",
        "who can see my details",
        "is my data safe",
      ],
      keywords: ["privacy", "private", "data", "safe", "secure", "security", "confidential", "share"],
      answer:
        "Applications and volunteer registrations are stored in SevaDeep's own local database, and personal details are only visible to signed-in SevaDeep administrators. The public tracking page deliberately shows status and dates only — never names, phone numbers or addresses — and it needs both your reference and your private tracking code before it shows anything at all.",
      links: [{ label: "Track an application", href: "/track" }],
      suggestions: ["Track my application", "How do I contact SevaDeep?"],
      followUps: ["tracking", "contact"],
    },
    {
      id: "admin",
      phrases: ["admin login", "administrator login", "staff login", "dashboard login"],
      keywords: ["admin", "administrator", "dashboard", "staff", "backend"],
      answer:
        "The administration dashboard is for SevaDeep staff only — it's where applications are reviewed and statuses changed. If you're a staff member, sign in at the admin login page. If you're a donor or an applicant, you don't need it.",
      links: [{ label: "Admin login", href: "/admin/login" }],
      suggestions: ["Track my application", "How do I contact SevaDeep?"],
      followUps: ["tracking", "contact"],
    },
    {
      id: "navigation",
      phrases: ["where do i find", "how do i navigate", "site map", "which page"],
      keywords: ["page", "find", "navigate", "navigation", "menu", "where"],
      answer:
        "The main pages are: About and How It Works on the home page; NGOs and NGO Needs to browse and search; Donation Bucket to register a donation; Sponsor A Meal for Narayan Seva; Gallery and Blog; Student Enrolment and Track Application for educational support; and Volunteer Registration to join the team.",
      links: [
        { label: "Home", href: "/" },
        { label: "Student enrolment", href: "/enroll" },
        { label: "Track application", href: "/track" },
        { label: "Volunteer", href: "/volunteer-register" },
      ],
      suggestions: ["How do I enrol a student?", "I want to volunteer", "What is SevaDeep?"],
      followUps: ["enrollment", "volunteering", "mission"],
    },
    {
      id: "thanks",
      phrases: ["thank you", "thanks a lot", "that helps", "appreciate it"],
      keywords: ["thankyou", "thx", "cheers", "helpful", "appreciate"],
      answer:
        "Happy to help. If you'd like to go further: enrol a student for educational support, track an application you've already sent, or register as a volunteer.",
      suggestions: ["How do I enrol a student?", "Track my application", "I want to volunteer"],
      followUps: ["enrollment", "tracking", "volunteering"],
    },
  ],

  fallback: {
    answer:
      `I don't have a verified answer for that one — I only answer from SevaDeep's own published information, so I'd rather not guess. The team can help directly on ${contact.phone} or ${contact.email}. I can also explain what SevaDeep does, student enrolment, application tracking, or volunteering.`,
    links: [
      { label: `Call ${contact.phone}`, href: contact.phoneHref },
      { label: `Email ${contact.email}`, href: `mailto:${contact.email}` },
    ],
    suggestions: [
      "What is SevaDeep?",
      "How do I enrol a student?",
      "Track my application",
      "I want to volunteer",
    ],
  },
};
