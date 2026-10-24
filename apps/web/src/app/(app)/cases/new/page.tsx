import type { Metadata } from "next";
import { NewCaseForm } from "@/components/cases/new-case-form";

export const metadata: Metadata = { title: "Add a person" };

export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-medium tracking-[-0.015em] text-ink">
        Add a person
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-ink-soft">
        Write their name as it would appear on old papers. We will prepare the other spellings
        records might use.
      </p>
      <NewCaseForm />
    </div>
  );
}
