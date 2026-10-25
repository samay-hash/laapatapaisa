import type { Metadata } from "next";
import { Suspense } from "react";
import { PinSearch } from "@/components/search/pin-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { scanEnabled } from "@/server/document-scan";

export const metadata: Metadata = {
  title: "Search by PIN code",
  description:
    "See how much unclaimed dividend money is listed for a PIN code, and check whether your family's name is among the records.",
};

export default function SearchPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="shell flex-1 pt-12 pb-20 md:pt-16 md:pb-28">
        <div className="max-w-3xl">
          <h1 className="font-display text-[2.4rem] leading-[1.08] font-medium tracking-[-0.02em] text-balance text-ink sm:text-[3.25rem]">
            Search unclaimed money by PIN code
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Companies must publish the names of shareholders whose dividends went unclaimed. We
            gather those lists so you can look up the area your family lived in.
          </p>
        </div>
        <div className="mt-10 md:mt-12">
          <Suspense>
            <PinSearch scanEnabled={scanEnabled} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
