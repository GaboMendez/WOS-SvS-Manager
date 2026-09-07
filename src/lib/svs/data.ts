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

const ALLIANCE_TOKENS = ["all-1", "all-2", "all-3", "all-4", "all-5", "all-6"] as const;

export function allianceToken(tag: string): string {
  let h = 0;
  for (const ch of tag.toUpperCase()) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ALLIANCE_TOKENS[h % ALLIANCE_TOKENS.length] ?? "all-1";
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
    },
  });
}


export function dayLabel(day: DayKey) {
  return DAYS.find((d) => d.key === day)!;
}
