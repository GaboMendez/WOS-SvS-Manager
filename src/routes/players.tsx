import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PlayerDetail } from "@/components/PlayerDetail";
import { allianceToken, useClearAll, useRoster, useWeights } from "@/lib/svs/data";
import { formatScore, preferredHours, scoreFor } from "@/lib/svs/scoring";


export const Route = createFileRoute("/players")({
  head: () => ({
    meta: [
      { title: "Players — SvS Prep Scheduler" },
      {
        name: "description",
        content: "Every imported player with their alliance, requested days and per-day priority scores.",
      },
      { property: "og:title", content: "Players — SvS Prep Scheduler" },
      {
        property: "og:description",
        content: "Browse alliance sign-ups and open a player to see their full submission.",
      },
    ],
  }),
  component: PlayersPage,
});

function PlayersPage() {
  const roster = useRoster();
  const weights = useWeights();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const clearAll = useClearAll();


  const subs = useMemo(
    () => new Map((roster.data?.submissions ?? []).map((s) => [s.player_id, s])),
    [roster.data],
  );
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (roster.data?.players ?? []).filter(
      (p) =>
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.player_id.toLowerCase().includes(term) ||
        p.alliance.toLowerCase().includes(term),
    );
  }, [roster.data, q]);

  return (
    <AppShell>
      <div className="sticky top-0 z-20 bg-ink border-b border-line px-4 py-2.5 flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">Players</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, ID or alliance"
          className="ml-auto w-56 bg-panel ring-1 ring-line rounded-md px-2.5 py-1.5 text-xs outline-none focus:ring-primary/60"
        />
        <button
          onClick={() => {
            if (
              !window.confirm(
                "Delete every player, sign-up and schedule? This cannot be undone.",
              )
            )
              return;
            clearAll.mutate(undefined, {
              onSuccess: () => toast.success("All data deleted"),
              onError: (e) => toast.error(e.message),
            });
          }}
          disabled={clearAll.isPending}
          className="text-xs font-medium px-2.5 py-1.5 rounded-md ring-1 ring-warn/60 text-warn hover:bg-warn/10 disabled:opacity-50"
        >
          {clearAll.isPending ? "Deleting…" : "Delete all"}
        </button>
      </div>


      <div className="px-4 py-3">
        <div className="overflow-x-auto rounded-md ring-1 ring-line bg-panel">
          <table className="w-full min-w-[620px] border-collapse font-mono text-[13px]">
            <thead className="text-[10px] uppercase tracking-wider text-mut">
              <tr className="border-b border-line">
                <th className="text-left font-medium px-3 py-2">Player</th>
                <th className="text-left font-medium px-3 py-2">ID</th>
                <th className="text-left font-medium px-3 py-2">Alliance</th>
                <th className="text-right font-medium px-3 py-2">Mon</th>
                <th className="text-right font-medium px-3 py-2">Tue</th>
                <th className="text-right font-medium px-3 py-2">Thu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const s = subs.get(p.player_id);
                const w = weights.data;
                return (
                  <tr
                    key={p.player_id}
                    onClick={() => setSelected(p.player_id)}
                    className="border-b border-line last:border-0 hover:bg-panel2 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 font-sans font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-mut">{p.player_id}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-[2px]"
                          style={{ backgroundColor: `var(--color-${allianceToken(p.alliance)})` }}
                        />
                        {p.alliance || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {s && w && s.requests_monday ? formatScore(scoreFor("monday", s, w)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {s && w && s.requests_tuesday ? formatScore(scoreFor("tuesday", s, w)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {s && w && s.requests_thursday ? formatScore(scoreFor("thursday", s, w)) : "—"}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-mut text-[11px]">
                    No players yet — import a sign-up CSV first.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <PlayerDetail
        playerId={selected}
        onClose={() => setSelected(null)}
        player={selected ? roster.data?.playersById[selected] : undefined}
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
