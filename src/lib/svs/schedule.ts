import { preferredHours, requestsDay, scoreFor } from "./scoring";
import {
  SLOTS,
  type Appointment,
  type DayKey,
  type Player,
  type Submission,
  type WaitlistEntry,
  type Weights,
} from "./types";

export type DayResult = {
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
};

/**
 * Deterministic scheduler: same input + same weights = same output.
 * Sorted by score desc, then earliest submission timestamp, then player id.
 *
 * Seating uses augmenting-path bipartite matching (Kuhn's algorithm) instead of
 * greedy first-fit: a candidate can bump an already-seated, lower-priority
 * candidate into another of THAT candidate's preferred slots, so flexible
 * players never block rigid, higher-score players out of their only option.
 */
export function scheduleDay(
  day: DayKey,
  submissions: Submission[],
  players: Record<string, Player>,
  weights: Weights,
): DayResult {
  const candidates = submissions
    .filter((s) => requestsDay(day, s) && preferredHours(day, s).length > 0)
    .map((s) => ({ s, score: scoreFor(day, s, weights) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = Date.parse(a.s.submitted_at) || 0;
      const tb = Date.parse(b.s.submitted_at) || 0;
      if (ta !== tb) return ta - tb;
      return a.s.player_id.localeCompare(b.s.player_id);
    });

  const slotToCandidate = new Map<string, number>();

  const slotsFor = (idx: number): string[] =>
    preferredHours(day, candidates[idx]!.s).flatMap((hour) => {
      const hh = String(hour).padStart(2, "0");
      return [`${hh}:00`, `${hh}:30`];
    });

  // Augmenting-path search: seats idx directly if a preferred slot is free; otherwise
  // recursively displaces the occupant into one of their OWN other preferred slots.
  // Occupants are only ever bumped, never unseated, so priority order is preserved.
  function tryAssign(idx: number, visitedSlots: Set<string>): boolean {
    for (const slot of slotsFor(idx)) {
      if (visitedSlots.has(slot)) continue;
      visitedSlots.add(slot);
      const occupant = slotToCandidate.get(slot);
      if (occupant === undefined || tryAssign(occupant, visitedSlots)) {
        slotToCandidate.set(slot, idx);
        return true;
      }
    }
    return false;
  }

  const waitlist: WaitlistEntry[] = [];
  candidates.forEach((_, idx) => {
    const { s, score } = candidates[idx]!;
    const alliance = players[s.player_id]?.alliance ?? "";
    if (slotToCandidate.size >= SLOTS.length) {
      waitlist.push({ day, player_id: s.player_id, alliance, score, reason: "all 48 slots filled" });
      return;
    }
    if (!tryAssign(idx, new Set())) {
      waitlist.push({
        day,
        player_id: s.player_id,
        alliance,
        score,
        reason: "no capacity in preferred hours",
      });
    }
  });

  const appointments = SLOTS.map((slot) => {
    const idx = slotToCandidate.get(slot);
    if (idx === undefined) return undefined;
    const { s, score } = candidates[idx]!;
    return { day, slot, player_id: s.player_id, alliance: players[s.player_id]?.alliance ?? "", score };
  }).filter((a): a is Appointment => Boolean(a));

  waitlist.sort((a, b) => b.score - a.score);
  return { appointments, waitlist };
}
