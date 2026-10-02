import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

let db: SqlJsDatabase | null = null;
let dbInitPromise: Promise<SqlJsDatabase> | null = null;

const DB_STORAGE_KEY = 'wos_db';

async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    });

    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem(DB_STORAGE_KEY);
    if (savedDb) {
      const data = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0));
      db = new SQL.Database(data);
    } else {
      db = new SQL.Database();
      initializeSchema(db);
      saveDb();
    }

    return db;
  })();

  return dbInitPromise;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const base64 = btoa(String.fromCharCode(...data));
  localStorage.setItem(DB_STORAGE_KEY, base64);
}

function initializeSchema(database: SqlJsDatabase) {
  database.run(`
    CREATE TABLE IF NOT EXISTS players (
      player_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      alliance TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  database.run(`
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

  database.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      slot TEXT NOT NULL,
      player_id TEXT NOT NULL,
      alliance TEXT,
      score INTEGER DEFAULT 0
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      player_id TEXT NOT NULL,
      alliance TEXT,
      score INTEGER DEFAULT 0,
      reason TEXT
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      weights TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      raw_csv TEXT NOT NULL,
      row_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Initialize settings row if not exists
  const result = database.exec('SELECT id FROM settings WHERE id = 1');
  if (result.length === 0) {
    database.run("INSERT INTO settings (id, weights, updated_at) VALUES (1, '{}', ?)", [new Date().toISOString()]);
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

function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  if (!db) return [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const results = queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

function run(sql: string, params: unknown[] = []) {
  if (!db) return;
  db.run(sql, params);
  saveDb();
}

// Database operations matching Supabase table structure
export const dbOperations = {
  // Initialize database (must be called before other operations)
  init: async () => {
    await initDb();
  },

  // Players
  getPlayers: () => {
    return queryAll<{ player_id: string; name: string; alliance: string; updated_at: string }>(
      'SELECT player_id, name, alliance, updated_at FROM players ORDER BY name'
    );
  },

  getPlayer: (playerId: string) => {
    return queryOne<Record<string, unknown>>('SELECT * FROM players WHERE player_id = ?', [playerId]);
  },

  upsertPlayer: (player: { player_id: string; name: string; alliance: string; updated_at: string }) => {
    run(
      `INSERT OR REPLACE INTO players (player_id, name, alliance, updated_at) VALUES (?, ?, ?, ?)`,
      [player.player_id, player.name, player.alliance, player.updated_at]
    );
  },

  deleteAllPlayers: () => {
    run('DELETE FROM players');
  },

  // Submissions
  getSubmissions: () => {
    return queryAll<Record<string, unknown>>('SELECT * FROM submissions');
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
    run(
      `INSERT OR REPLACE INTO submissions (
        player_id, import_id, comment, requests_monday, requests_tuesday, requests_thursday,
        mon_hours, mon_normal_fc, mon_refined_fc, mon_speedup_days,
        tue_hours, tue_shards, tue_speedup_days,
        thu_hours, thu_speedup_days, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        submission.submitted_at,
      ]
    );
  },

  deleteAllSubmissions: () => {
    run('DELETE FROM submissions');
  },

  // Appointments
  getAppointments: () => {
    return queryAll<Record<string, unknown>>('SELECT * FROM appointments');
  },

  getAppointmentsByDay: (day: string) => {
    return queryAll<Record<string, unknown>>('SELECT * FROM appointments WHERE day = ?', [day]);
  },

  insertAppointment: (appointment: {
    id: string;
    day: string;
    slot: string;
    player_id: string;
    alliance: string;
    score: number;
  }) => {
    run(
      'INSERT INTO appointments (id, day, slot, player_id, alliance, score) VALUES (?, ?, ?, ?, ?, ?)',
      [appointment.id, appointment.day, appointment.slot, appointment.player_id, appointment.alliance, appointment.score]
    );
  },

  updateAppointment: (id: string, updates: { slot?: string; player_id?: string; alliance?: string; score?: number }) => {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.slot !== undefined) { sets.push('slot = ?'); params.push(updates.slot); }
    if (updates.player_id !== undefined) { sets.push('player_id = ?'); params.push(updates.player_id); }
    if (updates.alliance !== undefined) { sets.push('alliance = ?'); params.push(updates.alliance); }
    if (updates.score !== undefined) { sets.push('score = ?'); params.push(updates.score); }

    if (sets.length > 0) {
      params.push(id);
      run(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`, params);
    }
  },

  deleteAppointment: (id: string) => {
    run('DELETE FROM appointments WHERE id = ?', [id]);
  },

  deleteAllAppointments: () => {
    run('DELETE FROM appointments');
  },

  // Waitlist
  getWaitlist: () => {
    return queryAll<Record<string, unknown>>('SELECT * FROM waitlist');
  },

  getWaitlistByDay: (day: string) => {
    return queryAll<Record<string, unknown>>('SELECT * FROM waitlist WHERE day = ?', [day]);
  },

  insertWaitlist: (entry: {
    id: string;
    day: string;
    player_id: string;
    alliance: string;
    score: number;
    reason?: string;
  }) => {
    run(
      'INSERT INTO waitlist (id, day, player_id, alliance, score, reason) VALUES (?, ?, ?, ?, ?, ?)',
      [entry.id, entry.day, entry.player_id, entry.alliance, entry.score, entry.reason || null]
    );
  },

  deleteWaitlist: (id: string) => {
    run('DELETE FROM waitlist WHERE id = ?', [id]);
  },

  deleteAllWaitlist: () => {
    run('DELETE FROM waitlist');
  },

  // Settings
  getSettings: () => {
    const row = queryOne<{ weights: string; updated_at: string }>('SELECT weights, updated_at FROM settings WHERE id = 1');
    if (!row) return null;
    return {
      weights: parseJson(row.weights),
      updated_at: row.updated_at,
    };
  },

  upsertSettings: (settings: { id: number; weights: unknown; updated_at: string }) => {
    run(
      'INSERT OR REPLACE INTO settings (id, weights, updated_at) VALUES (?, ?, ?)',
      [settings.id, toJson(settings.weights), settings.updated_at]
    );
  },

  // Imports
  getImports: () => {
    return queryAll<Record<string, unknown>>('SELECT * FROM imports ORDER BY created_at DESC');
  },

  getLatestImport: () => {
    return queryOne<Record<string, unknown>>('SELECT * FROM imports ORDER BY created_at DESC LIMIT 1');
  },

  insertImport: (imp: { id: string; filename: string; raw_csv: string; row_count: number; created_at: string }) => {
    run(
      'INSERT INTO imports (id, filename, raw_csv, row_count, created_at) VALUES (?, ?, ?, ?, ?)',
      [imp.id, imp.filename, imp.raw_csv, imp.row_count, imp.created_at]
    );
  },

  deleteAllImports: () => {
    run('DELETE FROM imports');
  },
};
