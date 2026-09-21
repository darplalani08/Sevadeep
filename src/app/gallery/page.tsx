import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { GalleryClient } from "./gallery-client";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos from SevaDeep's Narayanseva food distribution, COVID relief initiative, and in-kind donation drives.",
  alternates: { canonical: "/gallery" },
};

const narayansevaPhotos = [
  "/images/gallery/seva.jpg",
  "/images/gallery/seva1.jpg",
  "/images/gallery/seva2.jpg",
  "/images/gallery/seva3.jpg",
  "/images/gallery/seva4.jpg",
  "/images/gallery/seva5.jpg",
];

export default function GalleryPage() {
  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "Gallery" }]} />
          <h1 className="mt-3 text-display-3 font-heading font-semibold text-foreground">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Moments from our Narayanseva drives, COVID relief work, and in-kind donations.
          </p>
        </Container>
      </div>
      <Section className="pt-10">
        <Container>
          <GalleryClient narayansevaPhotos={narayansevaPhotos} />
        </Container>
      </Section>
    </>
  );
}
