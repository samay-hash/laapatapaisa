// The hero's register page: an illustrative case written the way an old
// passbook or office register would record it. All names are fictional.

type Status = "clue" | "searching" | "found";

type Entry = {
  year: string;
  particulars: string;
  status: Status;
  amount?: string;
};

const entries: readonly Entry[] = [
  { year: "1996", particulars: "Dividend warrant found in a steel trunk", status: "clue" },
  {
    year: "2003",
    particulars: "120 shares transferred to IEPF",
    status: "found",
    amount: "1,84,300",
  },
  {
    year: "2011",
    particulars: "LIC policy matured, never collected",
    status: "found",
    amount: "62,000",
  },
  { year: "1989", particulars: "FD under “R. C. Sharma”, Kanpur branch", status: "searching" },
];

const statusLabel: Record<Status, string> = {
  clue: "Clue",
  searching: "Searching",
  found: "Found",
};

const statusStyle: Record<Status, string> = {
  clue: "text-ink-soft border-rule",
  searching: "text-royal border-royal/40",
  found: "text-ledger border-ledger/40 bg-ledger-wash/60",
};

export function FamilyRecord() {
  return (
    <figure className="relative">
      <div className="relative overflow-hidden rounded-[3px] border border-paper-edge bg-[#fbf7ec] shadow-[0_1px_0_var(--color-paper-edge),0_24px_48px_-28px_rgb(28_34_48/0.35)]">
        {/* Binding margin, as on a register page */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-10 w-px bg-stamp/25 sm:left-14"
        />

        <header className="border-b-2 border-double border-rule px-5 pt-6 pb-4 pl-14 sm:pl-20">
          <p className="text-xs text-ink-faint">Family record, page 1</p>
          <p className="mt-1 font-display text-xl font-medium text-ink">
            Late Shri Ramesh Chandra Sharma
          </p>
          <p className="text-sm text-ink-soft">1938 to 2019, Kanpur and Lucknow</p>
        </header>

        <table className="w-full text-left text-sm">
          <caption className="sr-only">Example of what a family record looks like</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Particulars</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.particulars}
                className="border-b border-rule/80 align-top last:border-b-0"
              >
                <td className="w-10 px-0 py-3.5 text-center text-xs text-ink-faint tabular-nums sm:w-14">
                  {entry.year}
                </td>
                <td className="py-3.5 pr-3 pl-4 sm:pl-6">
                  <span className="block leading-snug text-ink">{entry.particulars}</span>
                  {entry.amount ? (
                    <span className="mt-1 block font-display text-[1.05rem] text-ledger tabular-nums">
                      ₹{entry.amount}
                    </span>
                  ) : null}
                </td>
                <td className="py-3.5 pr-4 text-right sm:pr-5">
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusStyle[entry.status]}`}
                  >
                    {statusLabel[entry.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="flex items-baseline justify-between border-t-2 border-double border-rule px-5 py-4 pl-14 sm:pl-20">
          <span className="text-sm text-ink-soft">Found so far</span>
          <span className="font-display text-2xl font-medium text-ink tabular-nums">₹2,46,300</span>
        </footer>
      </div>

      {/* The rubber stamp: the page's one moment of motion */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-5 right-3 grid animate-stamp place-items-center rounded-[6px] border-[3px] border-stamp px-4 py-1.5 text-stamp mix-blend-multiply sm:-top-7 sm:right-6"
      >
        <span className="font-deva text-[2rem] leading-[1.15]">मिला</span>
        <span className="-mt-0.5 text-[0.6rem] font-bold tracking-[0.2em]">FOUND</span>
      </div>

      <figcaption className="mt-3 text-xs text-ink-faint">
        An illustrative example. Names and amounts are made up.
      </figcaption>
    </figure>
  );
}
