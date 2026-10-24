"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        // Full load so no page kept alive in memory still shows signed-in data.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full reload
        window.location.assign("/");
      }}
      className="text-sm whitespace-nowrap text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-50"
    >
      Log out
    </button>
  );
}
