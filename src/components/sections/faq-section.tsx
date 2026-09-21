import { Container, Section } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "@content/site";

export function FaqSection() {
  return (
    <Section id="faqs">
      <Container className="max-w-3xl">
        <SectionHeading align="center" eyebrow="Good to know" heading="Frequently Asked Questions" className="mx-auto" />
        <Accordion className="mt-10">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-heading text-base font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </Section>
  );
}
