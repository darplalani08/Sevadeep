import { Container, Section } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { CategoryCard } from "@/components/cards/category-card";
import { intro } from "@content/home";
import { donationCategories } from "@content/site";

export function Intro() {
  return (
    <Section>
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeading eyebrow="What is Sevadeep" heading={intro.heading} />
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base lg:pt-2">
            {intro.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h3 className="font-heading text-lg font-semibold text-foreground">What can you donate?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Physical goods only, no cash — pick a category to see what NGOs currently need.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {donationCategories.map((cat, i) => (
              <CategoryCard key={cat.id} label={cat.label} icon={cat.icon} href="/ngo-needs" index={i} />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
