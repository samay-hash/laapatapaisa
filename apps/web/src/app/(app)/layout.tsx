import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app/app-header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <main id="main" className="shell flex-1 py-12 md:py-16">
        {children}
      </main>
    </>
  );
}
