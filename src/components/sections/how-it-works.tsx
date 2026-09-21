import { Container, Section } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { StepsTimeline } from "@/components/common/steps-timeline";
import { howItWorks } from "@content/home";

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Container>
        <SectionHeading align="center" eyebrow={howItWorks.eyebrow} heading={howItWorks.heading} className="mx-auto" />
        <div className="mt-14">
          <StepsTimeline steps={howItWorks.steps} />
        </div>
      </Container>
    </Section>
  );
}
