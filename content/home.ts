// Home page copy, sourced verbatim (or lightly trimmed) from the sevadeep.org crawl.

export const hero = {
  eyebrow: "Relfor Foundation Initiative",
  headline: "Connecting Donors with NGOs",
  subhead:
    "Turn what you no longer need into what someone else desperately needs. Donate clothes, furniture, appliances, toys, books and more — SevaDeep matches it with a verified NGO and keeps you in the loop the whole way.",
  quickActions: [
    { label: "Search NGO", href: "/ngos" },
    { label: "View NGO Needs", href: "/ngo-needs" },
    { label: "Donate", href: "/donation-bucket" },
  ],
  images: [
    "/images/home/3.png",
    "/images/home/4.png",
    "/images/home/5.png",
    "/images/home/6.png",
  ],
} as const;

export const intro = {
  heading: "A user-friendly platform that connects donors with needy NGOs",
  paragraphs: [
    "Many families want to donate their household goods but don't know how to go about their donation. Through the Sevadeep digital platform, the donor can not only see the various NGOs listed along with their address but they also get to see what each NGO's needs are, and accordingly match their needs.",
    "Sevadeep is a user-friendly and unique digital platform that connects donors with needy NGOs across India — significantly creating a tangible difference in the lives of orphanages, old age homes, and other social organizations. On this platform, people can donate used and new items such as furniture, clothes, appliances, household items, and more to NGOs of their choice (Sevadeep does not accept cash, only physical goods).",
    "A thorough screening of recipient NGOs is carried out ensuring that only genuine social organisations are onboarded. Once a donation is made, the system tracks the entire donation cycle and updates donors accordingly. For Pune city, Sevadeep even arranges doorstep pick-up of household items.",
    "Sevadeep is an initiative of the Relfor Foundation, the philanthropic arm of Relfor Labs Pvt. Ltd., spearheaded by Mr. Deepak Nathani. In keeping with the company's core vision of “Innovate to make a better tomorrow,” Sevadeep aims to encourage and enhance the culture of giving. Another noble mission is feeding the poor through Narayanseva.",
  ],
} as const;

export const activityFeed = {
  heading: "Sevadeep In Action",
  eyebrow: "Let's Help Together",
  columns: [
    {
      title: "Narayanseva (Food Distribution)",
      items: [
        "Thank you Harnish Sheth. We appreciate your contribution for the needy.",
        "Thank you Anil Chachar. We appreciate your contribution for the needy.",
        "Thank you Sneha Choudhari. We appreciate your contribution for the needy.",
        "Thank you Gayatri Agarwal. We appreciate your contribution for the needy.",
      ],
    },
    {
      title: "Inkind Donations",
      items: [
        "Thank you Sneha Karanam for your great generosity! We greatly appreciate your donation.",
        "Thank you Rukhsheen Vajifdar for your great generosity! We greatly appreciate your donation.",
        "Thank you Prajakta Amberkar for your great generosity! We greatly appreciate your donation.",
        "Thank you Andrea for your great generosity! We greatly appreciate your donation.",
      ],
    },
  ],
} as const;

export const stats = {
  eyebrow: "Some Facts About Sevadeep Initiative!",
  heading: "Numbers Speak!",
  items: [
    { label: "NGOs Onboarded", value: 1230 },
    { label: "Total Donations", value: 6546 },
    { label: "Current Needs", value: 1851 },
  ],
} as const;

export const testimonials = {
  eyebrow: "Where Sound Becomes Vision",
  heading: "Reviews that Inspire Us!",
  items: [
    {
      name: "Swati Deshpande",
      location: "Pune",
      timeAgo: "a month ago",
      quote:
        "Akshay from SevaDeep was responsive, prompt and very very helpful. He arranged the pickup of my donations in 24 hours and connected me with Shubham for the pick up. Contact numbers were provided promptly. Shubham came with a van and collected all my donations on time. I am very impressed with the service.",
    },
    {
      name: "Sangita Desai",
      location: "Goa",
      timeAgo: "6 months ago",
      quote:
        "Sevadeep is doing very good work. I recently donated some textiles. I must say they have a very good process set online which is very rare to see in Goa. I am really feeling good after donating and I am looking forward to donating some more. Also, the kids made me some cards which are awesome.",
    },
  ],
} as const;

