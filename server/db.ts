import { createClient } from '@libsql/client';
import { DB_PATH, DB_AUTH_TOKEN } from './path.js';
import { runMigrations } from './migrations.js';

const dbConfig: Parameters<typeof createClient>[0] = { url: DB_PATH };

// Add auth token for Turso remote database
if (DB_AUTH_TOKEN) {
  dbConfig.authToken = DB_AUTH_TOKEN;
}

const db = createClient(dbConfig);

// Initialize settings row if not exists
async function ensureSettings() {
  const result = await db.execute('SELECT id FROM settings WHERE id = 1');
  if (result.rows.length === 0) {
    await db.execute("INSERT INTO settings (id, weights, updated_at) VALUES (1, '{}', ?)", [new Date().toISOString()]);
  }
}

// Run migrations on startup
runMigrations().then(ensureSettings).catch(console.error);

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

// ============ PERIODS ============

export function getPeriods() {
  return db.execute('SELECT * FROM periods ORDER BY year DESC, month DESC');
}

export function getCurrentPeriod() {
  return db.execute('SELECT * FROM periods WHERE is_closed = 0 LIMIT 1');
}

export function getPeriod(id: string) {
  return db.execute('SELECT * FROM periods WHERE id = ?', [id]);
}

export function createPeriod(period: { id: string; name: string; month: number; year: number }) {
  return db.execute(
    'INSERT INTO periods (id, name, month, year, is_closed, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [period.id, period.name, period.month, period.year, new Date().toISOString()]
  );
}

