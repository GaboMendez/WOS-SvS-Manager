import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PlayerDetail } from "@/components/PlayerDetail";
import {
  useAllianceLookup,
  useRecompute,
  useRoster,
  useSchedule,
  useSetSlot,
  useWeights,
} from "@/lib/svs/data";
import { downloadCsv, toCsv } from "@/lib/svs/csv";
import { formatScore, preferredHours, scoreFor } from "@/lib/svs/scoring";
import { DAYS, SLOTS, type DayKey } from "@/lib/svs/types";


export const Route = createFileRoute("/board")({
  validateSearch: (search: Record<string, unknown>): { day: DayKey } => {
    const day = String(search["day"] ?? "monday");
    return { day: (["monday", "tuesday", "thursday"].includes(day) ? day : "monday") as DayKey };
  },
  head: () => ({
    meta: [
      { title: "SvS Prep Scheduler — Duty Board" },
      {
        name: "description",
        content:
          "Automated State vs State Prep Week scheduling: 48 half-hour UTC slots per day, priority scoring and alliance waitlists.",
      },
      { property: "og:title", content: "SvS Prep Scheduler — Duty Board" },
      {
        property: "og:description",
        content: "Monday, Tuesday and Thursday prep appointments assigned by priority score.",
      },
    ],
  }),
  component: Dashboard,
});

function Dot({ tag }: { tag: string }) {
  const allianceLookup = useAllianceLookup();
  return (
    <span
      className="size-2 rounded-[2px] inline-block"
      style={{ backgroundColor: allianceLookup(tag).color }}
    />
  );
}

