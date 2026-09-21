// Representative NGO records captured from sevadeep.org/ngos (page 1 of 27, ~270 NGOs total).
// The live site loads all NGOs from Firestore at runtime; this is the seed/mock dataset the
// data layer in /src/lib/api serves until a real backend is wired up (see /src/lib/api/ngos.ts).

export type Ngo = {
  id: string;
  name: string;
  area: string;
  city: string;
  category: string;
  description: string;
  photo: string | null;
};

export const ngos: Ngo[] = [
  {
    id: "lift-for-upliftment",
    name: "Lift For Upliftment",
    area: "Somwar Peth",
    city: "Pune",
    category: "Education",
    description:
      "NGO started by students of BJ Medical College, working to uplift the needy section of society through free coaching for NEET (National Entrance cum Eligibility Test) for admission into MBBS and other medical courses. Since 2012, over 2,900 deserving students have been provided educational assistance through the Lift For Upliftment Project. The programme consists of a regular lecture series and weekly practice conducted at the Bal Vikas Shikshan Sanstha Prathamik Shala, Pune.",
    photo: null,
  },
  {
    id: "bhagyashali-bhavishya",
    name: "Bhagyashali Bhavishya",
    area: "Lohegaon",
    city: "Pune",
    category: "Education",
    description: "After school program teaching Math & English with special emphasis on Art.",
    photo: null,
  },
  {
    id: "paalvia-foundation",
    name: "Paalvia Foundation",
    area: "Viman Nagar",
    city: "Pune",
    category: "Art & Culture",
    description:
      "We believe that art and literature bring out the best in people — helping them grow with joy in their personal lives, and with confidence in their professional journeys. Paalvia doesn't just talk about change — it paints it, writes it, sings it, and celebrates it. Through art, we help communities find voice, identity, and meaning.",
    photo: null,
  },
  {
    id: "matimand-nivasi-vidyalay",
    name: "Matimand Nivasi Vidyalay",
    area: "Manjri",
    city: "Pune",
    category: "Differently-Abled",
    description: "Our school for special children — an educational and residential school.",
    photo: "/images/ngos/pic1744784503929.jpg",
  },
  {
    id: "bharat-vikas-parishad",
    name: "Bharat Vikas Parishad",
    area: "Yerawada",
    city: "Pune",
    category: "Rural",
    description:
      "Bharat Vikas Parishad is a voluntary organization where citizens from all walks of life join to work for the development and growth of our country through service (sewa) and educational (sanskar) initiatives — providing artificial limbs to the divyang, integrated village development across 65+ villages, tribal support, environmental protection, health checkup and yoga camps, blood donation, and disaster relief. Campaigns include Beti Bachao–Beti Padhao and Nasha Mukti.",
    photo: null,
  },
  {
    id: "dr-sams-health-assistant-and-research-foundation",
    name: "Dr Sams Health Assistant and Research Foundation",
    area: "Phursungi",
    city: "Pune",
    category: "Healthcare",
    description: "Working to provide discounted healthcare services, women's health, and promotion of government schemes.",
    photo: null,
  },
  {
    id: "bodhisattva",
    name: "Bodhisattva",
    area: "Yerwada",
    city: "Pune",
    category: "Animal Care",
    description: "Bodhisattva is an NGO for animal welfare and human welfare. We want to reduce suffering and help all sentient beings.",
    photo: null,
  },
  {
    id: "good-luck-charitable-trust",
    name: "Good Luck Charitable Trust",
    area: "Yerawada",
    city: "Pune",
    category: "Childcare",
    description: "Childhood distribution, animal food distribution and girls' hygiene awareness activities across Pune City slum areas.",
    photo: null,
  },
  {
    id: "tejaswini-samajik-sanstha",
    name: "Tejaswini Samajik Sanstha",
    area: "Wagholi",
    city: "Pune",
    category: "Women Empowerment",
    description:
      "Tejaswini Samajik Sanstha is a non-profit, registered charitable trust registered on 16th April 2014. Its objective is to provide education, social awareness, and values-based education to underprivileged women in urban and rural areas.",
    photo: null,
  },
  {
    id: "badlaav-social-reform-foundation",
    name: "Badlaav Social Reform Foundation",
    area: "Lulla Nagar",
    city: "Pune",
    category: "Women Empowerment",
    description:
      "At Badlaav, we work to empower marginalized communities by focusing on menstrual and sexual health education, sustainable menstrual hygiene management, and fostering gender equity through social action programs. Our aim is to drive long-term social and environmental impact.",
    photo: null,
  },
];

// Real localities seen in the live city/area filters (trimmed from 400+ to a representative set).
export const cities = [
  "Pune",
  "Mumbai",
  "Nashik",
  "Nagpur",
  "Aurangabad",
  "Thane",
  "Navi Mumbai",
  "Kolhapur",
  "Solapur",
  "Ahmednagar",
  "Bengaluru",
  "Hyderabad",
  "Delhi",
  "Jaipur",
  "Goa",
] as const;

export const puneAreas = [
  "All",
  "Aundh",
  "Baner",
  "Bavdhan",
  "Bibwewadi",
  "Camp",
  "Deccan Gymkhana",
  "Dhankawadi",
  "Hadapsar",
  "Hinjawadi",
  "Kalyani Nagar",
  "Karve Nagar",
  "Katraj",
  "Kharadi",
  "Kondhwa",
  "Kothrud",
  "Lohegaon",
  "Lulla Nagar",
  "Manjri",
  "Phursungi",
  "Pimpri-Chinchwad",
  "Shivajinagar",
  "Somwar Peth",
  "Viman Nagar",
  "Wagholi",
  "Wanowrie",
  "Warje",
  "Yerawada",
] as const;
