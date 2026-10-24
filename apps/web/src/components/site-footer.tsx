import { cacheLife } from "next/cache";
import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const year = await currentYear();
  return (
    <footer className="mt-auto border-t border-rule bg-paper-deep/60">
      <div className="shell grid gap-10 py-14 md:grid-cols-[1.4fr_1fr]">
        <div className="max-w-md space-y-4">
          <LogoMark />
          <p className="text-sm leading-relaxed text-ink-soft">
            LaapataPaisa is an independent service. We are not part of, or endorsed by, RBI, SEBI,
            IRDAI, the IEPF Authority, EPFO or India Post. Every claim is filed with the institution
            that holds the money, and they pay it directly into your bank account.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 content-start gap-x-10 gap-y-3 text-sm md:justify-self-end"
        >
          <Link href="/check" className="text-ink-soft hover:text-ink">
            Free check
          </Link>
          <Link href="/#how" className="text-ink-soft hover:text-ink">
            How it works
          </Link>
          <Link href="/#where" className="text-ink-soft hover:text-ink">
            Where money hides
          </Link>
          <Link href="/#pricing" className="text-ink-soft hover:text-ink">
            Pricing
          </Link>
          <Link href="/#promises" className="text-ink-soft hover:text-ink">
            Our promises
          </Link>
          <Link href="/#questions" className="text-ink-soft hover:text-ink">
            Questions
          </Link>
        </nav>
      </div>
      <div className="shell">
        <p className="border-t border-rule/70 py-6 text-xs text-ink-faint">
          © {year} LaapataPaisa. Made in India.
        </p>
      </div>
    </footer>
  );
}
