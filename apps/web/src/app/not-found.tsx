import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="shell flex-1 py-24">
        <h1 className="font-display text-4xl font-medium text-ink">This page is laapata.</h1>
        <p className="mt-4 max-w-md text-lg text-ink-soft">
          The link may be old or mistyped. The free check is a good place to start.
        </p>
        <Link href="/check" className={buttonClass("primary", "mt-8")}>
          Start the free check
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
