import { Link, useRouterState } from "@tanstack/react-router";
import { Github, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
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
    <Link to="/board" search={{ day }} className={railClass(active)}>
      <span>{label}</span>
      {active ? <span className="font-mono text-[10px] text-primary">LIVE</span> : null}
    </Link>
  );
}

function PageLink({
  to,
  active,
  children,
  onClick,
}: {
  to: "/" | "/import" | "/players" | "/scoring" | "/messages";
  active: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link to={to} className={railClass(active)} onClick={onClick}>
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <>
      <Link to="/" className="px-4 py-4 border-b border-line flex items-center gap-2.5">
        <div className="size-10 grid place-items-center bg-primary text-primary-foreground font-bold text-sm">
          3496
        </div>
        <div className="leading-none">
          <p className="font-semibold text-[16px] tracking-tight">SvS Preparation</p>
          <p className="text-[12px] font-mono text-mut mt-1.5">DUTY ROSTER</p>
        </div>
      </Link>
      <nav className="py-3 flex flex-col gap-0.5">
        <div className="px-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-mut">
          Home
        </div>
        <PageLink to="/" active={pathname === "/"}
          onClick={() => setMobileOpen(false)}
        >
          Overview
        </PageLink>
        <div className="px-4 pt-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-mut">
          Days
        </div>
        {DAYS.map((d) => (
          <DayLink
            key={d.key}
            day={d.key}
            label={d.label}
            active={pathname === "/board" && activeDay === d.key}
          />
        ))}
        <div className="px-4 pt-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-mut">
          Messages
        </div>
        <PageLink to="/messages" active={pathname === "/messages"}
          onClick={() => setMobileOpen(false)}
        >
          Summaries
        </PageLink>
        <div className="px-4 pt-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-mut">
          Console
        </div>
        <PageLink to="/import" active={pathname === "/import"}
          onClick={() => setMobileOpen(false)}
        >
          Import CSV
        </PageLink>
        <PageLink to="/players" active={pathname === "/players"}
          onClick={() => setMobileOpen(false)}
        >
          Players
        </PageLink>
        <PageLink to="/scoring" active={pathname === "/scoring"}
          onClick={() => setMobileOpen(false)}
        >
          Scoring
        </PageLink>
      </nav>
      <a
        href="https://github.com/GaboMendez/WOS-SvS-Manager"
        target="_blank"
        rel="noreferrer"
        className="mt-auto flex items-center gap-2 px-4 py-3 border-t border-line text-xs font-medium text-mut hover:text-fg transition-colors"
      >
        <Github className="size-3.5" />
        GitHub repository
      </a>
    </>
  );

  return (
    <div className="min-h-screen bg-ink text-fg">
      <div className="md:hidden sticky top-0 z-40 border-b border-line bg-panel px-3 py-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex size-9 items-center justify-center rounded-md border border-line text-fg"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
        <Link to="/" className="flex items-center gap-2.5 pr-2">
          <div className="size-8 grid place-items-center bg-primary text-primary-foreground font-bold text-[11px]">
            3496
          </div>
        </Link>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/55 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={
          "grid grid-cols-1 " +
          (aside ? "md:grid-cols-[220px_1fr_300px]" : "md:grid-cols-[220px_1fr]")
        }
      >
        <aside
          className={
            "fixed inset-y-0 left-0 z-40 w-[85vw] max-w-[260px] border-r border-line bg-panel transition-transform duration-200 md:static md:w-auto md:translate-x-0 md:shadow-none " +
            (mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
          }
        >
          <div className="flex h-full flex-col md:sticky md:top-0 md:h-screen md:overflow-y-auto">{nav}</div>
        </aside>

        <main className="min-w-0 bg-ink md:col-start-2">{children}</main>

        {aside ? (
          <aside className="border-l border-line bg-panel md:sticky md:top-0 md:h-screen md:overflow-y-auto">
            {aside}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