function Dashboard() {
  const { day } = Route.useSearch();
  const meta = DAYS.find((d) => d.key === day)!;
  const roster = useRoster();
  const schedule = useSchedule();
  const weights = useWeights();
  const recompute = useRecompute();
  const setSlot = useSetSlot();
  const [selected, setSelected] = useState<string | null>(null);
  const [allianceFilter, setAllianceFilter] = useState("all");
  const [editingSlot, setEditingSlot] = useState<string | null>(null);


  const appts = useMemo(
    () => (schedule.data?.appointments ?? []).filter((a) => a.day === day),
    [schedule.data, day],
  );
  const waitlist = useMemo(
    () =>
      (schedule.data?.waitlist ?? [])
        .filter((w) => w.day === day)
        .sort((a, b) => b.score - a.score),
    [schedule.data, day],
  );
  const bySlot = useMemo(() => new Map(appts.map((a) => [a.slot, a])), [appts]);
  const players = roster.data?.playersById ?? {};
  const subs = useMemo(
    () => new Map((roster.data?.submissions ?? []).map((s) => [s.player_id, s])),
    [roster.data],
  );

  const allianceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of appts) set.add(a.alliance || "—");
    for (const w of waitlist) set.add(w.alliance || "—");
    return [...set].sort();
  }, [appts, waitlist]);

  const visibleSlots = useMemo(
    () =>
      allianceFilter === "all"
        ? SLOTS
        : SLOTS.filter((s) => (bySlot.get(s)?.alliance || "—") === allianceFilter && bySlot.get(s)),
    [allianceFilter, bySlot],
  );

  /** Players that can be moved into a slot: everyone on this day's waitlist plus those already scheduled. */
  const movable = useMemo(() => {
    const scheduled = appts.map((a) => ({
      player_id: a.player_id,
      label: `${players[a.player_id]?.name ?? a.player_id} · now ${a.slot}`,
    }));
    const waiting = waitlist.map((w) => ({
      player_id: w.player_id,
      label: `${players[w.player_id]?.name ?? w.player_id} · waitlist`,
    }));
    return [...waiting, ...scheduled];
  }, [appts, waitlist, players]);

  function assign(slot: string, playerId: string | null) {
    setEditingSlot(null);
    setSlot.mutate(
      { day, slot, playerId },
      {
        onSuccess: () => toast.success(playerId ? "Slot updated" : "Slot cleared"),
        onError: (e) => toast.error(e.message),
      },
    );
  }



  const alliances = useMemo(() => {
    const map = new Map<string, { count: number; resource: number; score: number }>();
    for (const a of appts) {
      const s = subs.get(a.player_id);
      const resource =
        day === "monday"
          ? (s?.mon_normal_fc ?? 0) + (s?.mon_refined_fc ?? 0)
          : day === "tuesday"
            ? (s?.tue_shards ?? 0) + (s?.tue_speedup_days ?? 0) * (weights.data?.daysToMinutes ?? 1440)
            : (s?.thu_speedup_days ?? 0);
      const cur = map.get(a.alliance || "—") ?? { count: 0, resource: 0, score: 0 };
      map.set(a.alliance || "—", {
        count: cur.count + 1,
        resource: cur.resource + resource,
        score: cur.score + a.score,
      });
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [appts, subs, day, weights.data]);

  const resourceLabel =
    day === "monday" ? "fire crystals" : day === "tuesday" ? "shards + minutes" : "speedup days";

  function exportDay() {
    const rows: (string | number)[][] = [
      ["Slot (UTC)", "Player", "Player ID", "Alliance", "Score"],
      ...SLOTS.map((slot) => {
        const a = bySlot.get(slot);
        return [
          slot,
          a ? (players[a.player_id]?.name ?? a.player_id) : "",
          a?.player_id ?? "",
          a?.alliance ?? "",
          a ? Math.round(a.score) : "",
        ];
      }),
      [],
      ["Alliance", "Slots", `Total ${resourceLabel}`],
      ...alliances.map(([tag, v]) => [tag, v.count, Math.round(v.resource)]),
      [],
      ["Waitlist player", "Player ID", "Alliance", "Score", "Reason"],
      ...waitlist.map((w) => [
        players[w.player_id]?.name ?? w.player_id,
        w.player_id,
        w.alliance,
        Math.round(w.score),
        w.reason,
      ]),
    ];
    downloadCsv(`svs-${day}-schedule.csv`, toCsv(rows));
  }

  const filled = appts.length;

  return (
    <AppShell
      activeDay={day}
      aside={
        <>
          <div className="px-4 py-3 border-b border-line">
            <p className="text-sm font-semibold tracking-tight">Waitlist</p>
            <p className="text-[10px] font-mono text-mut mt-0.5">SORTED BY SCORE</p>
          </div>
          <div className="divide-y divide-line">
            {waitlist.length === 0 ? (
              <p className="px-4 py-3 font-mono text-[11px] text-mut">No one waiting.</p>
            ) : (
              waitlist.map((w, i) => (
                <button
                  key={w.player_id}
                  onClick={() => setSelected(w.player_id)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-panel2 transition-colors"
                >
                  <span className="font-mono text-[11px] text-mut w-5">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {players[w.player_id]?.name ?? w.player_id}
                    </p>
                    <p className="text-[10px] font-mono text-mut flex items-center gap-1.5">
                      <Dot tag={w.alliance} />
                      {w.alliance || "—"} · {w.reason}
                    </p>
                  </div>
                  <span className="font-mono text-[13px] tabular-nums text-fg">
                    {formatScore(w.score)}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      }
    >
      <div className="sticky top-0 z-20 bg-ink border-b border-line px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold tracking-tight">
            {meta.label} · {meta.focus}
          </h1>
          <span className="hidden sm:inline font-mono text-[11px] text-mut">UTC · 48 slots</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            className="text-xs bg-panel ring-1 ring-line rounded-md px-2 py-1.5 outline-none focus:ring-primary/60"
          >
            <option value="all">All alliances</option>
            {allianceOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <button
            onClick={exportDay}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md ring-1 ring-line text-mut hover:text-fg"
          >
            Export CSV
          </button>
          <button
            title="Rebuilds all three days from scratch using the current sign-ups and scoring weights. Any manual slot changes are lost."
            onClick={() => {
              if (
                !window.confirm(
                  "Rebuild the schedule from the sign-ups and scoring weights? Any manual slot changes will be lost.",
                )
              )
                return;
              recompute.mutate(undefined, {
                onSuccess: (r) =>
                  toast.success(`${r.scheduled} appointments assigned, ${r.waitlisted} waitlisted`),
                onError: (e) => toast.error(e.message),
              });
            }}
            disabled={recompute.isPending}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md ring-1 ring-line text-mut hover:text-fg flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            {recompute.isPending ? "Rebuilding…" : "Auto-rebuild schedule"}
          </button>
        </div>
      </div>


      <div className="px-4 py-3 border-b border-line flex flex-wrap gap-x-6 gap-y-3">
        {alliances.length === 0 ? (
          <span className="font-mono text-[11px] text-mut">
            No appointments yet — import sign-ups, then recompute.
          </span>
        ) : (
          alliances.map(([tag, v]) => (
            <div key={tag} className="flex items-center gap-2.5">
              <Dot tag={tag} />
              <span className="text-sm font-medium">{tag}</span>
              <span className="font-mono text-[11px] text-mut">{v.count} slots</span>
              <span className="font-mono text-[11px] text-fg">
                {formatScore(v.resource)} {resourceLabel}
              </span>
            </div>
          ))
        )}
        <div className="ml-auto flex items-center gap-2.5 font-mono text-[11px] text-mut">
          <span>{filled}/48 filled</span>
          <span className="text-ok">{Math.round((filled / 48) * 100)}%</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="overflow-x-auto rounded-md ring-1 ring-line bg-panel">
          <table className="w-full min-w-[560px] border-collapse font-mono text-[13px]">
            <thead className="text-[10px] uppercase tracking-wider text-mut">
              <tr className="border-b border-line">
                <th className="text-left font-medium px-3 py-2 bg-panel2 sticky left-0 min-w-[88px]">
                  Time
                </th>
                <th className="text-left font-medium px-3 py-2">Player</th>
                <th className="text-left font-medium px-3 py-2">ID</th>
                <th className="text-left font-medium px-3 py-2">Alliance</th>
                <th className="text-right font-medium px-3 py-2">Score</th>
                <th className="text-right font-medium px-3 py-2 min-w-[150px]">Edit</th>
              </tr>
            </thead>
            <tbody>
              {visibleSlots.map((slot) => {
                const a = bySlot.get(slot);
                const editing = editingSlot === slot;
                return (
                  <tr
                    key={slot}
                    className={
                      "border-b border-line last:border-0 transition-colors " +
                      (a ? "hover:bg-panel2" : "")
                    }
                  >
                    <td className="px-3 py-2 bg-panel2 sticky left-0 text-fg tabular-nums">
                      {slot}
                    </td>
                    {a ? (
                      <>
                        <td
                          onClick={() => setSelected(a.player_id)}
                          className="px-3 py-2 font-sans font-medium cursor-pointer"
                        >
                          {players[a.player_id]?.name ?? a.player_id}
                        </td>
                        <td className="px-3 py-2 text-mut">{a.player_id}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <Dot tag={a.alliance} />
                            <span className="text-fg">{a.alliance || "—"}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg">
                          {formatScore(a.score)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-sans text-mut italic">— open —</td>
                        <td className="px-3 py-2 text-mut" />
                        <td className="px-3 py-2 text-mut">—</td>
                        <td className="px-3 py-2 text-right tabular-nums text-mut">—</td>
                      </>
                    )}
                    <td className="px-3 py-1.5 text-right">
                      {editing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            autoFocus
                            defaultValue=""
                            onChange={(e) => e.target.value && assign(slot, e.target.value)}
                            className="text-[11px] bg-panel2 ring-1 ring-line rounded px-1.5 py-1 outline-none focus:ring-primary/60 max-w-[150px]"
                          >
                            <option value="">Choose player…</option>
                            {movable
                              .filter((m) => m.player_id !== a?.player_id)
                              .map((m) => (
                                <option key={m.player_id} value={m.player_id}>
                                  {m.label}
                                </option>
                              ))}
                          </select>
                          {a ? (
                            <button
                              onClick={() => assign(slot, null)}
                              className="text-[11px] text-warn hover:underline"
                            >
                              clear
                            </button>
                          ) : null}
                          <button
                            onClick={() => setEditingSlot(null)}
                            className="text-[11px] text-mut hover:text-fg"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingSlot(slot)}
                          className="text-[11px] text-mut hover:text-primary"
                        >
                          edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-mut text-[11px]">
                    No slots match this alliance filter.
                  </td>
                </tr>
              ) : null}

            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[11px] text-mut">
          All times UTC ·{" "}
          <Link to="/import" className="text-primary hover:underline">
            import sign-ups
          </Link>{" "}
          or{" "}
          <Link to="/scoring" className="text-primary hover:underline">
            adjust scoring
          </Link>
          .
        </p>
      </div>

      <PlayerDetail
        playerId={selected}
        onClose={() => setSelected(null)}
        player={selected ? players[selected] : undefined}
        submission={selected ? subs.get(selected) : undefined}
        scores={
          selected && subs.get(selected) && weights.data
            ? {
                monday: scoreFor("monday", subs.get(selected)!, weights.data),
                tuesday: scoreFor("tuesday", subs.get(selected)!, weights.data),
                thursday: scoreFor("thursday", subs.get(selected)!, weights.data),
              }
            : undefined
        }
        hours={
          selected && subs.get(selected)
            ? {
                monday: preferredHours("monday", subs.get(selected)!),
                tuesday: preferredHours("tuesday", subs.get(selected)!),
                thursday: preferredHours("thursday", subs.get(selected)!),
              }
            : undefined
        }
      />
    </AppShell>
  );
}
