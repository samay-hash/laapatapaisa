"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { FormError, inputClass } from "@/components/ui/field";
import { formatRupees } from "@/lib/labels";
import { documentTypeLabel, pinFrom, type ScannedDocument } from "@/lib/scan/document";

// Photo of an old paper in, details out. The photo is shrunk in the browser
// before upload (faster, cheaper) and the server never stores it.

const MAX_EDGE = 2000;

async function prepare(file: File): Promise<File> {
  if (file.type === "application/pdf") return file;
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
    throw new Error(
      "HEIC photos cannot be read here. Take a screenshot of the photo, or set the camera to “Most compatible”.",
    );
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This file is not a photo we can open. Use a JPEG or PNG.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
  if (!blob) throw new Error("The photo could not be prepared. Try another one.");
  return new File([blob], "paper.jpg", { type: "image/jpeg" });
}

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; preview: string | null }
  | { kind: "done"; preview: string | null; doc: ScannedDocument };

export function ScanPaper({
  enabled,
  title = "Scan an old paper",
  intro = "A passbook, share certificate, dividend warrant or policy. We read the details and discard the photo; it is never stored.",
  renderActions,
}: {
  enabled: boolean;
  title?: string;
  intro?: string;
  renderActions: (doc: ScannedDocument, reset: () => void) => React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  // Release preview URLs when they are replaced.
  const preview = phase.kind === "idle" ? null : phase.preview;
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function read(file: File) {
    setError(undefined);
    let ready: File;
    try {
      ready = await prepare(file);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const url = ready.type.startsWith("image/") ? URL.createObjectURL(ready) : null;
    setPhase({ kind: "reading", preview: url });
    const body = new FormData();
    body.append("file", ready);
    try {
      const res = await fetch("/api/scan", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhase({ kind: "idle" });
        if (res.status === 401) setNeedsLogin(true);
        else setError(json.error ?? "The paper could not be read. Try again.");
        return;
      }
      setPhase({ kind: "done", preview: url, doc: json as ScannedDocument });
    } catch {
      setPhase({ kind: "idle" });
      setError("Could not reach the server. Check your connection.");
    }
  }

  function reset() {
    setPhase({ kind: "idle" });
    setError(undefined);
  }

  if (!enabled) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-paper-edge bg-[#fbf7ec]"
    >
      <header className="flex items-start gap-4 border-b border-paper-edge px-6 py-5 sm:px-7">
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg border border-stamp/40 text-stamp"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
            <path d="M14 3v5h5M10 13h6M10 17h4" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h2 id={headingId} className="font-display text-xl font-medium text-ink">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{intro}</p>
        </div>
      </header>

      <div className="px-6 py-6 sm:px-7">
        <FormError message={error} />
        {needsLogin ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-paper-deep/60 px-4 py-3">
            <p className="text-sm text-ink">Log in to scan papers. It is free.</p>
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className={buttonClass("primary", "px-4 py-2 text-sm")}
            >
              Log in
            </Link>
          </div>
        ) : null}

        {phase.kind === "idle" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) void read(f);
            }}
            className={`mt-1 flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-9 text-center transition-colors ${
              dragging ? "border-royal bg-royal/[0.04]" : "border-rule"
            }`}
          >
            <p className="font-semibold text-ink">Photograph the whole page in good light</p>
            <p className="mt-1 text-sm text-ink-faint">
              JPEG, PNG or PDF, up to 4 MB. Or drop a file here.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className={buttonClass("primary", "px-4 py-2.5 text-sm")}
              >
                Take a photo
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-ink/20 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink/50"
              >
                Choose a file
              </button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void read(f);
              }}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void read(f);
              }}
            />
          </div>
        ) : null}

        {phase.kind === "reading" ? (
          <div
            className="grid items-center gap-6 sm:grid-cols-[8rem_1fr]"
            aria-live="polite"
            aria-busy="true"
          >
            <Thumb src={phase.preview} />
            <div>
              <p className="font-semibold text-ink">Reading the paper…</p>
              <p className="mt-1 text-sm text-ink-soft">This usually takes 10 to 30 seconds.</p>
              <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-paper-edge">
                <div className="h-full w-1/3 animate-[scanbar_1.4s_ease-in-out_infinite] rounded-full bg-royal" />
              </div>
            </div>
          </div>
        ) : null}

        {phase.kind === "done" ? (
          <ScanResult
            doc={phase.doc}
            preview={phase.preview}
            onChange={(doc) => setPhase({ ...phase, doc })}
            actions={renderActions(phase.doc, reset)}
            onRescan={reset}
          />
        ) : null}
      </div>
    </section>
  );
}

function Thumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- local blob preview, never uploaded anywhere
    <img
      src={src}
      alt="Your photo"
      className="aspect-[3/4] w-32 rounded-md border border-paper-edge object-cover"
    />
  ) : (
    <div className="grid aspect-[3/4] w-32 place-items-center rounded-md border border-paper-edge text-sm text-ink-faint">
      PDF
    </div>
  );
}

function ScanResult({
  doc,
  preview,
  onChange,
  actions,
  onRescan,
}: {
  doc: ScannedDocument;
  preview: string | null;
  onChange: (doc: ScannedDocument) => void;
  actions: React.ReactNode;
  onRescan: () => void;
}) {
  if (doc.documentType === "not_a_financial_paper") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-soft">
          This does not look like a financial paper. Try a passbook, certificate, warrant or policy.
        </p>
        <button
          type="button"
          onClick={onRescan}
          className={buttonClass("primary", "px-4 py-2.5 text-sm")}
        >
          Scan another
        </button>
      </div>
    );
  }

  const set = <K extends keyof ScannedDocument>(key: K, value: ScannedDocument[K]) =>
    onChange({ ...doc, [key]: value });
  const pin = pinFrom(doc);

  return (
    <div className="grid gap-6 sm:grid-cols-[8rem_1fr]">
      <Thumb src={preview} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-stamp/40 px-2.5 py-0.5 text-xs font-semibold text-stamp">
            {documentTypeLabel[doc.documentType]}
          </span>
          {doc.legibility !== "clear" ? (
            <span className="text-sm text-[#8a5a12]">
              {doc.legibility === "unreadable"
                ? "Hard to read. A clearer photo will help."
                : "Partly readable. Check the details."}
            </span>
          ) : (
            <span className="text-sm text-ink-faint">Check the details, then use them below.</span>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <EditField
            wide
            label="Name on the paper"
            value={doc.holderName}
            onChange={(v) => set("holderName", v)}
          />
          <EditField
            label="Father or husband"
            value={doc.fatherOrHusbandName}
            onChange={(v) => set("fatherOrHusbandName", v)}
          />
          <EditField
            label="Company, bank or insurer"
            value={doc.institution}
            onChange={(v) => set("institution", v)}
          />
          <EditField
            label="PIN code"
            value={doc.pinCode ?? pin}
            onChange={(v) => set("pinCode", v)}
            inputMode="numeric"
          />
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-paper-edge pt-5 text-sm sm:grid-cols-[10rem_1fr]">
          {doc.references.map((r) => (
            <Row key={`${r.label}-${r.value}`} term={r.label}>
              <span className="font-semibold tabular-nums">{r.value}</span>
            </Row>
          ))}
          {doc.amountRupees != null ? (
            <Row term="Amount">{formatRupees(Math.round(doc.amountRupees))}</Row>
          ) : null}
          {doc.shares != null ? <Row term="Shares or units">{doc.shares}</Row> : null}
          {doc.address ? <Row term="Address">{doc.address}</Row> : null}
          {doc.jointHolders.length ? (
            <Row term="Joint holders">{doc.jointHolders.join(", ")}</Row>
          ) : null}
          {doc.nominee ? <Row term="Nominee">{doc.nominee}</Row> : null}
          {doc.dates.map((d) => (
            <Row key={`${d.label}-${d.value}`} term={d.label}>
              {d.value}
            </Row>
          ))}
        </dl>
        {doc.notes ? (
          <p className="mt-4 rounded-md bg-paper-deep/60 px-4 py-3 text-sm leading-relaxed text-ink">
            {doc.notes}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {actions}
          <button type="button" onClick={onRescan} className={buttonClass("quiet", "text-sm")}>
            Scan another paper
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink-faint">{term}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </>
  );
}

function EditField({
  label,
  value,
  onChange,
  inputMode,
  wide,
}: {
  wide?: boolean;
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  inputMode?: "numeric";
}) {
  const id = useId();
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-xs font-semibold text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        value={value ?? ""}
        placeholder="Not found"
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)}
        className={`${inputClass} mt-1 py-2.5`}
      />
    </div>
  );
}
