import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/wos.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS players (
      player_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      alliance TEXT,
      updated_at TEXT NOT NULL
    );

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
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(player_id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      slot TEXT NOT NULL,
      player_id TEXT NOT NULL,
      alliance TEXT,
      score INTEGER DEFAULT 0,
      FOREIGN KEY (player_id) REFERENCES players(player_id)
    );

    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      player_id TEXT NOT NULL,
      alliance TEXT,
      score INTEGER DEFAULT 0,
      reason TEXT,
      FOREIGN KEY (player_id) REFERENCES players(player_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      weights TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      raw_csv TEXT NOT NULL,
      row_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_day ON appointments(day);
    CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot);
    CREATE INDEX IF NOT EXISTS idx_waitlist_day ON waitlist(day);
    CREATE INDEX IF NOT EXISTS idx_submissions_player ON submissions(player_id);
  `);

  // Initialize settings row if not exists
  const settings = database.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!settings) {
    database.prepare('INSERT INTO settings (id, weights, updated_at) VALUES (1, ?, ?)').run('{}', new Date().toISOString());
  }
}

// Helper to convert arrays to JSON strings for storage
function toJson(value: unknown): string {
  return JSON.stringify(value);
}

// Helper to parse JSON strings from storage
function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// Database operations matching Supabase table structure
export const dbOperations = {
  // Players
  getPlayers: () => {
    const db = getDb();
    return db.prepare('SELECT player_id, name, alliance, updated_at FROM players ORDER BY name').all();
  },

  getPlayer: (playerId: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  },

  upsertPlayer: (player: { player_id: string; name: string; alliance: string; updated_at: string }) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO players (player_id, name, alliance, updated_at)
      VALUES (@player_id, @name, @alliance, @updated_at)
      ON CONFLICT(player_id) DO UPDATE SET
        name = excluded.name,
        alliance = excluded.alliance,
        updated_at = excluded.updated_at
    `).run(player);
  },

  deleteAllPlayers: () => {
    const db = getDb();
    db.prepare('DELETE FROM players').run();
  },

  // Submissions
  getSubmissions: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM submissions').all();
  },

  upsertSubmission: (submission: {
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
  }) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO submissions (
        player_id, import_id, comment, requests_monday, requests_tuesday, requests_thursday,
        mon_hours, mon_normal_fc, mon_refined_fc, mon_speedup_days,
        tue_hours, tue_shards, tue_speedup_days,
        thu_hours, thu_speedup_days, submitted_at
      )
      VALUES (
        @player_id, @import_id, @comment, @requests_monday, @requests_tuesday, @requests_thursday,
        @mon_hours, @mon_normal_fc, @mon_refined_fc, @mon_speedup_days,
        @tue_hours, @tue_shards, @tue_speedup_days,
        @thu_hours, @thu_speedup_days, @submitted_at
      )
      ON CONFLICT(player_id) DO UPDATE SET
        import_id = excluded.import_id,
        comment = excluded.comment,
        requests_monday = excluded.requests_monday,
        requests_tuesday = excluded.requests_tuesday,
        requests_thursday = excluded.requests_thursday,
        mon_hours = excluded.mon_hours,
        mon_normal_fc = excluded.mon_normal_fc,
        mon_refined_fc = excluded.mon_refined_fc,
        mon_speedup_days = excluded.mon_speedup_days,
        tue_hours = excluded.tue_hours,
        tue_shards = excluded.tue_shards,
        tue_speedup_days = excluded.tue_speedup_days,
        thu_hours = excluded.thu_hours,
        thu_speedup_days = excluded.thu_speedup_days,
        submitted_at = excluded.submitted_at
    `).run({
      player_id: submission.player_id,
      import_id: submission.import_id || null,
      comment: submission.comment || null,
      requests_monday: submission.requests_monday ? 1 : 0,
      requests_tuesday: submission.requests_tuesday ? 1 : 0,
      requests_thursday: submission.requests_thursday ? 1 : 0,
      mon_hours: toJson(submission.mon_hours || []),
      mon_normal_fc: submission.mon_normal_fc || 0,
      mon_refined_fc: submission.mon_refined_fc || 0,
      mon_speedup_days: submission.mon_speedup_days || 0,
      tue_hours: toJson(submission.tue_hours || []),
      tue_shards: submission.tue_shards || 0,
      tue_speedup_days: submission.tue_speedup_days || 0,
      thu_hours: toJson(submission.thu_hours || []),
      thu_speedup_days: submission.thu_speedup_days || 0,
      submitted_at: submission.submitted_at,
    });
  },

  deleteAllSubmissions: () => {
    const db = getDb();
    db.prepare('DELETE FROM submissions').run();
  },

  // Appointments
  getAppointments: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM appointments').all();
  },

  getAppointmentsByDay: (day: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM appointments WHERE day = ?').all(day);
  },

  insertAppointment: (appointment: {
    id: string;
    day: string;
    slot: string;
    player_id: string;
    alliance: string;
    score: number;
  }) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO appointments (id, day, slot, player_id, alliance, score)
      VALUES (@id, @day, @slot, @player_id, @alliance, @score)
    `).run(appointment);
  },

  updateAppointment: (id: string, updates: { slot?: string; player_id?: string; alliance?: string; score?: number }) => {
    const db = getDb();
    const sets: string[] = [];
    const params: Record<string, unknown> = { id };

    if (updates.slot !== undefined) { sets.push('slot = @slot'); params.slot = updates.slot; }
    if (updates.player_id !== undefined) { sets.push('player_id = @player_id'); params.player_id = updates.player_id; }
    if (updates.alliance !== undefined) { sets.push('alliance = @alliance'); params.alliance = updates.alliance; }
    if (updates.score !== undefined) { sets.push('score = @score'); params.score = updates.score; }

    if (sets.length > 0) {
      db.prepare(`UPDATE appointments SET ${sets.join(', ')} WHERE id = @id`).run(params);
    }
  },

  deleteAppointment: (id: string) => {
    const db = getDb();
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  },

  deleteAllAppointments: () => {
    const db = getDb();
    db.prepare('DELETE FROM appointments').run();
  },

  // Waitlist
  getWaitlist: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM waitlist').all();
  },

  getWaitlistByDay: (day: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM waitlist WHERE day = ?').all(day);
  },

  insertWaitlist: (entry: {
    id: string;
    day: string;
    player_id: string;
    alliance: string;
    score: number;
    reason?: string;
  }) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO waitlist (id, day, player_id, alliance, score, reason)
      VALUES (@id, @day, @player_id, @alliance, @score, @reason)
    `).run({
      id: entry.id,
      day: entry.day,
      player_id: entry.player_id,
      alliance: entry.alliance,
      score: entry.score,
      reason: entry.reason || null,
    });
  },

  deleteWaitlist: (id: string) => {
    const db = getDb();
    db.prepare('DELETE FROM waitlist WHERE id = ?').run(id);
  },

  deleteAllWaitlist: () => {
    const db = getDb();
    db.prepare('DELETE FROM waitlist').run();
  },

  // Settings
  getSettings: () => {
    const db = getDb();
    const row = db.prepare('SELECT weights, updated_at FROM settings WHERE id = 1').get() as { weights: string; updated_at: string } | undefined;
    if (!row) return null;
    return {
      weights: parseJson(row.weights),
      updated_at: row.updated_at,
    };
  },

  upsertSettings: (settings: { id: number; weights: unknown; updated_at: string }) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO settings (id, weights, updated_at)
      VALUES (@id, @weights, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        weights = excluded.weights,
        updated_at = excluded.updated_at
    `).run({
      id: settings.id,
      weights: toJson(settings.weights),
      updated_at: settings.updated_at,
    });
  },

  // Imports
  getImports: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM imports ORDER BY created_at DESC').all();
  },

  getLatestImport: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM imports ORDER BY created_at DESC LIMIT 1').get();
  },

  insertImport: (imp: { id: string; filename: string; raw_csv: string; row_count: number; created_at: string }) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO imports (id, filename, raw_csv, row_count, created_at)
      VALUES (@id, @filename, @raw_csv, @row_count, @created_at)
    `).run(imp);
  },

  deleteAllImports: () => {
    const db = getDb();
    db.prepare('DELETE FROM imports').run();
  },
};
