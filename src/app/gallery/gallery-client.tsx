"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";

const tabs = [
  { value: "narayanseva", label: "Narayanseva" },
  { value: "covid", label: "Covid Initiative" },
  { value: "inkind", label: "Inkind Donations" },
];

export function GalleryClient({ narayansevaPhotos }: { narayansevaPhotos: string[] }) {
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  return (
    <Tabs defaultValue="narayanseva">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="narayanseva" className="mt-6">
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
          {narayansevaPhotos.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setLightbox(src)}
              className="block w-full overflow-hidden rounded-xl border border-border"
            >
              <div className="relative aspect-square w-full">
                <Image src={src} alt="Narayanseva food distribution" fill sizes="25vw" className="object-cover transition-transform hover:scale-105" />
              </div>
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="covid" className="mt-6">
        <EmptyState title="More photos coming soon" description="We're curating our Covid Initiative gallery — check back shortly." />
      </TabsContent>

      <TabsContent value="inkind" className="mt-6">
        <EmptyState title="More photos coming soon" description="We're curating our Inkind Donations gallery — check back shortly." />
      </TabsContent>

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent showCloseButton={false} className="max-w-3xl overflow-hidden p-0">
          <DialogTitle className="sr-only">Photo preview</DialogTitle>
          {lightbox && (
            <div className="relative aspect-video w-full bg-black">
              <Image src={lightbox} alt="" fill sizes="768px" className="object-contain" />
              <button
                type="button"
                aria-label="Close"
                onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
