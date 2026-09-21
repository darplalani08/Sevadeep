// Representative need records captured from sevadeep.org/ngo-needs (page 1 of 37, ~440 needs total).
// Seed/mock dataset for /src/lib/api/needs.ts.

export type Need = {
  id: string;
  ngoName: string;
  location: string;
  category: string;
  item: string;
  quantity: number;
  description: string;
  reason: string;
};

export const needs: Need[] = [
  {
    id: "compassion-charitable-trust-electronics",
    ngoName: "Compassion Charitable Trust",
    location: "Pune",
    category: "Electronics",
    item: "Electronics / Computer / Laptop",
    quantity: 4,
    description: "Compassion Charitable Trust is a non-profit organisation, started in 2012.",
    reason: "We need this for children to grow in knowledge and digital skills.",
  },
  {
    id: "bidkar-foundation-electronics",
    ngoName: "Bidkar Foundation",
    location: "Pune",
    category: "Electronics",
    item: "Electronics / Computer / Laptop",
    quantity: 5,
    description: "BIDKAR FOUNDATION is a grassroot non-government organisation.",
    reason: "BIDKAR Foundation is teaching coding to underprivileged students.",
  },
  {
    id: "sulabh-jivan-foundation-vehicles",
    ngoName: "Sulabh Jivan Foundation",
    location: "Pune",
    category: "Vehicles",
    item: "Vehicles",
    quantity: 1,
    description: "Sulabh Jivan Foundation is a registered organisation with the government.",
    reason: "We required vehicles for field visits.",
  },
  {
    id: "rising-star-foundation-electronics",
    ngoName: "Rising Star Foundation",
    location: "Pune",
    category: "Electronics",
    item: "Electronics / Computer / Laptop",
    quantity: 3,
    description: "Rising Star Foundation runs an in-house residential treatment centre.",
    reason: "Laptops and computers for our office work.",
  },
  {
    id: "solomon-memorial-trust-bags",
    ngoName: "Solomon Memorial Trust",
    location: "Pune",
    category: "Books & Stationery",
    item: "Educational Bag",
    quantity: 100,
    description: "The Solomon Memorial Trust was established in 2016 and is regularly active.",
    reason: "Need 100 school bags for orphans and widows' children.",
  },
  {
    id: "welcare-india-social-welfare-oxygen",
    ngoName: "Welcare India Social Welfare",
    location: "Pune",
    category: "Healthcare",
    item: "Oxygen Cylinder",
    quantity: 5,
    description: "Welcare India Social Welfare is a non-governmental organisation (NGO).",
    reason: "Your donated oxygen cylinder can be some patient's lifeline.",
  },
  {
    id: "adivasi-adim-samajik-sanstha-construction",
    ngoName: "Adivasi Adim Samajik Sanstha",
    location: "Pune",
    category: "Other",
    item: "Construction",
    quantity: 1,
    description: "Adivasi Primitive Social Organization, established by the youth.",
    reason: "Through the ongoing service work of the community centre.",
  },
  {
    id: "relife-foundation-ambulance",
    ngoName: "ReLife Foundation",
    location: "Pune",
    category: "Vehicles",
    item: "Ambulance",
    quantity: 1,
    description: "ReLife Foundation supports emergency medical response in the region.",
    reason: "Please do the needful — ReLife Foundation needs this urgently.",
  },
  {
    id: "sagar-seva-trust-notebooks",
    ngoName: "Sagar Seva Trust",
    location: "Pune",
    category: "Books & Stationery",
    item: "Educational Notebooks",
    quantity: 250,
    description: "Bacho key education, our health — we work hard as one team.",
    reason: "Please give us notebooks for our new education project.",
  },
  {
    id: "akshar-paaul-water-purifier",
    ngoName: "Akshar Paaul",
    location: "Pune",
    category: "Appliances",
    item: "Home Appliances / Water Purifier",
    quantity: 3,
    description: "Akshar Paaul was established in Pune, India in 2013 and later expanded.",
    reason: "We need a water purifier at our Smiling Bonds shelter.",
  },
  {
    id: "arise-vishwa-society-tree-guard",
    ngoName: "Arise Vishwa Society",
    location: "Pune",
    category: "Other",
    item: "Tree Guard",
    quantity: 10,
    description: "Arise Vishwa Society is a non-government, constitutional-rights based organisation.",
    reason: "Support our mission for greenery — we need tree guards for our plantation drive.",
  },
  {
    id: "sarva-seva-sangh-refrigerators",
    ngoName: "Sarva Seva Sangh",
    location: "Pune",
    category: "Appliances",
    item: "Home Appliances / Refrigerator",
    quantity: 1,
    description: "Sarva Seva Sangh had its beginnings in the second half of the 1970s.",
    reason: "Needed to keep vegetables and fruits fresh for our residents.",
  },
];

export const needCategories = [
  "All",
  "Clothes",
  "Furniture",
  "Appliances",
  "Toys",
  "Books & Stationery",
  "Shoes",
  "Electronics",
  "Bicycles",
  "Food",
  "Healthcare",
  "Vehicles",
  "Other",
] as const;
