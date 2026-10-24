import Link from "next/link";
import { FamilyRecord } from "@/components/family-record";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonClass } from "@/components/ui/button";
import { sources } from "@/content/sources";

const steps = [
  {
    title: "Tell us about them",
    body: "Their name and every way it was written, where they lived, where they worked. Old records often use initials or a different spelling, and that is where most searches fail.",
  },
  {
    title: "Photograph the old papers",
    body: "Passbooks, dividend letters, premium receipts, share certificates. We read them and pull out company names, folio numbers and policy numbers.",
  },
  {
    title: "Search with a guide",
    body: "For each place money can sit, we tell you which official portal to use, what to type, and which name variants to try. Searches that need your OTP stay in your hands.",
  },
  {
    title: "Get the claim pack",
    body: "When something turns up, you get the exact list of documents that institution asks for, forms filled in where we can, and where to send them.",
  },
  {
    title: "Track it to the end",
    body: "Claims can take months. We keep the dates, send reminders, and tell you what to do when an office goes quiet.",
  },
] as const;

const promises = [
  {
    title: "We never ask for passwords or OTPs",
    body: "Not for your bank, not for any portal. Anyone who asks for an OTP in our name is not us.",
  },
  {
    title: "Money never passes through us",
    body: "Banks, insurers and companies pay the claimant directly. We never hold or forward funds.",
  },
  {
    title: "Your family's details are not for sale",
    body: "We use them only to work on your case. No advertisers, no data brokers.",
  },
  {
    title: "You can delete everything",
    body: "One request removes your case, papers and history from our systems.",
  },
] as const;

const plans = [
  {
    name: "Free check",
    price: "₹0",
    unit: "",
    summary:
      "A two-minute questionnaire that shows which places are worth searching for one person.",
    includes: [
      "Where to look, in order",
      "Links to the official portals",
      "No sign-up, no ID numbers",
    ],
    available: true,
  },
  {
    name: "Recovery kit",
    price: "₹999",
    unit: "one time, per person",
    summary: "Everything you need to search and claim yourself.",
    includes: [
      "Reading of old papers for clues",
      "Name variants for every search",
      "Claim pack for each institution",
      "Reminders until the claim closes",
    ],
    available: false,
  },
  {
    name: "Done for you",
    price: "A share",
    unit: "of what is recovered",
    summary:
      "Our team prepares and follows up the claim with you. The share is agreed in writing before we start.",
    includes: [
      "Nothing to pay if nothing is found",
      "A named case manager",
      "Lawyer referrals when heirship is disputed",
    ],
    available: false,
  },
] as const;

