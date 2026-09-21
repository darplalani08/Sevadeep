import { Container, Section } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { TestimonialCard } from "@/components/common/testimonial-card";
import { testimonials } from "@content/home";

export function TestimonialsSection() {
  return (
    <Section>
      <Container>
        <SectionHeading eyebrow={testimonials.eyebrow} heading={testimonials.heading} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {testimonials.items.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
