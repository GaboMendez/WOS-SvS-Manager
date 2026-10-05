import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Period } from "@/integrations/api/client";
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

// ============ PERIODS ============

export function usePeriods() {
  return useQuery({
    queryKey: ["periods"],
    queryFn: async () => {
      const data = await api.getPeriods();
      return data as Period[];
    },
  });
}

export function useCurrentPeriod() {
  return useQuery({
    queryKey: ["currentPeriod"],
    queryFn: async () => {
      const data = await api.getCurrentPeriod();
      return data as Period | null;
    },
    staleTime: 0,
  });
}

export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (period: { name: string; month: number; year: number }) => {
      const result = await api.createPeriod(period);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods"] });
      qc.invalidateQueries({ queryKey: ["currentPeriod"] });
    },
  });
}

export function useClosePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      await api.closePeriod(periodId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods"] });
      qc.invalidateQueries({ queryKey: ["currentPeriod"] });
    },
  });
}

// ============ ROSTER & SCHEDULE ============

export function useRoster() {
  const currentPeriod = useCurrentPeriod();
  const periodId = currentPeriod.data?.id;

  return useQuery({
    queryKey: ["roster", periodId],
    queryFn: async () => {
      if (!periodId) return { players: [], playersById: {}, submissions: [] };

      const players = await api.getPlayers(periodId);
      const submissions = await api.getSubmissions(periodId);

      // Parse hours arrays from JSON strings and convert 0/1 to booleans
      const parsedSubmissions = (submissions ?? []).map((s: Record<string, unknown>) => ({
        ...s,
        requests_monday: Boolean(s.requests_monday),
        requests_tuesday: Boolean(s.requests_tuesday),
        requests_thursday: Boolean(s.requests_thursday),
        mon_hours: typeof s.mon_hours === 'string' ? JSON.parse(s.mon_hours as string) : s.mon_hours,
        tue_hours: typeof s.tue_hours === 'string' ? JSON.parse(s.tue_hours as string) : s.tue_hours,
        thu_hours: typeof s.thu_hours === 'string' ? JSON.parse(s.thu_hours as string) : s.thu_hours,
      }));

      const byId: Record<string, Player> = {};
      for (const p of (players ?? []) as Player[]) byId[p.player_id] = p;

      return {
        players: (players ?? []) as Player[],
        playersById: byId,
        submissions: parsedSubmissions as unknown as Submission[],
      };
    },
    enabled: !!periodId,
  });
}

export function useSchedule() {
  const currentPeriod = useCurrentPeriod();
  const periodId = currentPeriod.data?.id;

  return useQuery({
    queryKey: ["schedule", periodId],
    queryFn: async () => {
      if (!periodId) return { appointments: [], waitlist: [] };

      const appts = await api.getAppointments(periodId);
      const wl = await api.getWaitlist(periodId);

      return {
        appointments: (appts ?? []) as unknown as Appointment[],
        waitlist: (wl ?? []) as unknown as WaitlistEntry[],
      };
    },
    enabled: !!periodId,
  });
}

// ============ HISTORICAL DATA (READ-ONLY) ============

export function useHistoricalData(periodId: string) {
  return useQuery({
    queryKey: ["historical", periodId],
    queryFn: async () => {
      const players = await api.getPlayers(periodId);
      const submissions = await api.getSubmissions(periodId);
      const appointments = await api.getAppointments(periodId);
      const waitlist = await api.getWaitlist(periodId);

      const parsedSubmissions = (submissions ?? []).map((s: Record<string, unknown>) => ({
        ...s,
        requests_monday: Boolean(s.requests_monday),
        requests_tuesday: Boolean(s.requests_tuesday),
        requests_thursday: Boolean(s.requests_thursday),
        mon_hours: typeof s.mon_hours === 'string' ? JSON.parse(s.mon_hours as string) : s.mon_hours,
        tue_hours: typeof s.tue_hours === 'string' ? JSON.parse(s.tue_hours as string) : s.tue_hours,
        thu_hours: typeof s.thu_hours === 'string' ? JSON.parse(s.thu_hours as string) : s.thu_hours,
      }));

      const byId: Record<string, Player> = {};
      for (const p of (players ?? []) as Player[]) byId[p.player_id] = p;

      return {
        players: (players ?? []) as Player[],
        playersById: byId,
        submissions: parsedSubmissions as unknown as Submission[],
        appointments: (appointments ?? []) as unknown as Appointment[],
        waitlist: (waitlist ?? []) as unknown as WaitlistEntry[],
      };
    },
  });
}