const questions = [
  {
    q: "Is this a government service?",
    a: "No. LaapataPaisa is independent. The money sits with RBI, IEPF, insurers, fund houses, EPFO or India Post, and every claim is made to them. We help you find it and get the paperwork right.",
  },
  {
    q: "Can a stranger find my family's money with this?",
    a: "Some official lists, such as IEPF and banks' unclaimed deposit lists, are public by design so families can find them. Collecting the money is different: institutions ask for a death certificate, proof that you are the nominee or legal heir, KYC and signed forms. Finding a record is not the same as being able to claim it.",
  },
  {
    q: "Will a phone number be enough to search?",
    a: "No. Official searches need the person's name as it was recorded, and usually a date of birth, PAN, father's name or old address. Old papers at home are often the fastest way to fill those gaps.",
  },
  {
    q: "What if they never named a nominee?",
    a: "Then the institution usually asks for proof of legal heirship, such as a legal heir certificate, a will, or for larger amounts a succession certificate from a court. This is the slowest part of most claims, so it helps to start early.",
  },
  {
    q: "Do I need to share Aadhaar or PAN for the free check?",
    a: "No. The free check asks general questions only, and your answers stay in your browser.",
  },
  {
    q: "How long does a claim take?",
    a: "It depends on the institution. A bank claim with a nominee can close in weeks. Share claims through IEPF and claims that need a succession certificate often take several months.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero */}
        <section className="shell grid items-center gap-14 pt-14 pb-20 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:pt-24 lg:pb-28">
          <div className="max-w-xl">
            <h1 className="font-display text-[2.6rem] leading-[1.06] font-medium tracking-[-0.02em] text-balance text-ink sm:text-[3.4rem] lg:text-[3.9rem]">
              The money your family forgot is still waiting.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
              Old FDs, shares, insurance and PF often go unclaimed after someone passes away. We
              help you find where to look, read old papers for clues, and prepare the claim, step by
              step.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/check" className={buttonClass("primary", "px-6 py-3.5 text-base")}>
                Start the free check
              </Link>
              <Link href="#how" className={buttonClass("quiet")}>
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-sm text-ink-faint">
              Free, about two minutes. No PAN or Aadhaar needed.
            </p>
          </div>
          <div className="mx-auto w-full max-w-lg lg:mx-0 lg:justify-self-end">
            <FamilyRecord />
          </div>
        </section>

        {/* The scale of the problem */}
        <section aria-labelledby="scale" className="border-y border-rule bg-paper-deep/70">
          <div className="shell grid gap-6 py-14 md:grid-cols-[auto_1fr] md:items-end md:gap-14 md:py-16">
            <p
              id="scale"
              className="font-display text-5xl font-medium tracking-[-0.02em] text-ink tabular-nums sm:text-6xl"
            >
              ₹78,212 crore
            </p>
            <div className="max-w-xl space-y-2 md:pb-1.5">
              <p className="text-lg leading-relaxed text-ink">
                That is how much unclaimed bank money sat in RBI&apos;s DEA Fund in March 2024, and
                it counts banks alone, before shares, insurance and PF.
              </p>
              <p className="text-sm text-ink-faint">Source: RBI Annual Report 2023–24</p>
            </div>
          </div>
        </section>

        {/* Where money hides */}
        <section
          id="where"
          aria-labelledby="where-title"
          className="shell scroll-mt-6 py-20 md:py-28"
        >
          <div className="max-w-2xl">
            <h2
              id="where-title"
              className="font-display text-4xl leading-tight font-medium tracking-[-0.015em] text-balance sm:text-[2.75rem]"
            >
              Six places money goes quiet
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              Each one has its own rules, its own portal and its own paperwork. That, more than
              anything, is why families give up.
            </p>
          </div>

          <div className="mt-12 border-t-2 border-ink">
            <div className="hidden grid-cols-[1.1fr_1fr_1.3fr_1.3fr] gap-8 border-b border-rule py-3 text-sm text-ink-faint lg:grid">
              <span>Where</span>
              <span>Goes quiet when</span>
              <span>Where it sits now</span>
              <span>Clues to look for at home</span>
            </div>
            <ul>
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="grid gap-2 border-b border-rule py-6 lg:grid-cols-[1.1fr_1fr_1.3fr_1.3fr] lg:gap-8"
                >
                  <h3 className="font-display text-xl font-medium text-ink">{source.name}</h3>
                  <p className="text-ink">
                    <span className="text-ink-faint lg:hidden">Goes quiet when: </span>
                    {source.goesQuietWhen}
                  </p>
                  <p className="leading-relaxed text-ink-soft">{source.whereItSits}</p>
                  <p className="leading-relaxed text-ink-soft">
                    <span className="text-ink-faint lg:hidden">Clues at home: </span>
                    {source.cluesAtHome}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          aria-labelledby="how-title"
          className="scroll-mt-6 border-t border-rule bg-paper-deep/50"
        >
          <div className="shell grid gap-12 py-20 md:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div className="lg:sticky lg:top-10 lg:self-start">
              <h2
                id="how-title"
                className="font-display text-4xl leading-tight font-medium tracking-[-0.015em] text-balance sm:text-[2.75rem]"
              >
                From a name to a filed claim
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
                No single website searches everything. So we turn a scattered, months-long job into
                one list you can work through.
              </p>
            </div>
            <ol className="relative">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="relative grid grid-cols-[3rem_1fr] gap-5 pb-10 last:pb-0"
                >
                  {i < steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-12 bottom-0 left-6 w-px bg-rule"
                    />
                  ) : null}
                  <span className="grid size-12 place-items-center rounded-full border border-ink/80 bg-paper font-display text-lg text-ink tabular-nums">
                    {i + 1}
                  </span>
                  <div className="pt-2.5">
                    <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                    <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Promises */}
        <section
          id="promises"
          aria-labelledby="promises-title"
          className="shell scroll-mt-6 py-20 md:py-28"
        >
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <h2
                id="promises-title"
                className="font-display text-4xl leading-tight font-medium tracking-[-0.015em] text-balance sm:text-[2.75rem]"
              >
                What we will never do
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
                Unclaimed money attracts scams. These rules hold for every case, at every price.
              </p>
            </div>
            <dl className="grid gap-x-10 border-t border-rule sm:grid-cols-2">
              {promises.map((p) => (
                <div key={p.title} className="border-b border-rule py-6">
                  <dt className="font-semibold text-ink">{p.title}</dt>
                  <dd className="mt-2 leading-relaxed text-ink-soft">{p.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          aria-labelledby="pricing-title"
          className="scroll-mt-6 border-t border-rule bg-paper-deep/50"
        >
          <div className="shell py-20 md:py-28">
            <div className="max-w-2xl">
              <h2
                id="pricing-title"
                className="font-display text-4xl leading-tight font-medium tracking-[-0.015em] text-balance sm:text-[2.75rem]"
              >
                Start free. Pay when there is something to claim.
              </h2>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-paper-edge bg-paper-edge md:grid-cols-3">
              {plans.map((plan) => (
                <article key={plan.name} className="flex flex-col bg-paper p-7 lg:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
                    {plan.available ? null : (
                      <span className="rounded-full border border-rule px-2.5 py-0.5 text-xs text-ink-soft">
                        Opening soon
                      </span>
                    )}
                  </div>
                  <p className="mt-5 font-display text-4xl font-medium text-ink">{plan.price}</p>
                  <p className="mt-1 h-5 text-sm text-ink-faint">{plan.unit}</p>
                  <p className="mt-4 leading-relaxed text-ink-soft">{plan.summary}</p>
                  <ul className="mt-6 space-y-2.5 border-t border-rule pt-6 text-[0.95rem] text-ink">
                    {plan.includes.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-2.5 h-px w-3 shrink-0 bg-ink-faint"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {plan.available ? (
                    <Link href="/check" className={buttonClass("primary", "mt-8 w-full")}>
                      Start the free check
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Questions */}
        <section
          id="questions"
          aria-labelledby="questions-title"
          className="shell scroll-mt-6 py-20 md:py-28"
        >
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <h2
              id="questions-title"
              className="font-display text-4xl leading-tight font-medium tracking-[-0.015em] text-balance sm:text-[2.75rem]"
            >
              Questions families ask
            </h2>
            <div className="border-t border-rule">
              {questions.map((item) => (
                <details key={item.q} className="group border-b border-rule">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="mt-1 shrink-0 font-display text-2xl leading-none text-ink-soft transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 leading-relaxed text-ink-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section aria-labelledby="closing-title" className="bg-royal-deep text-paper">
          <div className="shell py-20 md:py-24">
            <div className="max-w-2xl">
              <h2
                id="closing-title"
                className="font-display text-4xl leading-tight font-medium tracking-[-0.015em] text-paper sm:text-5xl"
              >
                Start with one name.
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-paper/75">
                A parent, a grandparent, an uncle who never talked about money. Two minutes tells
                you where to begin.
              </p>
              <Link href="/check" className={buttonClass("inverse", "mt-8 px-6 py-3.5 text-base")}>
                Start the free check
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
