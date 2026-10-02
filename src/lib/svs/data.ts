import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dbOperations } from "@/integrations/sqlite/client";
import { scheduleDay } from "./schedule";
import {
  DAYS,
  DEFAULT_WEIGHTS,
  type Appointment,
  type DayKey,
  type Player,
  type Submission,
  type WaitlistEntry,
  type Weights,
} from "./types";

// 8 hand-picked colors from clearly different named hue families (red/blue/yellow/purple/
// green/pink/cyan/orange), not a computed hue rotation. Evenly-spaced or stride-reordered hue
// wheels (tried earlier) still leave some pairs of slots only ~60° apart, which reads as "two
// shades of green" rather than genuinely different colors — picking one representative per
// well-known color family and interleaving warm/cool keeps every pair visually distinct instead
// of just the immediate neighbors. Plain hex, not var(--color-all-N): those live inside a
// Tailwind v4 "@theme inline" block, which doesn't reliably emit them as real runtime custom
// properties usable from arbitrary inline style attributes.
const ALLIANCE_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#a855f7",
  "#22c55e",
  "#ec4899",
  "#06b6d4",
  "#f97316",
] as const;

/**
 * Stable alliance -> color lookup. The order is derived from every alliance tag currently in
 * use — roster players AND schedule appointments/waitlist — not just the roster, because
 * appointments/waitlist snapshot an alliance value at scheduling time that can lag behind the
 * roster (e.g. after a re-import). Looking up a tag missing from the order previously fell back
 * to a single shared color, making most alliances look uncolored; covering every source instead
 * of just the roster means each cannot fail to be found.
 */
export function useAllianceLookup(): (tag: string) => { color: string } {
  const roster = useRoster();
  const schedule = useSchedule();
  const order = useMemo(() => {
    const set = new Set<string>();
    for (const p of roster.data?.players ?? []) set.add(p.alliance || "—");
    for (const a of schedule.data?.appointments ?? []) set.add(a.alliance || "—");
    for (const w of schedule.data?.waitlist ?? []) set.add(w.alliance || "—");
    return [...set].sort();
  }, [roster.data, schedule.data]);

  return useMemo(() => {
    return (tag: string) => {
      const key = tag || "—";
      const pos = order.indexOf(key);
      const idx = pos === -1 ? 0 : pos % ALLIANCE_COLORS.length;
      return { color: ALLIANCE_COLORS[idx] ?? ALLIANCE_COLORS[0] };
    };
  }, [order]);
}

export function useRoster() {
  return useQuery({
    queryKey: ["roster"],
    queryFn: async () => {
      const players = dbOperations.getPlayers();
      const submissions = dbOperations.getSubmissions();

      const byId: Record<string, Player> = {};
      for (const p of (players ?? []) as Player[]) byId[p.player_id] = p;

      return {
        players: (players ?? []) as Player[],
        playersById: byId,
        submissions: (submissions ?? []) as unknown as Submission[],
      };
    },
  });
}

export function useSchedule() {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      const appts = dbOperations.getAppointments();
      const wl = dbOperations.getWaitlist();

      return {
        appointments: (appts ?? []) as unknown as Appointment[],
        waitlist: (wl ?? []) as unknown as WaitlistEntry[],
      };
    },
  });
}

export function useWeights() {
  return useQuery({
    queryKey: ["weights"],
    queryFn: async () => {
      const settings = dbOperations.getSettings();
      const weights = settings?.weights ?? {};
      return { ...DEFAULT_WEIGHTS, ...(weights as Partial<Weights>) } as Weights;
    },
  });
}

export function useSaveWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weights: Weights) => {
      dbOperations.upsertSettings({
        id: 1,
        weights,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weights"] }),
  });
}

export function useRecompute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const players = dbOperations.getPlayers();
      const subs = dbOperations.getSubmissions();
      const settings = dbOperations.getSettings();

      const weights = {
        ...DEFAULT_WEIGHTS,
        ...((settings?.weights ?? {}) as Partial<Weights>),
      } as Weights;
      const byId: Record<string, Player> = {};
      for (const p of (players ?? []) as Player[]) byId[p.player_id] = p;

      const appointments: Appointment[] = [];
      const waitlist: WaitlistEntry[] = [];
      for (const d of DAYS) {
        const res = scheduleDay(
          d.key,
          (subs ?? []) as unknown as Submission[],
          byId,
          weights,
        );
        appointments.push(...res.appointments);
        waitlist.push(...res.waitlist);
      }

      dbOperations.deleteAllAppointments();
      dbOperations.deleteAllWaitlist();

      for (const appt of appointments) {
        dbOperations.insertAppointment({
          id: appt.id,
          day: appt.day,
          slot: appt.slot,
          player_id: appt.player_id,
          alliance: appt.alliance,
          score: appt.score,
        });
      }
      for (const w of waitlist) {
        dbOperations.insertWaitlist({
          id: w.id,
          day: w.day,
          player_id: w.player_id,
          alliance: w.alliance,
          score: w.score,
          reason: w.reason,
        });
      }

      return { scheduled: appointments.length, waitlisted: waitlist.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });
}

