import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/logo-mark";
import { getCurrentUser } from "@/server/session";
import { SignOutButton } from "./sign-out-button";

async function Account() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-5">
      <span className="hidden max-w-56 truncate text-sm text-ink-faint sm:inline">
        {user.email}
      </span>
      <SignOutButton />
    </div>
  );
}

export function AppHeader() {
  return (
    <header className="border-b border-rule/70">
      <div className="shell flex h-18 items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-8">
          <LogoMark />
          <nav aria-label="App">
            <Link
              href="/dashboard"
              className="text-[0.95rem] whitespace-nowrap text-ink-soft hover:text-ink"
            >
              Your cases
            </Link>
          </nav>
        </div>
        <Suspense fallback={null}>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}
