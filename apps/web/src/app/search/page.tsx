import type { Metadata } from "next";
import { Suspense } from "react";
import { PinSearch } from "@/components/search/pin-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Search by PIN code",
  description:
    "See how much unclaimed dividend money is listed for a PIN code, and check whether your family's name is among the records.",
};

export default function SearchPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="shell flex-1 py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl leading-tight font-medium tracking-[-0.015em] text-balance text-ink sm:text-5xl">
            Search by PIN code
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Companies must publish the names of shareholders whose dividends went unclaimed. We
            gather those lists so you can search them by the PIN code your family lived at.
          </p>
        </div>
        <div className="mt-12">
          <Suspense>
            <PinSearch />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
