import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlayerDetail } from "@/components/PlayerDetail";
import { useHistoricalData, usePeriods } from "@/lib/svs/data";
import { formatScore } from "@/lib/svs/scoring";
import { DAYS, SLOTS, type DayKey, type Player, type Submission } from "@/lib/svs/types";

export const Route = createFileRoute("/periods/$periodId")({
  validateSearch: (search: Record<string, unknown>) => ({
    day: (String(search["day"] ?? "monday") || "monday") as DayKey,
  }),
  component: HistoricalView,
});

// Alliance colors for historical view
const ALLIANCE_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#a855f7",
  "#22c55e",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

function HistoricalView() {
  const { periodId } = Route.useParams();
  const { day } = Route.useSearch();

  const periods = usePeriods();
  const period = periods.data?.find((p) => p.id === periodId);
  const data = useHistoricalData(periodId);

  const [searchName, setSearchName] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"score" | "name" | "slot">("score");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const players = data.data?.players ?? [];
  const submissions = data.data?.submissions ?? [];
  const appointments = data.data?.appointments ?? [];
  const waitlist = data.data?.waitlist ?? [];

  // Create alliance lookup based on historical players
  const historicalAlliances = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) {
      if (p.alliance) set.add(p.alliance);
    }
    return [...set].sort();
  }, [players]);

  const allianceLookup = useMemo(() => {
    return (tag: string) => {
      const key = tag || "—";
      const pos = historicalAlliances.indexOf(key);
      const idx = pos === -1 ? 0 : pos % ALLIANCE_COLORS.length;
      return { color: ALLIANCE_COLORS[idx] ?? ALLIANCE_COLORS[0] };
    };
  }, [historicalAlliances]);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) map.set(p.player_id, p);
    return map;
  }, [players]);

  const submissionsByPlayerId = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const s of submissions) map.set(s.player_id, s as Submission);
    return map;
  }, [submissions]);

  // Get appointments for current day
  const dayAppointments = useMemo(
    () => appointments.filter((a) => a.day === day),
    [appointments, day],
  );

  // Get waitlist for current day
  const dayWaitlist = useMemo(() => waitlist.filter((w) => w.day === day), [waitlist, day]);

  // Filter and sort appointments
  const filteredAppointments = useMemo(() => {
    let result = [...dayAppointments];

    if (searchName) {
      const search = searchName.toLowerCase();
      result = result.filter((a) => {
        const player = playersById.get(a.player_id);
        const name = player?.name?.toLowerCase() || "";
        const id = a.player_id.toLowerCase();
        return name.includes(search) || id.includes(search);
      });
    }

    if (allianceFilter !== "all") {
      result = result.filter((a) => (a.alliance || "—") === allianceFilter);
    }

    if (sortBy === "score") {
      result.sort((a, b) => b.score - a.score);
    } else if (sortBy === "name") {
      result.sort((a, b) => {
        const nameA = playersById.get(a.player_id)?.name?.toLowerCase() || "";
        const nameB = playersById.get(b.player_id)?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === "slot") {
      result.sort((a, b) => {
        const slotA = SLOTS.indexOf(a.slot);
        const slotB = SLOTS.indexOf(b.slot);
        return slotA - slotB;
      });
    }

    return result;
  }, [dayAppointments, searchName, allianceFilter, sortBy, playersById]);

  // Filter and sort waitlist
  const filteredWaitlist = useMemo(() => {
    let result = [...dayWaitlist];

    if (searchName) {
      const search = searchName.toLowerCase();
      result = result.filter((w) => {
        const player = playersById.get(w.player_id);
        const name = player?.name?.toLowerCase() || "";
        const id = w.player_id.toLowerCase();
        return name.includes(search) || id.includes(search);
      });
    }

    if (allianceFilter !== "all") {
      result = result.filter((w) => (w.alliance || "—") === allianceFilter);
    }

    if (sortBy === "score") {
      result.sort((a, b) => b.score - a.score);
    } else if (sortBy === "name") {
      result.sort((a, b) => {
        const nameA = playersById.get(a.player_id)?.name?.toLowerCase() || "";
        const nameB = playersById.get(b.player_id)?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });
    }

    return result;
  }, [dayWaitlist, searchName, allianceFilter, sortBy, playersById]);

  const filled = dayAppointments.length;
  const totalSlots = SLOTS.length;
  const waitlistCount = dayWaitlist.length;

  // Selected player data
  const selectedPlayerData = selectedPlayer ? playersById.get(selectedPlayer) : undefined;
  const selectedSubmission = selectedPlayer ? submissionsByPlayerId.get(selectedPlayer) : undefined;

  if (!period) {
    return (
      <div className="p-4">
        <p className="text-mut">Period not found.</p>
        <Link to="/periods" className="text-primary hover:underline text-sm">
          Back to periods
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/periods" className="text-sm text-mut hover:text-fg">
            × Close
          </Link>
          <h1 className="text-base font-semibold tracking-tight">{period.name}</h1>
          <span className="font-mono text-[11px] text-warn">READ ONLY</span>
        </div>

        {/* Day Tabs */}
        <div className="border-b border-line flex gap-1">
          {DAYS.map((d) => (
            <Link
              key={d.key}
              to="/periods/$periodId"
              params={{ periodId }}
              search={{ day: d.key }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                day === d.key
                  ? "border-primary text-fg"
                  : "border-transparent text-mut hover:text-fg"
              }`}
            >
              {d.label}
            </Link>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search player name or ID..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="px-3 py-1.5 text-sm bg-panel ring-1 ring-line rounded-md outline-none focus:ring-primary/60 w-48"
          />

          <select
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-panel ring-1 ring-line rounded-md outline-none focus:ring-primary/60"
          >
            <option value="all">All alliances</option>
            {historicalAlliances.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "score" | "name" | "slot")}
            className="px-3 py-1.5 text-sm bg-panel ring-1 ring-line rounded-md outline-none focus:ring-primary/60"
          >
            <option value="score">Sort by score</option>
            <option value="name">Sort by name</option>
            <option value="slot">Sort by slot</option>
          </select>

          <div className="ml-auto flex items-center gap-4 font-mono text-[11px] text-mut">
            <span>
              {filled}/{totalSlots} filled
            </span>
            <span>{waitlistCount} waitlisted</span>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="rounded-md ring-1 ring-line bg-panel overflow-hidden">
          <div className="px-4 py-2 border-b border-line bg-panel2">
            <p className="text-sm font-semibold">Appointments</p>
          </div>
          {filteredAppointments.length === 0 ? (
            <p className="px-4 py-8 text-center text-mut text-sm">
              {dayAppointments.length === 0
                ? "No appointments for this day."
                : "No appointments match your filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse font-mono text-[13px]">
                <thead className="text-[10px] uppercase tracking-wider text-mut bg-panel2">
                  <tr className="border-b border-line">
                    <th className="text-left font-medium px-3 py-2">Slot</th>
                    <th className="text-left font-medium px-3 py-2">Player</th>
                    <th className="text-left font-medium px-3 py-2">ID</th>
                    <th className="text-left font-medium px-3 py-2">Alliance</th>
                    <th className="text-right font-medium px-3 py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((a) => {
                    const player = playersById.get(a.player_id);
                    return (
                      <tr
                        key={`${a.day}-${a.slot}-${a.player_id}`}
                        className="border-b border-line last:border-0 hover:bg-panel2"
                      >
                        <td className="px-3 py-2 tabular-nums">{a.slot}</td>
                        <td
                          className="px-3 py-2 font-sans font-medium text-primary cursor-pointer hover:underline"
                          onClick={() => setSelectedPlayer(a.player_id)}
                        >
                          {player?.name || a.player_id}
                        </td>
                        <td className="px-3 py-2 text-mut">{a.player_id}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-[2px]"
                              style={{ backgroundColor: allianceLookup(a.alliance || "—").color }}
                            />
                            {a.alliance || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatScore(a.score)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Waitlist Table */}
        {filteredWaitlist.length > 0 && (
          <div className="rounded-md ring-1 ring-line bg-panel overflow-hidden">
            <div className="px-4 py-2 border-b border-line bg-panel2">
              <p className="text-sm font-semibold">Waitlist</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse font-mono text-[13px]">
                <thead className="text-[10px] uppercase tracking-wider text-mut bg-panel2">
                  <tr className="border-b border-line">
                    <th className="text-left font-medium px-3 py-2">#</th>
                    <th className="text-left font-medium px-3 py-2">Player</th>
                    <th className="text-left font-medium px-3 py-2">ID</th>
                    <th className="text-left font-medium px-3 py-2">Alliance</th>
                    <th className="text-right font-medium px-3 py-2">Score</th>
                    <th className="text-left font-medium px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWaitlist.map((w, i) => {
                    const player = playersById.get(w.player_id);
                    return (
                      <tr
                        key={`${w.day}-${w.player_id}`}
                        className="border-b border-line last:border-0 hover:bg-panel2"
                      >
                        <td className="px-3 py-2 tabular-nums text-mut">{i + 1}</td>
                        <td
                          className="px-3 py-2 font-sans font-medium text-primary cursor-pointer hover:underline"
                          onClick={() => setSelectedPlayer(w.player_id)}
                        >
                          {player?.name || w.player_id}
                        </td>
                        <td className="px-3 py-2 text-mut">{w.player_id}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-[2px]"
                              style={{ backgroundColor: allianceLookup(w.alliance || "—").color }}
                            />
                            {w.alliance || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatScore(w.score)}
                        </td>
                        <td className="px-3 py-2 text-mut">{w.reason || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      <PlayerDetail
        playerId={selectedPlayer}
        player={selectedPlayerData}
        submission={selectedSubmission}
        onClose={() => setSelectedPlayer(null)}
      />
    </>
  );
}
