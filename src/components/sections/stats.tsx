import { Container, Section } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { StatCounter } from "@/components/common/stat-counter";
import { stats } from "@content/home";

export function Stats() {
  return (
    <Section className="bg-primary text-primary-foreground">
      <Container>
        <SectionHeading
          align="center"
          eyebrow={stats.eyebrow}
          heading={stats.heading}
          className="[&_h2]:text-primary-foreground [&_span]:bg-primary-foreground/15 [&_span]:text-primary-foreground"
        />
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {stats.items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-heading text-4xl font-bold sm:text-5xl">
                <StatCounter value={item.value} suffix="+" />
              </p>
              <p className="mt-2 text-sm font-medium text-primary-foreground/80 sm:text-base">{item.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
