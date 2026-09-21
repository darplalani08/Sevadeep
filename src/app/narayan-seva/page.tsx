import type { Metadata } from "next";
import Image from "next/image";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { MealSponsorForm } from "./meal-sponsor-form";

export const metadata: Metadata = {
  title: "Narayan Seva — Sponsor A Meal",
  description:
    "Feed the hungry in their most desperate hour. Sponsor a meal through SevaDeep's Narayan Seva program, feeding 250 people daily at Sassoon Hospital, Pune.",
  alternates: { canonical: "/narayan-seva" },
};

const paragraphs = [
  "We are on a mission to feed people who might otherwise go hungry or starve because they cannot pay for their daily meals while their families undergo medical treatment.",
  "The Foundation distributes khichadi to 250 people at the Sassoon Hospital daily. This khichadi is prepared under strict hygiene conditions at the Baner office of Relfor Foundation.",
  "During the COVID pandemic, Relfor Foundation also distributed free food to laborers' camps. This initiative benefitted thousands of migrated laborers and relatives of patients from a rural background.",
  "Your one-time charity can feed a hundred hungry masses.",
];

export default function NarayanSevaPage() {
  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "Narayan Seva" }]} />
          <p className="mt-3 text-xs font-semibold tracking-widest text-accent-600 uppercase dark:text-accent-400">
            Narayan Seva
          </p>
          <h1 className="mt-1 text-display-2 font-heading font-semibold text-balance text-foreground">
            Feed The Hungry, <span className="text-primary">in their most desperate hour.</span>
          </h1>
        </Container>
      </div>

      <Section className="pt-10">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] border border-border shadow-xl">
            <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
              <Image
                src="/images/narayan-seva/pic1654516487569.jpg"
                alt="Narayan Seva daily food distribution at Sassoon Hospital, Pune"
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
            <MealSponsorForm />
          </div>
        </Container>
      </Section>
    </>
  );
}
