import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { buttonClass } from "@/components/ui/button";

const nav = [
  { href: "/search", label: "Search by PIN" },
  { href: "/#where", label: "Where money hides" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#questions", label: "Questions" },
] as const;

export function SiteHeader({ showCta = true }: { showCta?: boolean }) {
  return (
    <header className="border-b border-rule/70">
      <div className="shell flex h-18 items-center justify-between gap-6">
        <LogoMark />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[0.95rem] text-ink-soft">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="text-[0.95rem] whitespace-nowrap text-ink-soft hover:text-ink"
          >
            Log in
          </Link>
          {showCta ? (
            // Hidden on phones: the hero's own button sits just below.
            <span className="hidden sm:block">
              <Link
                href="/check"
                className={buttonClass("primary", "px-4 py-2.5 text-sm whitespace-nowrap")}
              >
                Start the free check
              </Link>
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