// ============ SETTINGS ============

export function useWeights() {
  return useQuery({
    queryKey: ["weights"],
    queryFn: async () => {
      const settings = await api.getSettings();
      const weights = settings?.weights ?? {};
      return { ...DEFAULT_WEIGHTS, ...(weights as Partial<Weights>) } as Weights;
    },
  });
}

export function useSaveWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weights: Weights) => {
      await api.upsertSettings({
        id: 1,
        weights,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weights"] }),
  });
}

// ============ RECOMPUTE ============

export function useRecompute() {
  const qc = useQueryClient();
  const currentPeriod = useCurrentPeriod();

  return useMutation({
    mutationFn: async () => {
      const periodId = currentPeriod.data?.id;
      if (!periodId) throw new Error("No active period");

      const players = await api.getPlayers(periodId);
      const subsRaw = await api.getSubmissions(periodId);
      const settings = await api.getSettings();

      // Parse hours arrays from JSON strings and convert 0/1 to booleans
      const subs = (subsRaw ?? []).map((s: Record<string, unknown>) => ({
        ...s,
        requests_monday: Boolean(s.requests_monday),
        requests_tuesday: Boolean(s.requests_tuesday),
        requests_thursday: Boolean(s.requests_thursday),
        mon_hours: typeof s.mon_hours === 'string' ? JSON.parse(s.mon_hours as string) : s.mon_hours,
        tue_hours: typeof s.tue_hours === 'string' ? JSON.parse(s.tue_hours as string) : s.tue_hours,
        thu_hours: typeof s.thu_hours === 'string' ? JSON.parse(s.thu_hours as string) : s.thu_hours,
      }));

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
          subs as unknown as Submission[],
          byId,
          weights,
        );
        appointments.push(...res.appointments);
        waitlist.push(...res.waitlist);
      }

      await api.deleteAllAppointments(periodId);
      await api.deleteAllWaitlist(periodId);

      // Bulk insert appointments
      const appointmentsData = appointments.map(appt => ({
        id: crypto.randomUUID(),
        day: appt.day,
        slot: appt.slot,
        player_id: appt.player_id,
        alliance: appt.alliance,
        score: appt.score,
      }));
      await api.insertAppointmentsBulk(appointmentsData, periodId);

      // Bulk insert waitlist
      const waitlistData = waitlist.map(w => ({
        id: crypto.randomUUID(),
        day: w.day,
        player_id: w.player_id,
        alliance: w.alliance,
        score: w.score,
        reason: w.reason,
      }));
      await api.insertWaitlistBulk(waitlistData, periodId);

      return { scheduled: appointments.length, waitlisted: waitlist.length };
    },
    onSuccess: () => {
      const periodId = currentPeriod.data?.id;
      if (periodId) {
        qc.invalidateQueries({ queryKey: ["schedule", periodId] });
      }
    },
  });
}

// ============ CLEAR ALL ============

async function wipeAll(periodId: string) {
  await api.deleteAllAppointments(periodId);
  await api.deleteAllWaitlist(periodId);
  await api.deleteAllSubmissions(periodId);
  await api.deleteAllPlayers(periodId);
  await api.deleteAllImports(periodId);
}

export function useClearAll() {
  const qc = useQueryClient();
  const currentPeriod = useCurrentPeriod();

  return useMutation({
    mutationFn: async () => {
      const periodId = currentPeriod.data?.id;
      if (!periodId) throw new Error("No active period");
      await wipeAll(periodId);
    },
    onSuccess: () => {
      const periodId = currentPeriod.data?.id;
      if (periodId) {
        qc.invalidateQueries({ queryKey: ["roster", periodId] });
        qc.invalidateQueries({ queryKey: ["schedule", periodId] });
        qc.invalidateQueries({ queryKey: ["latestImport", periodId] });
      }
    },
  });
}

// ============ LATEST IMPORT ============

export function useLatestImport() {
  const currentPeriod = useCurrentPeriod();
  const periodId = currentPeriod.data?.id;

  return useQuery({
    queryKey: ["latestImport", periodId],
    queryFn: async () => {
      if (!periodId) return null;
      const data = await api.getLatestImport(periodId);
      return data as {
        filename: string;
        raw_csv: string;
        row_count: number;
        created_at: string;
      } | null;
    },
    enabled: !!periodId,
  });
}

