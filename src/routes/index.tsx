import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useAllianceLookup, useRoster, useSchedule } from "@/lib/svs/data";
import { formatScore, requestsDay } from "@/lib/svs/scoring";
import { DAYS, SLOTS, type DayKey } from "@/lib/svs/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SvS Prep Scheduler — Overview" },
      {
        name: "description",
        content:
          "Dashboard summary of players, alliances, slot fill rate and waitlists across the SvS Prep Week.",
      },
      { property: "og:title", content: "SvS Prep Scheduler — Overview" },
      {
        property: "og:description",
        content: "Sign-ups, slot fill rate, waitlists and alliance participation at a glance.",
      },
    ],
  }),
  component: Overview,
});

const TOOLTIP_STYLE = {
  background: "var(--color-panel2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--color-fg)",
};
// Recharts colors each tooltip row/legend label after the series' own fill by default, which is
// unreadable for darker series colors — force the readable foreground color instead.
const TOOLTIP_ITEM_STYLE = { color: "var(--color-fg)" };
const TOOLTIP_LABEL_STYLE = { color: "var(--color-fg)", fontWeight: 600 };
const LEGEND_TEXT_STYLE = { color: "var(--color-fg)" };
const AXIS_TICK = { fill: "var(--color-mut)", fontSize: 11 };
// Plain hex, not var(--color-all-N) — those live in a Tailwind "@theme inline" block that
// doesn't reliably resolve from inline styles/SVG fills (see useAllianceLookup in data.ts).
const DAY_SCORE_COLORS: Record<DayKey, string> = {
  monday: "#60a5fa",
  tuesday: "#fbbf24",
  thursday: "#a78bfa",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
}) {
  return (
    <div className="flex-1 min-w-[140px] rounded-md ring-1 ring-line bg-panel px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mut">{label}</p>
      <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
      {hint ? <p className="font-mono text-[11px] text-mut mt-0.5">{hint}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  full,
}: {
  title: string;
  subtitle?: string;
  children: ReactElement;
  full?: boolean;
}) {
  return (
    <div className={"rounded-md ring-1 ring-line bg-panel px-4 py-3 " + (full ? "lg:col-span-2" : "")}>
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      {subtitle ? <p className="font-mono text-[10px] text-mut mt-0.5 mb-2">{subtitle}</p> : null}
      <div className="h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Overview() {
  const roster = useRoster();
  const schedule = useSchedule();
  const allianceLookup = useAllianceLookup();

  const players = roster.data?.players ?? [];
  const submissions = roster.data?.submissions ?? [];
  const appointments = schedule.data?.appointments ?? [];
  const waitlist = schedule.data?.waitlist ?? [];

  const fillByDay = useMemo(
    () =>
      DAYS.map((d) => {
        const filled = appointments.filter((a) => a.day === d.key).length;
        return {
          day: d.label,
          filled,
          open: SLOTS.length - filled,
          waitlisted: waitlist.filter((w) => w.day === d.key).length,
        };
      }),
    [appointments, waitlist],
  );

  const requestsByDay = useMemo(
    () =>
      DAYS.map((d) => ({
        day: d.label,
        requested: submissions.filter((s) => requestsDay(d.key, s)).length,
      })),
    [submissions],
  );

  const playersByAlliance = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of players) map.set(p.alliance || "—", (map.get(p.alliance || "—") ?? 0) + 1);
    return [...map.entries()]
      .map(([alliance, count]) => ({ alliance, count }))
      .sort((a, b) => b.count - a.count);
  }, [players]);

  const scoreByAlliance = useMemo(() => {
    const map = new Map<string, Record<DayKey, number>>();
    for (const a of appointments) {
      const key = a.alliance || "—";
      const cur = map.get(key) ?? { monday: 0, tuesday: 0, thursday: 0 };
      cur[a.day] += a.score;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([alliance, byDay]) => ({ alliance, ...byDay }))
      .sort((a, b) => b.monday + b.tuesday + b.thursday - (a.monday + a.tuesday + a.thursday));
  }, [appointments]);

  const totalSlots = SLOTS.length * DAYS.length;
  const totalFilled = appointments.length;
  const totalWaitlisted = waitlist.length;
  const hasData = players.length > 0;

  return (
    <AppShell>
      <div className="sticky top-0 z-20 bg-ink border-b border-line px-4 py-2.5 flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">Overview</h1>
        <span className="hidden sm:inline font-mono text-[11px] text-mut">
          ALL DAYS · ALL ALLIANCES
        </span>
      </div>

      <div className="px-4 py-4 space-y-5">
        <div className="flex flex-wrap gap-3">
          <StatCard
            label="Players"
            value={String(players.length)}
            hint={`${submissions.length} submitted`}
          />
          <StatCard
            label="Slots filled"
            value={`${totalFilled}/${totalSlots}`}
            hint={totalSlots ? `${Math.round((totalFilled / totalSlots) * 100)}% across 3 days` : undefined}
          />
          <StatCard label="Waitlisted" value={String(totalWaitlisted)} />
          <StatCard label="Alliances" value={String(playersByAlliance.length)} />
        </div>

        {!hasData ? (
          <p className="font-mono text-[11px] text-mut">
            No data yet —{" "}
            <Link to="/import" className="text-primary hover:underline">
              import sign-ups
            </Link>{" "}
            to populate the dashboard.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Slots filled vs open" subtitle="Per day · 48 slots each">
              <BarChart data={fillByDay}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={AXIS_TICK}
                  axisLine={{ stroke: "var(--color-line)" }}
                  tickLine={false}
                />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  cursor={{ fill: "var(--color-panel2)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => <span style={LEGEND_TEXT_STYLE}>{value}</span>}
                />
                <Bar dataKey="filled" stackId="s" fill="var(--color-primary)" name="Filled" />
                <Bar dataKey="open" stackId="s" fill="var(--color-line)" name="Open" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Waitlist size" subtitle="Per day">
              <BarChart data={fillByDay}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={AXIS_TICK}
                  axisLine={{ stroke: "var(--color-line)" }}
                  tickLine={false}
                />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  cursor={{ fill: "var(--color-panel2)" }}
                />
                <Bar dataKey="waitlisted" fill="var(--color-warn)" name="Waitlisted" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Players per alliance" subtitle={`${playersByAlliance.length} alliances`}>
              <PieChart>
                <Pie
                  data={playersByAlliance}
                  dataKey="count"
                  nameKey="alliance"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="var(--color-panel)"
                >
                  {playersByAlliance.map((entry) => (
                    <Cell key={entry.alliance} fill={allianceLookup(entry.alliance).color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => <span style={LEGEND_TEXT_STYLE}>{value}</span>}
                />
              </PieChart>
            </ChartCard>

            <ChartCard title="Requested days" subtitle="Submissions requesting each day">
              <BarChart data={requestsByDay}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={AXIS_TICK}
                  axisLine={{ stroke: "var(--color-line)" }}
                  tickLine={false}
                />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  cursor={{ fill: "var(--color-panel2)" }}
                />
                <Bar dataKey="requested" fill="var(--color-ok)" name="Requested" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard
              title="Priority score by alliance"
              subtitle="Scheduled appointments · stacked by day"
              full
            >
              <BarChart data={scoreByAlliance} layout="vertical">
                <CartesianGrid stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="alliance"
                  width={70}
                  tick={{ fill: "var(--color-fg)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  cursor={{ fill: "var(--color-panel2)" }}
                  formatter={(value: number) => formatScore(value)}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => <span style={LEGEND_TEXT_STYLE}>{value}</span>}
                />
                {DAYS.map((d, i) => (
                  <Bar
                    key={d.key}
                    dataKey={d.key}
                    stackId="s"
                    fill={DAY_SCORE_COLORS[d.key]}
                    name={d.label}
                    radius={i === DAYS.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ChartCard>
          </div>
        )}

        <p className="font-mono text-[11px] text-mut">
          Jump into the{" "}
          <Link to="/board" search={{ day: "monday" }} className="text-primary hover:underline">
            duty board
          </Link>{" "}
          to edit slots, or{" "}
          <Link to="/messages" className="text-primary hover:underline">
            generate output messages
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

