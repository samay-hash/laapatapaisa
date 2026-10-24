import Link from "next/link";
import { site } from "@/lib/site";

export function LogoMark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-3"
      aria-label={`${site.name} home`}
    >
      <span
        aria-hidden="true"
        className="grid size-9 -rotate-6 place-items-center rounded-[5px] border-2 border-stamp font-deva text-lg leading-none text-stamp transition-transform duration-200 group-hover:rotate-0"
      >
        ला
      </span>
      <span className="font-display text-[1.35rem] font-semibold tracking-[-0.01em] text-ink">
        {site.name}
      </span>
    </Link>
  );
}
