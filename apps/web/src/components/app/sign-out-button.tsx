"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
      className="text-sm whitespace-nowrap text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-50"
    >
      Log out
    </button>
  );
}
