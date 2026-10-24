export const site = {
  name: "LaapataPaisa",
  tagline: "Find the money your family forgot",
  description:
    "Old fixed deposits, shares, insurance and provident fund often go unclaimed after someone passes away. LaapataPaisa shows your family where to look, reads old papers for clues, and prepares the claim.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
