import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DAYS, type DayKey } from "@/lib/svs/types";

function railClass(active: boolean) {
  return (
    "flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors " +
    (active
      ? "bg-panel2 text-fg border-l-2 border-primary"
      : "text-mut hover:text-fg border-l-2 border-transparent")
  );
}

function DayLink({ day, label, active }: { day: DayKey; label: string; active: boolean }) {
  return (
    <Link to="/" search={{ day }} className={railClass(active)}>
      <span>{label}</span>
      {active ? <span className="font-mono text-[10px] text-primary">LIVE</span> : null}
    </Link>
  );
}

function PageLink({
  to,
  active,
  children,
}: {
  to: "/import" | "/players" | "/scoring" | "/messages";
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={railClass(active)}>
      <span>{children}</span>
    </Link>
  );
}


export function AppShell({
  children,
  aside,
  activeDay,
}: {
  children: ReactNode;
  aside?: ReactNode;
  activeDay?: DayKey;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div
      className={
        "min-h-screen bg-ink text-fg grid grid-cols-1 " +
        (aside ? "md:grid-cols-[220px_1fr_300px]" : "md:grid-cols-[220px_1fr]")
      }
    >
      <aside className="border-r border-line bg-panel md:min-h-screen">
        <div className="px-4 py-4 border-b border-line flex items-center gap-2.5">
          <div className="size-10 grid place-items-center bg-primary text-primary-foreground font-bold text-sm">
            3496
          </div>
          <div className="leading-none">
            <p className="font-semibold text-[16px] tracking-tight">SvS Preparation</p>
            <p className="text-[12px] font-mono text-mut mt-1.5">DUTY ROSTER</p>
          </div>
        </div>
        <nav className="py-3 flex flex-col gap-0.5">
          <div className="px-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-mut">
            Days
          </div>
          {DAYS.map((d) => (
            <DayLink
              key={d.key}
              day={d.key}
              label={d.label}
              active={pathname === "/" && activeDay === d.key}
            />
          ))}
          <div className="px-4 pt-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-mut">
            Messages
          </div>
          <PageLink to="/messages" active={pathname === "/messages"}>
            Summaries
          </PageLink>
          <div className="px-4 pt-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-mut">
            Console
          </div>
          <PageLink to="/import" active={pathname === "/import"}>
            Import CSV
          </PageLink>
          <PageLink to="/players" active={pathname === "/players"}>
            Players
          </PageLink>
          <PageLink to="/scoring" active={pathname === "/scoring"}>
            Scoring
          </PageLink>

        </nav>
      </aside>

      <main className="min-w-0 bg-ink">{children}</main>

      {aside ? <aside className="border-l border-line bg-panel md:min-h-screen">{aside}</aside> : null}
    </div>
  );
}
