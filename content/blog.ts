// Blog posts captured from sevadeep.org/blog and individual post pages.
// Two posts (christmas, orphanage) render empty on the live post URL itself; their full body
// was recovered from the /blog listing page, which renders the complete text (CSS-truncated only).

export type BlogPost = {
  slug: string;
  title: string;
  author: string;
  date: string; // ISO
  category: string;
  image: string;
  paragraphs: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "donate-items-this-chrismas",
    title: "It's Time To Donate a Merry Christmas!",
    author: "SevaDeep",
    date: "2020-12-08",
    category: "Original",
    image: "/images/blog/pic1607431761440.jpg",
    paragraphs: [
      "Nothing resonates more with Christmas than the spirit of giving and sharing. It is the time of the year when we should all share a little with those who have less and are not as fortunate as some are.",
      "In spirit of the holiday, we created a list of the most popular items you can donate this Christmas, to make it a genuinely happy and memorable one for hundreds of people!",
      "1. Donate your old books: The Christmas season brings with it cold weather that could have everyone tucked in their warm homes. To help those in need pass the time, donate your old books to SevaDeep so we may distribute them amongst the NGOs that are listed on our platform.",
      "2. Donate warm clothes and blankets: While we are on the subject of cold weather, look deep in your closet and pull out the warm items that you no longer want or need. If you have children that have outgrown their clothes, this is the perfect opportunity to do some winter cleaning and donate your old clothes to SevaDeep, so we may distribute them to hundreds of children that need to stay warm during these cold winter months.",
      "3. Sponsor a meal: SevaDeep's mission of sponsoring grocery kits for those in need began in the early days of the COVID lockdown. In this period, we have reached out to hundreds of people (patients and relatives) and supported them with warm meals. Now that the lockdown is over, our team has the ability to travel to more remote areas and support those in need.",
      "4. Donate old furniture: The winter furniture sales are the perfect opportunity to finally change the old beds and couches. Donate your old furniture items to SevaDeep so we may deliver them to old age homes and orphanages around the city. You don't have to worry about transportation — our team will be happy to pick your old items from your doorstep.",
      "5. Donate old appliances: Bought a new TV or a fridge? Send the old appliances our way and we will deliver them to those who need them the most! Just remember to make sure that they are in a working condition so others may enjoy them.",
      "During the holiday season, our team gears up with extra helping hands to make sure we can address the increased number of donations efficiently. Help us make sure our team works hard all the way to the end of the year! Be sure to check out specific NGO requirements, and follow us on Facebook for more news and updates.",
    ],
  },
  {
    slug: "donate-food",
    title: "Join the SevaDeep Sponsor a Meal Program",
    author: "SevaDeep",
    date: "2020-11-19",
    category: "Original",
    image: "/images/blog_title_donate-food/pic1605784878919.jpg",
    paragraphs: [
      "194 million Indians are undernourished, and our country is ranked 94th out of 107 countries in the Global Hunger Index, a measurement of the world's hunger and malnutrition levels. According to the GHI report, 14 per cent of India's population is undernourished. It also says that the country recorded a child stunting rate of 37.4 per cent.",
      "The country lockdown during spread of the COVID pandemic made food sourcing even more difficult for thousands of people. It caused a food shortage across the nation, disrupting local, regional, and national food supply chains.",
      "As a quick response to this urgent matter, SevaDeep launched Narayan Seva, a specialized, dedicated food service that provides free meals to the underprivileged masses. Narayan Seva, our long-distance food delivery program, delivers food to those in need, especially in distant regions, labor camps and chawl areas.",
      "“We made sure we make food accessible to everyone in need during these tough times. The food is cooked in the SevaDeep kitchen and we follow all the safety measures outlined by the authorities,” says Nitin, SevaDeep's Head of Operations.",
      "The Sponsor a Meal Program would not be possible without the support of hundreds of people who opened their hearts and donated to the cause. A simple donation of Rs. 3,000 helps us feed 200 people. Thousands have already benefited from the program and its popularity is only growing.",
      "In case you'd like to know more about the program, or you are interested in making a donation, visit the Sponsor a Meal Program page on our website. Remember that there are hundreds of other NGOs that could use your support in other forms too.",
      "Thanks to your support, we have onboarded over 420 NGOs till date and have completed over 1,500 donations. Spread the word and help us bridge the gap between more donors and NGOs. Be sure to follow us on Facebook for more news and updates on our work.",
    ],
  },
  {
    slug: "donate-your-old-stuff-this-diwali",
    title: "Five Ways To Make Diwali Really Special",
    author: "SevaDeep",
    date: "2020-11-10",
    category: "Original",
    image: "/images/blog_title_donate-your-old-stuff-this-diwali/pic1605006461134.jpg",
    paragraphs: [
      "Our favorite festival is right around the corner and we must say, after this year's COVID rollercoaster, it couldn't come at a better time!",
      "For many of us, this is the time to give. Buildings are collecting a “Deepavali fund” for the staff; companies are handing out bonuses and charities around the country are gearing up for donations.",
      "The festivities bring people together; they celebrate new beginnings and share their happiness. For the kind at heart, the festival is marked by reaching out to the less fortunate and donating to charity. Today, we'd like to bring to you five ways in which you can make Diwali really special this year.",
      "Replace your children's old toys with new ones and donate your old ones to Shree Santraj Yogi Shikshan Sanstha. The Pune based NGO operates an orphanage and addresses all the needs of children that lost their families.",
      "Cook the grandest meal ever but add a few more items to donate to the Maya Care Centre. The Maya Care Centre is an old age home that has been serving the elderly for the last 7 years. The foundation has 25 beneficiaries and is located in Pune. They need wheat, rice, peanuts, oil and masale.",
      "Buy new clothes for family members and donate your old ones to Dnyanjyoti Bahuuddeshiya Sanstha. This foundation works round the clock to ensure the underprivileged have good clothes to wear. Their work benefits hundreds of people from the ages of 10 to 65+.",
      "Bring home new warm winter blankets and send your old ones to Vidya Edu IX Foundation. The organisation is still working round the clock to help families in the Wambhori village, who were affected by heavy floods earlier this year.",
      "Did you decide to gift yourself a new dining set? Shree Santraj Yogi Shikshan Sanstha could really use your old one! The foundation is in urgent need of plates and spoons to feed the underprivileged families it supports on a daily basis.",
      "There are hundreds of other NGOs and foundations near you that could benefit from your donations, and guess what — they're all on the SevaDeep platform! Visit us today to make a donation to the NGO near you and put a smile on the faces of those who are less fortunate.",
    ],
  },
  {
    slug: "donate-food-money-old-items",
    title: "SevaDeep Monthly NGO Review | October 2020 | Support The NGO Near You",
    author: "SevaDeep",
    date: "2020-10-22",
    category: "Original",
    image: "/images/blog_title_donate-food-money-old-items/pic1603362663184.jpg",
    paragraphs: [
      "The monsoons are almost over and we'd like to thank each and every one of the donors who made the season more comfortable for those in need. Thanks to your donations and support, children in orphanages and the elderly in the old age homes we support were able to keep warm and stay healthy.",
      "During the month of October, we onboarded two new NGOs and completed a total of 79 deliveries of clothes, medicines, furniture, toys, books and food items. The donations were carried out across the state in Pune, Nashik, Mumbai and Aurangabad.",
      "Today, we would like to bring to your attention a few new foundations on the SevaDeep platform that may benefit from your donations. If you are in a position to donate the required items to any of these NGOs, simply visit the platform and complete the donation form.",
    ],
  },
  {
    slug: "how-to-donate-old-items-to-charity",
    title: "How I Donated to the NGO Near Me",
    author: "Maria J",
    date: "2020-10-05",
    category: "Original",
    image: "/images/blog_title_how-to-donate-old-items-to-charity/pic1601906910046.jpg",
    paragraphs: [
      "While packing for relocation, I discovered a huge pile of items that were no longer needed. Clothes, old toys the kids used to play with, board games, puzzles and a few furniture items like chairs and a work desk.",
      "I tried my best to find some use for all these items but honestly, with all the hassle of packing and leaving the apartment I was in, giving them away seemed to be the best option.",
      "I thought about the underprivileged children living in foundation homes around the city and quickly realised that giving all my old clothing items, toys and furniture to them would be a much better option than just throwing them away.",
    ],
  },
  {
    slug: "ngo-needs-in-pune",
    title: "SevaDeep Monthly NGO Review | September 2020 | Current NGO Needs In Pune City",
    author: "SevaDeep",
    date: "2020-09-25",
    category: "Donations",
    image: "/images/blog_title_ngo-needs-in-pune/pic1601037876361.jpg",
    paragraphs: [
      "As we approach the end of September, we'd like to summarise our activity and share updates from our work with the numerous NGOs and foundations of the country.",
      "During the month of September, we registered a large number of new NGOs. Today, there are 423 organisations listed on the SevaDeep platform and they could all use your help!",
      "We also recorded over one thousand donations till date since the launch of our initiative and addressed the needs of over three hundred foundations. These numbers are impressive, but we cannot forget the thousands of people who could still benefit from your donation of old items, old clothes, toys, furniture, old electrical appliances and dry food items.",
      "Today, we would like to introduce three organisations that could use your help.",
      "1. Shree Santraj Yogi Shikshan Sanstha — based in Galandwadi, Pune, home to many orphans and single parents. The NGO provides a safe home to displaced individuals and children and supports them with education, food, shelter and extracurricular activities. Urgent requirement: clothes, utensils, legumes and toys or games.",
      "2. Yashottam Janhit Pratishthan — based in Hadapsar, Pune, provides a safe and nurturing environment to young children through social and educational programs, environmental awareness and sanitation programs. In urgent need of educational supplies for a new school constructed in a nearby village.",
      "3. Caring Hands Old Age Home — operated by Madhunand Society, currently houses 100 individuals above the age of 65 who have lost their families. In need of three bookshelves for its new library.",
      "Be sure to stay tuned to the latest happenings on our Facebook page. Remember, every blessed human being has a kind side and wants to help the less fortunate ones — SevaDeep is here to help you reach those in need.",
    ],
  },
  {
    slug: "support-donate-to-old-age-homes",
    title: "Supporting Old Age Homes",
    author: "SevaDeep",
    date: "2020-09-18",
    category: "Donations",
    image: "/images/blog_title_support-donate-to-old-age-homes/pic1600424845605.jpg",
    paragraphs: [
      "Elderly homes around the country support a large number of senior citizens that are in need of assisted living or a roof over their heads. The population belonging to this age group has increased steadily since the 1950s — the Census of India 2001 enumerated approximately 7.6 crore senior citizens, which increased to 10.4 crore in 2011.",
      "With rising income levels, a growing number of senior citizens are now economically independent and willing to pay for senior living facilities. However, an extremely large number of elderly people lack the economic means or family support and have no choice but to move to shelter homes that can provide a comfortable elderly living environment, meals or medical care.",
      "There are numerous foundations on the SevaDeep platform that provide care services to elderly parents who have no home or family. There are approximately 728 old age shelters in India today — 101 reserved for women, and 278 old age homes support aged parents with medical needs. Close to 18 million people above the age of 60 in India are homeless, and these old age homes provide them love, respect and dignity in the late stages of their lives.",
      "What can you donate? 1. Old furniture — old age homes are constantly in need of cupboards, sofa sets, chairs, tables and beds.",
      "2. Blankets, throws or shawls — seniors can become dangerously chilled because they have less fat, slower circulation, and a more sluggish metabolism. Receiving a blanket or shawl can warm the body and the heart.",
      "3. Old appliances — old TV sets, microwaves and refrigerators are crucial appliances for many old age homes.",
      "4. Games, puzzles and books — nothing keeps the mind active and provides hours of fun like games and books.",
      "Log on to the SevaDeep platform and browse through our list of senior citizen homes to view their needs. If you have items to donate, just schedule your donation on the platform and we will take care of the rest.",
    ],
  },
  {
    slug: "best-things-to-donate-to-orphanage",
    title: "What Are The Best Things To Donate To An Orphanage?",
    author: "SevaDeep",
    date: "2020-09-15",
    category: "Childcare & Education",
    image: "/images/blog/pic1600178774109.jpg",
    paragraphs: [
      "Children residing in Child Care Institutions (CCIs, or orphanages) in India often lag behind when it comes to support and development initiatives. The COVID-19 lockdown made the situation worse, with donations to such institutions freezing almost completely. There are about 370,000 children in more than 9,500 CCIs in India — each one could benefit from a simple donation you can make through the SevaDeep platform.",
      "Growing children need clothes, which makes them one of the best items to donate to children living in orphanages. Children in orphanages are usually between the ages of 3 and 18, so keep that in mind when choosing which clothing items to donate.",
      "School supplies are also extremely important for children in orphanages. These foundations often take care of the children's education, and supporting them with stationery helps their cause.",
      "Another important donation item is toys! Nothing brings a bigger smile to a child's face than toys, and we see them playing enthusiastically at every orphanage we visit.",
      "This month, we'd like to bring to your attention two exceptional foundations that support young children. 1. Toybrary from Ahmednagar works round the clock to take care of children in rural areas and support their education and development, developing motor and cognitive skills and hand-eye co-ordination. 2. Disha Kendra from Mulshi uplifts socio-economically weaker tribal communities, providing basic infrastructure and facilities and supporting the education and development of young children.",
      "Children are the future of our nation, and empowering them is investing in the country's development. Support the orphanages that provide safe homes for these children today!",
    ],
  },
  {
    slug: "donate-to-people-in-need",
    title: "Want to Donate to Individuals? SevaDeep is here for you!",
    author: "ADMIN",
    date: "2020-08-27",
    category: "Donations",
    image: "/images/blog_title_donate-to-people-in-need/pic1599107568377.jpg",
    paragraphs: [
      "We are constantly working to improve our platform and make donations more accessible to those who need them the most. Over the last year, we have focused on addressing the needs of NGOs, foundations and organisations that extend a helping hand to the segments of society that need help the most. Today, we are proud to announce that you can now donate to individuals!",
      "The efficiency of the SevaDeep platform has proven itself by bringing NGOs and donors closer together. We have registered over 400 NGOs and completed over 800 donations. Donors on the platform have donated items ranging from toys and clothes to furniture and helped thousands of people in need.",
      "During the Nisarg Cyclone that hit Mumbai, we managed to provide relief in the form of grocery kits, solar lamps, roof covers and clothes. The COVID-19 lockdown that left thousands of people stranded also proved to be a challenging period. Our donation kits supported hundreds of stranded individuals in Maharashtra and helped uphold the unorganized labour sector.",
      "As a result of these events, we realised that many individuals cannot access the framework of an NGO or a foundation. This encouraged us to launch the Individual Donations Platform on SevaDeep, under which you may view the needs of individuals in different cities and search by category. When you schedule a donation, our team will visit you to collect it and deliver it safely to the concerned individual.",
      "We are working round the clock to create an ecosystem of giving that bridges the gap between needs and fulfilment. Remember to look for the “NGO near me” on the SevaDeep platform and schedule your donation today.",
    ],
  },
  {
    slug: "help-the-ngos-in-pune",
    title: "SevaDeep Monthly NGO Review — Current NGO Needs In Pune City",
    author: "SevaDeep",
    date: "2020-08-05",
    category: "Others",
    image: "/images/blog/sevadeep-r-logo.png",
    paragraphs: [
      "Every year, the onset of the monsoon season brings with it a list of requirements from the various NGOs that operate in our city. Today, we'd like to present to you a glimpse of some of the requirements of these NGOs, in the hope that you may be able to offer a helping hand.",
      "In case you have items that fit their requirements and you are able to put them up for donation, simply visit the relevant NGO's page and fill in the details — we'll take care of the rest.",
      "1. Shree Santraj Yogi Shikshan Sanstha — the orphanage and home for single parents and children requires cooking oil, rice, pulses, vegetables and sugar, as well as school supplies like uniforms, shoes and bags.",
      "2. Snehalaya Institute for Handicapped — takes care of around 70 children with disabilities and needs wheelchairs for children between the ages of 10 and 15.",
      "3. Vidya Edu IX — a trust by IncubXperts that helps underprivileged children access quality education, currently needs ten blankets for students and a range of medicines.",
      "4. Center for Agriculture and Rural Development (CARD) — operates a training centre for unemployed youngsters in the Pune region and needs three tables, five chairs and one cupboard.",
      "5. Ray of Hope Foundation — operates old age homes and supports individuals who live on their own, and requires a CCTV system to ensure the safety of their occupants.",
      "Remember that we have hundreds of other NGOs that need your help on our platform. In case you are able to make a donation, fill in the details and we will ensure your donation reaches its destination. Don't forget to stay up to date on our work on Facebook.",
    ],
  },
];

export function getReadingTime(post: BlogPost) {
  const words = post.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
