import Link from "next/link";
import { Check, CircleDot, Layers } from "lucide-react";

const bullets = [
  "Live boards that update the moment a teammate moves a card",
  "Assignees, priorities and due dates on every task",
  "Threaded comments keep decisions next to the work",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[32rem] rounded-full bg-accent/12 blur-[120px]" />
        <div className="absolute -bottom-52 left-1/3 size-[28rem] rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line-soft bg-surface/40 p-12 lg:flex">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 text-[15px] font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/30">
            <Layers className="size-4" />
          </span>
          TaskFlow
        </Link>

        <div className="max-w-md">
          <h1 className="text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-balance">
            Ship together,
            <span className="block bg-gradient-to-r from-accent-soft via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
              without the status meetings.
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            A shared board for every project, with assignable cards, threaded
            comments and live updates for everyone on the team.
          </p>

          <ul className="mt-8 space-y-3">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-muted">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent/12 text-accent-soft ring-1 ring-inset ring-accent/25">
                  <Check className="size-3" />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <BoardPreview />
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[25rem]">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-tight lg:hidden"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/30">
              <Layers className="size-4" />
            </span>
            TaskFlow
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

function BoardPreview() {
  return (
    <div className="relative mt-10 max-w-md">
      <div className="flex items-center gap-2 text-[11px] font-medium text-faint">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        3 teammates viewing this board
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5 rounded-2xl border border-line-soft bg-canvas/60 p-3 shadow-2xl shadow-black/40">
        {[
          { title: "To do", cards: ["Pricing page", "Redirect map"] },
          { title: "In progress", cards: ["Responsive nav", "A11y pass"] },
          { title: "Done", cards: ["Kickoff"] },
        ].map((column) => (
          <div key={column.title} className="space-y-2">
            <p className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
              <CircleDot className="size-2.5" />
              {column.title}
            </p>
            {column.cards.map((card) => (
              <div
                key={card}
                className="rounded-lg border border-line-soft bg-raised/90 p-2 text-[11px] leading-snug text-muted shadow-sm"
              >
                <div className="mb-2 h-1 w-8 rounded-full bg-accent/40" />
                {card}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
