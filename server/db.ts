import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/wos.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

initializeSchema();

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      player_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      alliance TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      player_id TEXT PRIMARY KEY,
      import_id TEXT,
      comment TEXT,
      requests_monday INTEGER DEFAULT 0,
      requests_tuesday INTEGER DEFAULT 0,
      requests_thursday INTEGER DEFAULT 0,
      mon_hours TEXT,
      mon_normal_fc INTEGER DEFAULT 0,
      mon_refined_fc INTEGER DEFAULT 0,
      mon_speedup_days INTEGER DEFAULT 0,
      tue_hours TEXT,
      tue_shards INTEGER DEFAULT 0,
      tue_speedup_days INTEGER DEFAULT 0,
      thu_hours TEXT,
      thu_speedup_days INTEGER DEFAULT 0,
      submitted_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      slot TEXT NOT NULL,
      player_id TEXT NOT NULL,
      alliance TEXT,
      score INTEGER DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      player_id TEXT NOT NULL,
      alliance TEXT,
      score INTEGER DEFAULT 0,
      reason TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      weights TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      raw_csv TEXT NOT NULL,
      row_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Initialize settings row if not exists
  const result = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!result) {
    db.prepare("INSERT INTO settings (id, weights, updated_at) VALUES (1, '{}', ?)").run(new Date().toISOString());
  }
}

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// Players
export function getPlayers() {
  return db.prepare('SELECT player_id, name, alliance, updated_at FROM players ORDER BY name').all();
}

export function upsertPlayer(player: { player_id: string; name: string; alliance: string; updated_at: string }) {
  db.prepare(`INSERT OR REPLACE INTO players (player_id, name, alliance, updated_at) VALUES (?, ?, ?, ?)`).run(
    player.player_id, player.name, player.alliance, player.updated_at
  );
}

export function deleteAllPlayers() {
  db.prepare('DELETE FROM players').run();
}

// Submissions
export function getSubmissions() {
  return db.prepare('SELECT * FROM submissions').all();
}

export function upsertSubmission(submission: {
  player_id: string;
  import_id?: string;
  comment?: string;
  requests_monday?: boolean;
  requests_tuesday?: boolean;
  requests_thursday?: boolean;
  mon_hours?: number[];
  mon_normal_fc?: number;
  mon_refined_fc?: number;
  mon_speedup_days?: number;
  tue_hours?: number[];
  tue_shards?: number;
  tue_speedup_days?: number;
  thu_hours?: number[];
  thu_speedup_days?: number;
  submitted_at: string;
}) {
  db.prepare(`INSERT OR REPLACE INTO submissions (
    player_id, import_id, comment, requests_monday, requests_tuesday, requests_thursday,
    mon_hours, mon_normal_fc, mon_refined_fc, mon_speedup_days,
    tue_hours, tue_shards, tue_speedup_days,
    thu_hours, thu_speedup_days, submitted_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    submission.player_id,
    submission.import_id || null,
    submission.comment || null,
    submission.requests_monday ? 1 : 0,
    submission.requests_tuesday ? 1 : 0,
    submission.requests_thursday ? 1 : 0,
    toJson(submission.mon_hours || []),
    submission.mon_normal_fc || 0,
    submission.mon_refined_fc || 0,
    submission.mon_speedup_days || 0,
    toJson(submission.tue_hours || []),
    submission.tue_shards || 0,
    submission.tue_speedup_days || 0,
    toJson(submission.thu_hours || []),
    submission.thu_speedup_days || 0,
    submission.submitted_at
  );
}

export function deleteAllSubmissions() {
  db.prepare('DELETE FROM submissions').run();
}

// Appointments
export function getAppointments() {
  return db.prepare('SELECT * FROM appointments').all();
}

export function getAppointmentsByDay(day: string) {
  return db.prepare('SELECT * FROM appointments WHERE day = ?').all(day);
}

export function insertAppointment(appointment: { id: string; day: string; slot: string; player_id: string; alliance: string; score: number }) {
  db.prepare('INSERT INTO appointments (id, day, slot, player_id, alliance, score) VALUES (?, ?, ?, ?, ?, ?)').run(
    appointment.id, appointment.day, appointment.slot, appointment.player_id, appointment.alliance, appointment.score
  );
}

export function updateAppointment(id: string, updates: { slot?: string; player_id?: string; alliance?: string; score?: number }) {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.slot !== undefined) { sets.push('slot = ?'); params.push(updates.slot); }
  if (updates.player_id !== undefined) { sets.push('player_id = ?'); params.push(updates.player_id); }
  if (updates.alliance !== undefined) { sets.push('alliance = ?'); params.push(updates.alliance); }
  if (updates.score !== undefined) { sets.push('score = ?'); params.push(updates.score); }

  if (sets.length > 0) {
    params.push(id);
    db.prepare(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }
}

export function deleteAppointment(id: string) {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
}

export function deleteAllAppointments() {
  db.prepare('DELETE FROM appointments').run();
}

// Waitlist
export function getWaitlist() {
  return db.prepare('SELECT * FROM waitlist').all();
}

export function getWaitlistByDay(day: string) {
  return db.prepare('SELECT * FROM waitlist WHERE day = ?').all(day);
}

export function insertWaitlist(entry: { id: string; day: string; player_id: string; alliance: string; score: number; reason?: string }) {
  db.prepare('INSERT INTO waitlist (id, day, player_id, alliance, score, reason) VALUES (?, ?, ?, ?, ?, ?)').run(
    entry.id, entry.day, entry.player_id, entry.alliance, entry.score, entry.reason || null
  );
}

export function deleteWaitlist(id: string) {
  db.prepare('DELETE FROM waitlist WHERE id = ?').run(id);
}

export function deleteAllWaitlist() {
  db.prepare('DELETE FROM waitlist').run();
}

// Settings
export function getSettings() {
  const row = db.prepare('SELECT weights, updated_at FROM settings WHERE id = 1').get() as { weights: string; updated_at: string } | undefined;
  if (!row) return null;
  return {
    weights: parseJson(row.weights),
    updated_at: row.updated_at,
  };
}

export function upsertSettings(settings: { id: number; weights: unknown; updated_at: string }) {
  db.prepare('INSERT OR REPLACE INTO settings (id, weights, updated_at) VALUES (?, ?, ?)').run(
    settings.id, toJson(settings.weights), settings.updated_at
  );
}

// Imports
export function getLatestImport() {
  return db.prepare('SELECT * FROM imports ORDER BY created_at DESC LIMIT 1').get();
}

export function insertImport(imp: { id: string; filename: string; raw_csv: string; row_count: number; created_at: string }) {
  db.prepare('INSERT INTO imports (id, filename, raw_csv, row_count, created_at) VALUES (?, ?, ?, ?, ?)').run(
    imp.id, imp.filename, imp.raw_csv, imp.row_count, imp.created_at
  );
}

export function deleteAllImports() {
  db.prepare('DELETE FROM imports').run();
}
