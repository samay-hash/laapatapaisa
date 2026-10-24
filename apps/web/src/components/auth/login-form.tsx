"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { describedBy, Field, FormError, inputClass } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-next";

type Step = "email" | "code";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(undefined);
    setPending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setPending(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many codes requested. Wait a few minutes, then try again."
          : "We could not send a code to that address. Check it and try again.",
      );
      return;
    }
    setStep("code");
    setCode("");
    requestAnimationFrame(() => codeRef.current?.focus());
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    const { error } = await authClient.signIn.emailOtp({ email, otp: code });
    if (error) {
      setPending(false);
      setError(
        error.status === 429
          ? "Too many attempts. Wait a few minutes, then request a new code."
          : "That code is wrong or has expired. Check the latest email, or send a new code.",
      );
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function google() {
    setError(undefined);
    setPending(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (error) {
      setPending(false);
      setError("Google sign-in did not start. Try again, or use your email.");
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="space-y-6" noValidate>
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">Check your email</h1>
          <p className="mt-2 leading-relaxed text-ink-soft">
            We sent a 6-digit code to <span className="font-semibold text-ink">{email}</span>. It
            expires in 10 minutes.
          </p>
        </div>
        <FormError message={error} />
        <Field label="Login code" htmlFor="code">
          <input
            ref={codeRef}
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} text-center font-display text-2xl tracking-[0.5em]`}
            {...describedBy("code", { error })}
          />
        </Field>
        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className={buttonClass("primary", "w-full")}
        >
          {pending ? "Checking…" : "Log in"}
        </button>
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => setStep("email")}
            className={buttonClass("quiet", "py-1")}
          >
            Use a different email
          </button>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={pending}
            className={buttonClass("quiet", "py-1")}
          >
            Send a new code
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">Log in or sign up</h1>
        <p className="mt-2 leading-relaxed text-ink-soft">
          We will email you a code. No password to remember.
        </p>
      </div>
      <FormError message={error} />
      <form onSubmit={sendCode} className="space-y-5">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            className={inputClass}
            {...describedBy("email", { error })}
          />
        </Field>
        <button
          type="submit"
          disabled={pending || !email}
          className={buttonClass("primary", "w-full")}
        >
          {pending ? "Sending…" : "Email me a code"}
        </button>
      </form>
      {googleEnabled ? (
        <>
          <div className="flex items-center gap-4 text-sm text-ink-faint" aria-hidden="true">
            <span className="h-px flex-1 bg-rule" />
            or
            <span className="h-px flex-1 bg-rule" />
          </div>
          <button
            type="button"
            onClick={google}
            disabled={pending}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-paper-edge bg-paper px-5 py-3 font-semibold text-ink transition-colors hover:border-ink-faint disabled:opacity-50"
          >
            Continue with Google
          </button>
        </>
      ) : null}
    </div>
  );
}
