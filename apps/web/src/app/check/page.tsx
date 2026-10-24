import type { Metadata } from "next";
import { CheckWizard } from "@/components/check/check-wizard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Free check",
  description:
    "Answer a few questions about a family member and see which places are worth searching for their unclaimed money.",
};

export default function CheckPage() {
  return (
    <>
      <SiteHeader showCta={false} />
      <main id="main" className="shell flex-1 py-14 md:py-20">
        <CheckWizard />
      </main>
      <SiteFooter />
    </>
  );
}
