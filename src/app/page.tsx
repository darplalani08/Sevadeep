import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { Intro } from "@/components/sections/intro";
import { ActivityFeed } from "@/components/sections/activity-feed";
import { Stats } from "@/components/sections/stats";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { NewsAwards } from "@/components/sections/news-awards";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Founder } from "@/components/sections/founder";
import { CtaBanner } from "@/components/sections/cta-banner";
import { FaqSection } from "@/components/sections/faq-section";
import { siteConfig } from "@content/site";

export const metadata: Metadata = {
  title: siteConfig.tagline,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <ActivityFeed />
      <Stats />
      <TestimonialsSection />
      <NewsAwards />
      <HowItWorks />
      <Founder />
      <CtaBanner />
      <FaqSection />
    </>
  );
}
