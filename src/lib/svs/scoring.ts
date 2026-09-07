import type { DayKey, Submission, Weights } from "./types";

export function scoreFor(day: DayKey, s: Submission, w: Weights): number {
  if (day === "monday") {
    const minutes = s.mon_speedup_days * w.daysToMinutes;
    return (
      s.mon_normal_fc * w.normalFireCrystal +
      s.mon_refined_fc * w.refinedFireCrystal +
      minutes * w.constructionSpeedupMinute
    );
  }
  if (day === "tuesday") {
    const minutes = s.tue_speedup_days * w.daysToMinutes;
    return s.tue_shards * w.fireCrystalShard + minutes * w.researchSpeedupMinute;
  }
  return s.thu_speedup_days * w.trainingSpeedupDay;
}

export function requestsDay(day: DayKey, s: Submission): boolean {
  if (day === "monday") return s.requests_monday;
  if (day === "tuesday") return s.requests_tuesday;
  return s.requests_thursday;
}

export function preferredHours(day: DayKey, s: Submission): number[] {
  if (day === "monday") return s.mon_hours ?? [];
  if (day === "tuesday") return s.tue_hours ?? [];
  return s.thu_hours ?? [];
}

export function formatScore(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}