// ============ SET SLOT ============

export function useSetSlot() {
  const qc = useQueryClient();
  const currentPeriod = useCurrentPeriod();

  return useMutation({
    mutationFn: async (args: { day: DayKey; slot: string; playerId: string | null }) => {
      const periodId = currentPeriod.data?.id;
      if (!periodId) throw new Error("No active period");

      const { day, slot, playerId } = args;
      const apptRows = await api.getAppointmentsByDay(day, periodId);
      const wlRows = await api.getWaitlistByDay(day, periodId);

      const appts = (apptRows ?? []) as unknown as (Appointment & { id: string })[];
      const wl = (wlRows ?? []) as unknown as (WaitlistEntry & { id: string })[];
      const occupant = appts.find((a) => a.slot === slot);

      if (!playerId) {
        if (!occupant) return;
        await api.deleteAppointment(occupant.id, periodId);
        await api.insertWaitlist({
          id: crypto.randomUUID(),
          day,
          player_id: occupant.player_id,
          alliance: occupant.alliance,
          score: occupant.score,
          reason: "removed manually",
        }, periodId);
        return;
      }

      const source = appts.find((a) => a.player_id === playerId);
      if (source) {
        if (source.slot === slot) return;
        if (occupant) {
          // (day, slot) is unique, so park the occupant on a scratch slot first to avoid
          // colliding with the source's target slot while both updates are in flight.
          const tempSlot = `__swap_${occupant.id}`;
          await api.updateAppointment(occupant.id, { slot: tempSlot }, periodId);
          await api.updateAppointment(source.id, { slot }, periodId);
          await api.updateAppointment(occupant.id, { slot: source.slot }, periodId);
        } else {
          await api.updateAppointment(source.id, { slot }, periodId);
        }
        return;
      }

      const entry = wl.find((w) => w.player_id === playerId);
      if (!entry) return;
      await api.deleteWaitlist(entry.id, periodId);
      if (occupant) {
        await api.updateAppointment(occupant.id, {
          player_id: entry.player_id,
          alliance: entry.alliance,
          score: entry.score
        }, periodId);
        await api.insertWaitlist({
          id: crypto.randomUUID(),
          day,
          player_id: occupant.player_id,
          alliance: occupant.alliance,
          score: occupant.score,
          reason: "replaced manually",
        }, periodId);
      } else {
        await api.insertAppointment({
          id: crypto.randomUUID(),
          day,
          slot,
          player_id: entry.player_id,
          alliance: entry.alliance,
          score: entry.score,
        }, periodId);
      }
    },
    onSuccess: () => {
      const periodId = currentPeriod.data?.id;
      if (periodId) {
        qc.invalidateQueries({ queryKey: ["schedule", periodId] });
      }
    },
  });
}

// ============ IMPORT CSV ============

export function useImportCsv() {
  const qc = useQueryClient();
  const currentPeriod = useCurrentPeriod();

  return useMutation({
    mutationFn: async (args: {
      filename: string;
      raw: string;
      players: Player[];
      submissions: Submission[];
    }) => {
      const periodId = currentPeriod.data?.id;
      if (!periodId) throw new Error("No active period");

      await wipeAll(periodId);

      const importId = crypto.randomUUID();
      await api.insertImport({
        id: importId,
        filename: args.filename,
        raw_csv: args.raw,
        row_count: args.submissions.length,
        created_at: new Date().toISOString(),
      }, periodId);

      // Bulk insert players
      const playersData = args.players.map(p => ({
        player_id: p.player_id,
        name: p.name,
        alliance: p.alliance,
        updated_at: new Date().toISOString(),
      }));
      await api.insertPlayersBulk(playersData, periodId);

      // Bulk insert submissions
      const submissionsData = args.submissions.map(s => ({
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
      }));
      await api.insertSubmissionsBulk(submissionsData, periodId);

      return importId;
    },
    onSuccess: () => {
      const periodId = currentPeriod.data?.id;
      if (periodId) {
        qc.invalidateQueries({ queryKey: ["roster", periodId] });
        qc.invalidateQueries({ queryKey: ["schedule", periodId] });
        qc.invalidateQueries({ queryKey: ["latestImport", periodId] });
      }
    },
  });
}


export function dayLabel(day: DayKey) {
  return DAYS.find((d) => d.key === day)!;
}
