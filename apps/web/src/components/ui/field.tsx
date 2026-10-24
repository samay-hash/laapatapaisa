import type { ReactNode } from "react";

export const inputClass =
  "block w-full rounded-md border border-paper-edge bg-[#fdfaf2] px-4 py-3 text-[1rem] text-ink placeholder:text-ink-faint focus:border-royal focus:outline-none focus:ring-1 focus:ring-royal aria-invalid:border-[#a33a2b] disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[0.95rem] font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1 text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-2 text-sm text-[#a33a2b]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** aria props that tie an input to its hint and error text. */
export function describedBy(id: string, opts: { hint?: boolean; error?: string }) {
  const ids = [opts.hint ? `${id}-hint` : null, opts.error ? `${id}-error` : null].filter(Boolean);
  return {
    "aria-describedby": ids.length ? ids.join(" ") : undefined,
    "aria-invalid": opts.error ? true : undefined,
  };
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-[#a33a2b]/30 bg-[#a33a2b]/[0.06] px-4 py-3 text-sm text-[#7d2a1f]"
    >
      {message}
    </p>
  );
}
