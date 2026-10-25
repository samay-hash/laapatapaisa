"use client";

import { useRef } from "react";

// Six boxes, like the PIN code row on an Indian postal form. The gap after the
// third box mirrors how a PIN is read: sorting district, then delivery office.
export function PinBoxes({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(5, i))]?.focus();

  return (
    <div role="group" aria-labelledby="pin-label" className="flex items-center gap-2 sm:gap-2.5">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={i === 3 ? "ml-2 sm:ml-3" : undefined}>
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={`Digit ${i + 1} of 6`}
            inputMode="numeric"
            autoComplete={i === 0 ? "postal-code" : "off"}
            autoFocus={autoFocus && i === 0}
            maxLength={1}
            value={value[i] ?? ""}
            onFocus={(e) => {
              // Typing always continues from the first empty box.
              if (i > value.length) focusAt(value.length);
              else e.target.select();
            }}
            onChange={(e) => {
              const digit = e.target.value.replace(/\D/g, "").slice(-1);
              if (!digit) return;
              const next = (value.slice(0, i) + digit + value.slice(i + 1)).slice(0, 6);
              onChange(next);
              focusAt(i + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                e.preventDefault();
                const at = value[i] ? i : i - 1;
                if (at < 0) return;
                onChange(value.slice(0, at));
                focusAt(at);
              } else if (e.key === "ArrowLeft") focusAt(i - 1);
              else if (e.key === "ArrowRight") focusAt(i + 1);
            }}
            onPaste={(e) => {
              const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              if (!digits) return;
              e.preventDefault();
              onChange(digits);
              focusAt(digits.length);
            }}
            className="h-14 w-11 rounded-md border-[1.5px] border-ink/15 bg-[#fdfaf2] text-center font-display text-[1.75rem] text-ink tabular-nums shadow-[inset_0_-3px_0_var(--color-paper-edge)] transition-colors outline-none focus:border-royal focus:shadow-[inset_0_-3px_0_var(--color-royal)] sm:h-16 sm:w-13 sm:text-[2rem]"
          />
        </span>
      ))}
    </div>
  );
}
