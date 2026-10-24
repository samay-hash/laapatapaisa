"use client";

import { useActionState, useState } from "react";
import { createCaseAction, type FormState } from "@/app/(app)/cases/actions";
import { buttonClass } from "@/components/ui/button";
import { describedBy, Field, FormError, inputClass } from "@/components/ui/field";
import { relationLabel } from "@/lib/labels";
import { relations } from "@/lib/validation/case";

export function NewCaseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCaseAction, {});
  const [relation, setRelation] = useState("");
  const [living, setLiving] = useState("");
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const isSelf = relation === "self";

  return (
    <form action={action} className="mt-10 space-y-7" noValidate>
      <FormError message={state.error} />

      <Field
        label="Full name"
        htmlFor="fullName"
        hint="For example: Ramesh Chandra Sharma"
        error={e.fullName}
      >
        <input
          id="fullName"
          name="fullName"
          defaultValue={v.fullName}
          required
          maxLength={120}
          autoComplete="off"
          className={inputClass}
          {...describedBy("fullName", { hint: true, error: e.fullName })}
        />
      </Field>

      <Field label="How are they related to you?" htmlFor="relation" error={e.relation}>
        <select
          id="relation"
          name="relation"
          required
          value={relation}
          onChange={(ev) => {
            setRelation(ev.target.value);
            if (ev.target.value === "self") setLiving("yes");
          }}
          className={inputClass}
          {...describedBy("relation", { error: e.relation })}
        >
          <option value="" disabled>
            Choose one
          </option>
          {relations.map((r) => (
            <option key={r} value={r}>
              {relationLabel[r]}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="text-[0.95rem] font-semibold text-ink">Are they living?</legend>
        <div className="mt-2 flex gap-3">
          {[
            ["yes", "Yes"],
            ["no", "They have passed away"],
          ].map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 ${
                living === value ? "border-royal ring-1 ring-royal" : "border-paper-edge"
              } ${isSelf && value === "no" ? "pointer-events-none opacity-40" : ""}`}
            >
              <input
                type="radio"
                name="isLiving"
                value={value}
                checked={living === value}
                disabled={isSelf && value === "no"}
                onChange={() => setLiving(value!)}
                className="size-4 accent-royal"
              />
              {label}
            </label>
          ))}
        </div>
        {e.isLiving ? (
          <p className="mt-2 text-sm text-[#a33a2b]" role="alert">
            {e.isLiving}
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-7 sm:grid-cols-2">
        <Field label="Year of birth" htmlFor="birthYear" hint="Optional" error={e.birthYear}>
          <input
            id="birthYear"
            name="birthYear"
            defaultValue={v.birthYear}
            inputMode="numeric"
            maxLength={4}
            className={inputClass}
            {...describedBy("birthYear", { hint: true, error: e.birthYear })}
          />
        </Field>
        {living === "no" ? (
          <Field label="Year of death" htmlFor="deathYear" hint="Optional" error={e.deathYear}>
            <input
              id="deathYear"
              name="deathYear"
              defaultValue={v.deathYear}
              inputMode="numeric"
              maxLength={4}
              className={inputClass}
              {...describedBy("deathYear", { hint: true, error: e.deathYear })}
            />
          </Field>
        ) : null}
      </div>

      <Field
        label="Cities they lived in"
        htmlFor="cities"
        hint="Optional. Separate with commas: Kanpur, Lucknow"
        error={e.cities}
      >
        <input
          id="cities"
          name="cities"
          defaultValue={v.cities}
          maxLength={300}
          className={inputClass}
          {...describedBy("cities", { hint: true, error: e.cities })}
        />
      </Field>

      <Field
        label="What did they do for a living?"
        htmlFor="occupation"
        hint="Optional"
        error={e.occupation}
      >
        <input
          id="occupation"
          name="occupation"
          defaultValue={v.occupation}
          maxLength={120}
          className={inputClass}
          {...describedBy("occupation", { hint: true, error: e.occupation })}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className={buttonClass("primary", "w-full sm:w-auto")}
      >
        {pending ? "Creating…" : "Create case"}
      </button>
    </form>
  );
}
