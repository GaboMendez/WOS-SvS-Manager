-- Migration 002: Operation Slingshot
-- Creates table for Day 5: Power Boost activity tracking

CREATE TABLE IF NOT EXISTS slingshot_entries (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  pet_advancement INTEGER DEFAULT 0,
  advanced_wild_mark INTEGER DEFAULT 0,
  common_wild_mark INTEGER DEFAULT 0,
  chief_gear_score INTEGER DEFAULT 0,
  hero_gear_essence_stone INTEGER DEFAULT 0,
  hero_exclusive_gear_widget INTEGER DEFAULT 0,
  mithril INTEGER DEFAULT 0,
  fire_crystal INTEGER DEFAULT 0,
  construction_speedup_minutes INTEGER DEFAULT 0,
  research_speedup_minutes INTEGER DEFAULT 0,
  training_speedup_minutes INTEGER DEFAULT 0,
  expert_skills_speedup_minutes INTEGER DEFAULT 0,
  fire_crystal_shard INTEGER DEFAULT 0,
  refined_fire_crystal INTEGER DEFAULT 0,
  total_points INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(player_id, period_id)
);
