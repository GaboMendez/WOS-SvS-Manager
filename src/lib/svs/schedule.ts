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

  const taken = new Map<string, Appointment>();
  const waitlist: WaitlistEntry[] = [];

  for (const { s, score } of candidates) {
    const alliance = players[s.player_id]?.alliance ?? "";
    if (taken.size >= SLOTS.length) {
      waitlist.push({
        day,
        player_id: s.player_id,
        alliance,
        score,
        reason: "all 48 slots filled",
      });
      continue;
    }
    let placed = false;
    for (const hour of preferredHours(day, s)) {
      const hh = String(hour).padStart(2, "0");
      for (const slot of [`${hh}:00`, `${hh}:30`]) {
        if (!taken.has(slot)) {
          taken.set(slot, { day, slot, player_id: s.player_id, alliance, score });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) {
      waitlist.push({
        day,
        player_id: s.player_id,
        alliance,
        score,
        reason: "no capacity in preferred hours",
      });
    }
  }

  const appointments = SLOTS.map((slot) => taken.get(slot)).filter(
    (a): a is Appointment => Boolean(a),
  );
  waitlist.sort((a, b) => b.score - a.score);
  return { appointments, waitlist };
}