async function wipeAll() {
  dbOperations.deleteAllAppointments();
  dbOperations.deleteAllWaitlist();
  dbOperations.deleteAllSubmissions();
  dbOperations.deleteAllPlayers();
  dbOperations.deleteAllImports();
}

export function useClearAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wipeAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roster"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["latestImport"] });
    },
  });
}

/** Most recent CSV import, so "view collected responses" can offer it back for download. */
export function useLatestImport() {
  return useQuery({
    queryKey: ["latestImport"],
    queryFn: async () => {
      const data = dbOperations.getLatestImport();
      return data as {
        filename: string;
        raw_csv: string;
        row_count: number;
        created_at: string;
      } | null;
    },
  });
}

/** Manually place a player into a slot (swap, promote from waitlist, or clear). */
export function useSetSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { day: DayKey; slot: string; playerId: string | null }) => {
      const { day, slot, playerId } = args;
      const apptRows = dbOperations.getAppointmentsByDay(day);
      const wlRows = dbOperations.getWaitlistByDay(day);

      const appts = (apptRows ?? []) as unknown as (Appointment & { id: string })[];
      const wl = (wlRows ?? []) as unknown as (WaitlistEntry & { id: string })[];
      const occupant = appts.find((a) => a.slot === slot);

      if (!playerId) {
        if (!occupant) return;
        dbOperations.deleteAppointment(occupant.id);
        dbOperations.insertWaitlist({
          id: crypto.randomUUID(),
          day,
          player_id: occupant.player_id,
          alliance: occupant.alliance,
          score: occupant.score,
          reason: "removed manually",
        });
        return;
      }

      const source = appts.find((a) => a.player_id === playerId);
      if (source) {
        if (source.slot === slot) return;
        if (occupant) {
          // (day, slot) is unique, so park the occupant on a scratch slot first to avoid
          // colliding with the source's target slot while both updates are in flight.
          const tempSlot = `__swap_${occupant.id}`;
          dbOperations.updateAppointment(occupant.id, { slot: tempSlot });
          dbOperations.updateAppointment(source.id, { slot });
          dbOperations.updateAppointment(occupant.id, { slot: source.slot });
        } else {
          dbOperations.updateAppointment(source.id, { slot });
        }
        return;
      }

      const entry = wl.find((w) => w.player_id === playerId);
      if (!entry) return;
      dbOperations.deleteWaitlist(entry.id);
      if (occupant) {
        dbOperations.updateAppointment(occupant.id, {
          player_id: entry.player_id,
          alliance: entry.alliance,
          score: entry.score
        });
        dbOperations.insertWaitlist({
          id: crypto.randomUUID(),
          day,
          player_id: occupant.player_id,
          alliance: occupant.alliance,
          score: occupant.score,
          reason: "replaced manually",
        });
      } else {
        dbOperations.insertAppointment({
          id: crypto.randomUUID(),
          day,
          slot,
          player_id: entry.player_id,
          alliance: entry.alliance,
          score: entry.score,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });
}

export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      filename: string;
      raw: string;
      players: Player[];
      submissions: Submission[];
    }) => {
      await wipeAll();

      const importId = crypto.randomUUID();
      dbOperations.insertImport({
        id: importId,
        filename: args.filename,
        raw_csv: args.raw,
        row_count: args.submissions.length,
        created_at: new Date().toISOString(),
      });

      for (const p of args.players) {
        dbOperations.upsertPlayer({
          player_id: p.player_id,
          name: p.name,
          alliance: p.alliance,
          updated_at: new Date().toISOString(),
        });
      }

      for (const s of args.submissions) {
        dbOperations.upsertSubmission({
          player_id: s.player_id,
          import_id: importId,
          comment: s.comment,
          requests_monday: s.requests_monday,
          requests_tuesday: s.requests_tuesday,
          requests_thursday: s.requests_thursday,
          mon_hours: (s as unknown as { mon_hours: number[] }).mon_hours,
          mon_normal_fc: s.mon_normal_fc,
          mon_refined_fc: s.mon_refined_fc,
          mon_speedup_days: s.mon_speedup_days,
          tue_hours: (s as unknown as { tue_hours: number[] }).tue_hours,
          tue_shards: s.tue_shards,
          tue_speedup_days: s.tue_speedup_days,
          thu_hours: (s as unknown as { thu_hours: number[] }).thu_hours,
          thu_speedup_days: s.thu_speedup_days,
          submitted_at: s.submitted_at,
        });
      }

      return importId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roster"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["latestImport"] });
    },
  });
}


export function dayLabel(day: DayKey) {
  return DAYS.find((d) => d.key === day)!;
}
