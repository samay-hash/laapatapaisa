import { twMerge } from "tailwind-merge";

type Variant = "primary" | "inverse" | "quiet";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-[0.95rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-royal text-paper shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-royal-deep",
  inverse: "bg-paper text-royal-deep hover:bg-white focus-visible:outline-paper",
  quiet:
    "px-1 py-1 text-ink underline decoration-rule decoration-2 underline-offset-[6px] hover:decoration-royal",
};

/** Button classes. Later classes win, so `extra` can override padding or size safely. */
export function buttonClass(variant: Variant = "primary", extra = ""): string {
  return twMerge(base, variants[variant], extra);
}
