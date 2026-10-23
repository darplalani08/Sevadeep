-- Starting opportunity catalogue for the volunteer matcher.
--
-- IMPORTANT: sevadeep.org does not publish a structured list of volunteering roles (the live
-- volunteer form loads its categories dynamically and returned none during the content audit —
-- see scraper/content/volunteer-register.json). Every row below is therefore flagged is_demo and
-- is rendered in the UI with a "Demo opportunity" label. They are modelled on activities the site
-- does document: Pune doorstep pickups, NGO verification, Narayan Seva meal sponsorship, donation
-- drives and event coverage.
--
-- Administrators own this catalogue from /admin. "on conflict do nothing" means a redeploy never
-- overwrites their edits, and a deactivated or re-worded role stays as they left it.

insert into public.opportunities
  (id, title, summary, required_skills, interest_tags, availability_needs, location, is_demo)
values
  ('teaching-support', 'Teaching Support (After-School Classes)', 'Run after-school reading, English and maths sessions for children supported by SevaDeep''s partner NGOs.', '{"Teaching & Tutoring","Spoken English","Mathematics"}', '{"Child Education","Skill Development"}', '{"Weekday Evenings","Weekends"}', 'Pune', true),
  ('donation-pickup', 'Donation Pickup & Field Visits', 'Collect donated clothes, furniture and appliances from donors'' doorsteps across Pune and deliver them to the matched NGO.', '{"Driving","Logistics & Sorting","Event Management"}', '{"Donation Drives","Rural & Tribal Outreach"}', '{"Weekends","Weekday Mornings","Flexible"}', 'Pune', true),
  ('donation-sorting', 'Donation Sorting & Inventory', 'Sort, quality-check and log incoming donations so each NGO receives items that match the needs it listed.', '{"Logistics & Sorting","Data Entry"}', '{"Donation Drives"}', '{"Weekends","One-off Events"}', 'Pune', true),
  ('meal-drive', 'Narayan Seva Meal Drive Support', 'Help serve sponsored meals, manage queues and document the drive for the donors who funded it.', '{"Event Management","Logistics & Sorting","Photography"}', '{"Food & Nutrition","Donation Drives"}', '{"Weekends","One-off Events"}', 'Pune', true),
  ('digital-storytelling', 'Digital Storytelling & Social Media', 'Turn completed donation cycles into posts, photo stories and blog articles that bring in the next donor.', '{"Social Media","Content Writing","Photography","Graphic Design"}', '{"Storytelling & Awareness"}', '{"Remote / From Home","Flexible"}', 'Remote', true),
  ('ngo-onboarding', 'NGO Onboarding & Verification', 'Call and document prospective partner NGOs, check their registration papers and prepare them for listing.', '{"Data Entry","Marathi / Hindi Translation","Accounting"}', '{"NGO Capacity Building"}', '{"Weekday Mornings","Weekday Evenings","Remote / From Home"}', 'Pune / Remote', true),
  ('computer-literacy', 'Computer Literacy Workshops', 'Teach basic computer and internet skills to students and women''s groups at partner NGO centres.', '{"Computer Skills","Teaching & Tutoring"}', '{"Skill Development","Child Education","Women Empowerment"}', '{"Weekends","Weekday Evenings"}', 'Pune', true),
  ('elder-companionship', 'Old Age Home Companionship', 'Spend structured time with residents of partner old age homes — conversation, reading and basic health checks.', '{"Counselling","Medical / First Aid","Marathi / Hindi Translation"}', '{"Elderly Care","Healthcare"}', '{"Weekends","Weekday Mornings"}', 'Pune', true),
  ('fundraising-outreach', 'Fundraising & Corporate Outreach', 'Build the CSR pipeline: approach companies, prepare proposals and track pledged donation drives.', '{"Fundraising","Accounting","Content Writing"}', '{"NGO Capacity Building"}', '{"Remote / From Home","Flexible","Weekday Evenings"}', 'Pune / Remote', true)
on conflict (id) do nothing;