export const news = {
  eyebrow: "Awards And Recognition To Sevadeep",
  heading: "Sevadeep In News",
  items: [
    {
      title: "Sevasadan NGO Visit",
      description:
        "Relfor CSR team met with Rajya Sabha MP Medhatai Kulkarni, briefed her about the social initiatives carried out by the Relfor Foundation. Medhatai introduced the Sevasadan Society, where she has served as principal for the last twenty five years. The team spent time with schoolchildren, and Raj Nathani handed over an educational assistance fund to the Sevasadan Society.",
      image: "/images/home/SevaSadan-NGO-Visit-1.jpeg",
    },
    {
      title: "Maha-Awas Abhiyan Puraskar 2020-21",
      description:
        "Gram Vikas Department, Government of Maharashtra, awarded Relfor Foundation for its Tribal Housing projects in various tribal areas. Honourable Ajit Pawar felicitated Deepak Nathani (Founder, Relfor Foundation) with this best-NGO award for impactful work in the rural housing category.",
      image: "/images/home/Award-for-Tribal-Housing-Project.jpg",
    },
    {
      title: "Heartwarming Moments with Shri Anna Hazare",
      description:
        "Deepak Nathani visited Padma Bhushan social activist and anti-corruption movement founder Shri Anna Hazare in Ralegan Siddhi. The discussion focused on water conservation and environmental sustainability, and Relfor Foundation's efforts that have improved livelihoods for thousands of village people and farmers.",
      image: "/images/home/anna-hajare.webp",
    },
    {
      title: "Act of Compassion Award 2024",
      description:
        "Sevadeep's continued work connecting donors with verified NGOs across India was recognised with the Act of Compassion Award 2024.",
      image: "/images/home/First-Act-Of-Compassion-Award.jpeg",
    },
  ],
} as const;

export const howItWorks = {
  eyebrow: "Easy 4 Steps To Donate",
  heading: "How Sevadeep Works",
  steps: [
    {
      title: "Authenticate",
      description:
        "Every member NGO of SevaDeep is duly verified before it is on-boarded. These NGOs then list their needs, and donors can search by category and need.",
    },
    {
      title: "Donate",
      description:
        "Choose to donate as per an NGO's stated needs, or simply make a general donation. If you have no preference, the system will match-make for you.",
    },
    {
      title: "Co-ordinate",
      description:
        "Arrange to either deliver the selected items to the NGO's address or have them collected by the NGO — whichever is more convenient for you.",
    },
    {
      title: "Acknowledge, Spread Smiles",
      description:
        "Donors are kept informed of the difference their donation made. Now you can spread the word on social media and invite friends to join the movement.",
    },
  ],
} as const;

export const founder = {
  heading: "The Mission Man: Deepak Nathani",
  role: "Founder & CEO, Relfor Labs — Co-founder and former COO, Cybage Software, Pune's premier IT consultancy firm",
  photo: "/images/home/missionman.jpg",
  paragraphs: [
    "Deepak Nathani has always based his life and work on a simple credo: “Live it up.” Passionate, committed and fully invested in everything he takes up, Deepak believes in giving back to society at every juncture.",
    "An active investor in start-up ecosystems to encourage new ideas and talent, Deepak also invests considerable time and resources in social change through the Relfor Foundation, the CSR arm of Relfor Labs. The focus has been to positively change the quality of life of underserved sections of society through infrastructure development — desilting lakes, building concrete homes for tribals, upgrading old-age homes and orphanages, and renovating toilets in rural schools.",
    "Sevadeep.org is another ingenious creation of Deepak, dedicated to creating an ecosystem of giving through a user-friendly platform that connects NGOs with donors.",
  ],
} as const;
