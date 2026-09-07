import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      const [{ data: players, error: pe }, { data: submissions, error: se }] = await Promise.all([
        supabase.from("players").select("player_id,name,alliance").order("name"),
        supabase.from("submissions").select("*"),
      ]);
      if (pe) throw pe;
      if (se) throw se;
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
      const [{ data: appts, error: ae }, { data: wl, error: we }] = await Promise.all([
        supabase.from("appointments").select("*"),
        supabase.from("waitlist").select("*"),
      ]);
      if (ae) throw ae;
      if (we) throw we;
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
      const { data, error } = await supabase
        .from("settings")
        .select("weights")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return { ...DEFAULT_WEIGHTS, ...((data?.weights ?? {}) as Partial<Weights>) } as Weights;
    },
  });
}

export function useSaveWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weights: Weights) => {
      const { error } = await supabase
        .from("settings")
        .upsert({ id: 1, weights, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weights"] }),
  });
}

export function useRecompute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const [{ data: players }, { data: subs }, { data: settings }] = await Promise.all([
        supabase.from("players").select("player_id,name,alliance"),
        supabase.from("submissions").select("*"),
        supabase.from("settings").select("weights").eq("id", 1).maybeSingle(),
      ]);
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

      await supabase.from("appointments").delete().neq("day", "__none__");
      await supabase.from("waitlist").delete().neq("day", "__none__");
      if (appointments.length) {
        const { error } = await supabase.from("appointments").insert(appointments);
        if (error) throw error;
      }
      if (waitlist.length) {
        const { error } = await supabase.from("waitlist").insert(waitlist);
        if (error) throw error;
      }
      return { scheduled: appointments.length, waitlisted: waitlist.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });
}

async function wipeAll() {
  await supabase.from("appointments").delete().neq("day", "__none__");
  await supabase.from("waitlist").delete().neq("day", "__none__");
  await supabase.from("submissions").delete().neq("player_id", "__none__");
  await supabase.from("players").delete().neq("player_id", "__none__");
  await supabase.from("imports").delete().neq("filename", "__none__");
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
      const { data, error } = await supabase
        .from("imports")
        .select("filename,raw_csv,row_count,created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
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
      const [{ data: apptRows }, { data: wlRows }] = await Promise.all([
        supabase.from("appointments").select("*").eq("day", day),
        supabase.from("waitlist").select("*").eq("day", day),
      ]);
      const appts = (apptRows ?? []) as unknown as (Appointment & { id: string })[];
      const wl = (wlRows ?? []) as unknown as (WaitlistEntry & { id: string })[];
      const occupant = appts.find((a) => a.slot === slot);

      if (!playerId) {
        if (!occupant) return;
        await supabase.from("appointments").delete().eq("id", occupant.id);
        await supabase.from("waitlist").insert({
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
          await supabase.from("appointments").update({ slot: tempSlot }).eq("id", occupant.id);
          await supabase.from("appointments").update({ slot }).eq("id", source.id);
          await supabase.from("appointments").update({ slot: source.slot }).eq("id", occupant.id);
        } else {
          await supabase.from("appointments").update({ slot }).eq("id", source.id);
        }
        return;
      }

      const entry = wl.find((w) => w.player_id === playerId);
      if (!entry) return;
      await supabase.from("waitlist").delete().eq("id", entry.id);
      if (occupant) {
        await supabase
          .from("appointments")
          .update({ player_id: entry.player_id, alliance: entry.alliance, score: entry.score })
          .eq("id", occupant.id);
        await supabase.from("waitlist").insert({
          day,
          player_id: occupant.player_id,
          alliance: occupant.alliance,
          score: occupant.score,
          reason: "replaced manually",
        });
      } else {
        await supabase.from("appointments").insert({
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

      const { data: imp, error: ie } = await supabase
        .from("imports")
        .insert({
          filename: args.filename,
          raw_csv: args.raw,
          row_count: args.submissions.length,
        })
        .select("id")
        .single();
      if (ie) throw ie;

      const { error: pe } = await supabase
        .from("players")
        .upsert(args.players.map((p) => ({ ...p, updated_at: new Date().toISOString() })));
      if (pe) throw pe;

      const { error: se } = await supabase
        .from("submissions")
        .upsert(args.submissions.map((s) => ({ ...s, import_id: imp.id })));
      if (se) throw se;
      return imp.id as string;
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
