import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { LogoMark } from "@/components/logo-mark";
import { googleEnabled } from "@/server/auth";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <main id="main" className="shell flex flex-1 flex-col items-center py-14 md:py-20">
      <LogoMark />
      <div className="mt-10 w-full max-w-md rounded-md border border-paper-edge bg-[#fbf7ec] p-7 sm:p-9">
        <Suspense>
          <LoginForm googleEnabled={googleEnabled} />
        </Suspense>
      </div>
      <p className="mt-6 max-w-md text-center text-sm text-ink-faint">
        We will never ask for this code on a call or a message. Anyone who does is not us.
      </p>
    </main>
  );
}