export function closePeriod(id: string) {
  return db.execute(
    'UPDATE periods SET is_closed = 1, closed_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  );
}

export function deletePeriod(id: string) {
  // Delete all related data first (due to foreign key constraints)
  db.execute('DELETE FROM waitlist WHERE period_id = ?', [id]);
  db.execute('DELETE FROM appointments WHERE period_id = ?', [id]);
  db.execute('DELETE FROM submissions WHERE period_id = ?', [id]);
  db.execute('DELETE FROM players WHERE period_id = ?', [id]);
  db.execute('DELETE FROM imports WHERE period_id = ?', [id]);
  // Finally delete the period
  return db.execute('DELETE FROM periods WHERE id = ?', [id]);
}

// ============ PLAYERS ============

export function getPlayers(periodId: string) {
  return db.execute('SELECT player_id, name, alliance, updated_at FROM players WHERE period_id = ? ORDER BY name', [periodId]);
}

export function deleteAllPlayers(periodId: string) {
  return db.execute('DELETE FROM players WHERE period_id = ?', [periodId]);
}

export function insertPlayersBulk(periodId: string, players: { player_id: string; name: string; alliance: string; updated_at: string }[]) {
  if (players.length === 0) return Promise.resolve({ rows: [], rowsAffected: 0 });
  const placeholders = players.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const values = players.flatMap(p => [p.player_id, periodId, p.name || '', p.alliance || '', p.updated_at]);
  return db.execute(
    `INSERT OR REPLACE INTO players (player_id, period_id, name, alliance, updated_at) VALUES ${placeholders}`,
    values
  );
}

// ============ SUBMISSIONS ============

export function getSubmissions(periodId: string) {
  return db.execute('SELECT * FROM submissions WHERE period_id = ?', [periodId]);
}

export function deleteAllSubmissions(periodId: string) {
  return db.execute('DELETE FROM submissions WHERE period_id = ?', [periodId]);
}

export function insertSubmissionsBulk(periodId: string, submissions: {
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
}[]) {
  if (submissions.length === 0) return Promise.resolve({ rows: [], rowsAffected: 0 });
  const placeholders = submissions.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const values = submissions.flatMap(s => [
    s.player_id,
    periodId,
    s.import_id || null,
    s.comment || null,
    s.requests_monday ? 1 : 0,
    s.requests_tuesday ? 1 : 0,
    s.requests_thursday ? 1 : 0,
    toJson(s.mon_hours || []),
    s.mon_normal_fc || 0,
    s.mon_refined_fc || 0,
    s.mon_speedup_days || 0,
    toJson(s.tue_hours || []),
    s.tue_shards || 0,
    s.tue_speedup_days || 0,
    toJson(s.thu_hours || []),
    s.thu_speedup_days || 0,
    s.submitted_at
  ]);
  return db.execute(
    `INSERT OR REPLACE INTO submissions (player_id, period_id, import_id, comment, requests_monday, requests_tuesday, requests_thursday, mon_hours, mon_normal_fc, mon_refined_fc, mon_speedup_days, tue_hours, tue_shards, tue_speedup_days, thu_hours, thu_speedup_days, submitted_at) VALUES ${placeholders}`,
    values as (string | number | null)[]
  );
}

// ============ APPOINTMENTS ============

export function getAppointments(periodId: string) {
  return db.execute('SELECT * FROM appointments WHERE period_id = ?', [periodId]);
}

export function getAppointmentsByDay(periodId: string, day: string) {
  return db.execute('SELECT * FROM appointments WHERE period_id = ? AND day = ?', [periodId, day]);
}

export function insertAppointment(periodId: string, appointment: { id: string; day: string; slot: string; player_id: string; alliance?: string; score?: number }) {
  return db.execute(
    'INSERT INTO appointments (id, period_id, day, slot, player_id, alliance, score) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [appointment.id, periodId, appointment.day, appointment.slot, appointment.player_id, appointment.alliance || '', appointment.score ?? 0]
  );
}

export function updateAppointment(periodId: string, id: string, updates: { slot?: string; player_id?: string; alliance?: string; score?: number }) {
  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (updates.slot !== undefined) { sets.push('slot = ?'); params.push(updates.slot); }
  if (updates.player_id !== undefined) { sets.push('player_id = ?'); params.push(updates.player_id); }
  if (updates.alliance !== undefined) { sets.push('alliance = ?'); params.push(updates.alliance); }
  if (updates.score !== undefined) { sets.push('score = ?'); params.push(updates.score); }

  if (sets.length > 0) {
    params.push(id, periodId);
    return db.execute(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ? AND period_id = ?`, params);
  }
}

export function deleteAppointment(periodId: string, id: string) {
  return db.execute('DELETE FROM appointments WHERE id = ? AND period_id = ?', [id, periodId]);
}

export function deleteAllAppointments(periodId: string) {
  return db.execute('DELETE FROM appointments WHERE period_id = ?', [periodId]);
}

export function insertAppointmentsBulk(periodId: string, appointments: { id: string; day: string; slot: string; player_id: string; alliance?: string; score?: number }[]) {
  if (appointments.length === 0) return Promise.resolve({ rows: [], rowsAffected: 0 });
  const placeholders = appointments.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
  const values = appointments.flatMap(a => [a.id, periodId, a.day, a.slot, a.player_id, a.alliance || '', a.score ?? 0]);
  return db.execute(
    `INSERT INTO appointments (id, period_id, day, slot, player_id, alliance, score) VALUES ${placeholders}`,
    values as (string | number)[]
  );
}

// ============ WAITLIST ============

export function getWaitlist(periodId: string) {
  return db.execute('SELECT * FROM waitlist WHERE period_id = ?', [periodId]);
}

export function getWaitlistByDay(periodId: string, day: string) {
  return db.execute('SELECT * FROM waitlist WHERE period_id = ? AND day = ?', [periodId, day]);
}

export function insertWaitlist(periodId: string, entry: { id: string; day: string; player_id: string; alliance?: string; score?: number; reason?: string }) {
  const values = [
    entry.id ?? '',
    periodId,
    entry.day ?? '',
    entry.player_id ?? '',
    entry.alliance ?? '',
    entry.score ?? 0,
    entry.reason ?? null
  ];
  return db.execute(
    'INSERT INTO waitlist (id, period_id, day, player_id, alliance, score, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
    values as (string | number | null)[]
  );
}

export function deleteWaitlist(periodId: string, id: string) {
  return db.execute('DELETE FROM waitlist WHERE id = ? AND period_id = ?', [id, periodId]);
}

export function deleteAllWaitlist(periodId: string) {
  return db.execute('DELETE FROM waitlist WHERE period_id = ?', [periodId]);
}

export function insertWaitlistBulk(periodId: string, entries: { id: string; day: string; player_id: string; alliance?: string; score?: number; reason?: string }[]) {
  if (entries.length === 0) return Promise.resolve({ rows: [], rowsAffected: 0 });
  const placeholders = entries.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
  const values = entries.flatMap(e => [e.id, periodId, e.day, e.player_id, e.alliance || '', e.score ?? 0, e.reason || null]);
  return db.execute(
    `INSERT INTO waitlist (id, period_id, day, player_id, alliance, score, reason) VALUES ${placeholders}`,
    values as (string | number | null)[]
  );
}

// ============ SETTINGS ============

export async function getSettings() {
  const result = await db.execute('SELECT weights, updated_at FROM settings WHERE id = 1');
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as { weights: string; updated_at: string };
  return {
    weights: parseJson(row.weights),
    updated_at: row.updated_at,
  };
}

export function upsertSettings(settings: { id: number; weights: unknown; updated_at: string }) {
  return db.execute(
    'INSERT OR REPLACE INTO settings (id, weights, updated_at) VALUES (?, ?, ?)',
    [settings.id, toJson(settings.weights), settings.updated_at]
  );
}

// ============ IMPORTS ============

export function getLatestImport(periodId: string) {
  return db.execute('SELECT * FROM imports WHERE period_id = ? ORDER BY created_at DESC LIMIT 1', [periodId]);
}

export function getImports(periodId: string) {
  return db.execute('SELECT * FROM imports WHERE period_id = ? ORDER BY created_at DESC', [periodId]);
}

export function insertImport(periodId: string, imp: { id: string; filename: string; raw_csv: string; row_count: number; created_at: string }) {
  return db.execute(
    'INSERT INTO imports (id, period_id, filename, raw_csv, row_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [imp.id, periodId, imp.filename, imp.raw_csv, imp.row_count, imp.created_at]
  );
}

export function deleteAllImports(periodId: string) {
  return db.execute('DELETE FROM imports WHERE period_id = ?', [periodId]);
}
