import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Period } from "@/integrations/api/client";

export interface SlingshotEntry {
  id: string;
  period_id: string;
  player_id: string;
  player_name: string;
  pet_advancement: number;
  advanced_wild_mark: number;
  common_wild_mark: number;
  chief_gear_score: number;
  hero_gear_essence_stone: number;
  hero_exclusive_gear_widget: number;
  mithril: number;
  fire_crystal: number;
  construction_speedup_minutes: number;
  research_speedup_minutes: number;
  training_speedup_minutes: number;
  expert_skills_speedup_minutes: number;
  fire_crystal_shard: number;
  refined_fire_crystal: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}

// Point values for each activity
export const SLINGSHOT_POINTS = {
  pet_advancement: 50,
  advanced_wild_mark: 15000,
  common_wild_mark: 1150,
  chief_gear_score: 36,
  hero_gear_essence_stone: 4000,
  hero_exclusive_gear_widget: 8000,
  mithril: 144000,
  fire_crystal: 2000,
  construction_speedup_minutes: 30,
  research_speedup_minutes: 30,
  training_speedup_minutes: 30,
  expert_skills_speedup_minutes: 30,
  fire_crystal_shard: 1000,
  refined_fire_crystal: 30000,
} as const;

export type SlingshotActivityKey = keyof typeof SLINGSHOT_POINTS;

export function calculateSlingshotPoints(activities: Record<SlingshotActivityKey, number>): number {
  let total = 0;
  for (const [key, points] of Object.entries(SLINGSHOT_POINTS)) {
    total += activities[key as SlingshotActivityKey] * points;
  }
  return total;
}

export function useSlingshotEntries() {
  const currentPeriod = useCurrentPeriod();
  const periodId = currentPeriod.data?.id;

  return useQuery({
    queryKey: ["slingshot", periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const data = await api.getSlingshotEntries(periodId);
      return data as SlingshotEntry[];
    },
    enabled: !!periodId,
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

export function useSaveSlingshotEntry() {
  const qc = useQueryClient();
  const currentPeriod = useCurrentPeriod();

  return useMutation({
    mutationFn: async (entry: {
      id: string;
      player_id: string;
      player_name: string;
      pet_advancement: number;
      advanced_wild_mark: number;
      common_wild_mark: number;
      chief_gear_score: number;
      hero_gear_essence_stone: number;
      hero_exclusive_gear_widget: number;
      mithril: number;
      fire_crystal: number;
      construction_speedup_minutes: number;
      research_speedup_minutes: number;
      training_speedup_minutes: number;
      expert_skills_speedup_minutes: number;
      fire_crystal_shard: number;
      refined_fire_crystal: number;
      total_points: number;
    }) => {
      const periodId = currentPeriod.data?.id;
      if (!periodId) throw new Error("No active period");
      await api.saveSlingshotEntry(entry, periodId);
    },
    onSuccess: () => {
      const periodId = currentPeriod.data?.id;
      if (periodId) {
        qc.invalidateQueries({ queryKey: ["slingshot", periodId] });
      }
    },
  });
}

export function useDeleteSlingshotEntry() {
  const qc = useQueryClient();
  const currentPeriod = useCurrentPeriod();

  return useMutation({
    mutationFn: async (playerId: string) => {
      const periodId = currentPeriod.data?.id;
      if (!periodId) throw new Error("No active period");
      await api.deleteSlingshotEntry(playerId, periodId);
    },
    onSuccess: () => {
      const periodId = currentPeriod.data?.id;
      if (periodId) {
        qc.invalidateQueries({ queryKey: ["slingshot", periodId] });
      }
    },
  });
}
