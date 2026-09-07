export type DayKey = "monday" | "tuesday" | "thursday";

export const DAYS: { key: DayKey; label: string; focus: string }[] = [
  { key: "monday", label: "Monday", focus: "Construction" },
  { key: "tuesday", label: "Tuesday", focus: "Research" },
  { key: "thursday", label: "Thursday", focus: "Troop Training" },
];

export type Weights = {
  normalFireCrystal: number;
  refinedFireCrystal: number;
  constructionSpeedupMinute: number;
  fireCrystalShard: number;
  researchSpeedupMinute: number;
  daysToMinutes: number;
  trainingSpeedupDay: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  normalFireCrystal: 2000,
  refinedFireCrystal: 30000,
  constructionSpeedupMinute: 30,
  fireCrystalShard: 1000,
  researchSpeedupMinute: 30,
  daysToMinutes: 1440,
  trainingSpeedupDay: 1,
};

export type Submission = {
  player_id: string;
  submitted_at: string;
  requests_monday: boolean;
  mon_normal_fc: number;
  mon_refined_fc: number;
  mon_speedup_days: number;
  mon_hours: number[];
  requests_tuesday: boolean;
  tue_speedup_days: number;
  tue_shards: number;
  tue_hours: number[];
  requests_thursday: boolean;
  thu_speedup_days: number;
  thu_hours: number[];
  comment: string;
};

export type Player = {
  player_id: string;
  name: string;
  alliance: string;
};

export type Appointment = {
  day: DayKey;
  slot: string;
  player_id: string;
  alliance: string;
  score: number;
};

export type WaitlistEntry = {
  day: DayKey;
  player_id: string;
  alliance: string;
  score: number;
  reason: string;
};

/** 48 half-hour slots, 00:00 .. 23:30 UTC. */
export const SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});
