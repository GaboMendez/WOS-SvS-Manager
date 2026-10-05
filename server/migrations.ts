import { createClient } from '@libsql/client';
import { DB_PATH } from './path.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get migrations directory
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface Migration {
  name: string;
  sql: string;
}

function getMigrations(): Migration[] {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => ({
    name: filename.replace('.sql', ''),
    sql: fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8')
  }));
}

export async function runMigrations() {
  const db = createClient({ url: DB_PATH });

  // Create migrations table if not exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  // Get applied migrations
  const result = await db.execute('SELECT id FROM __migrations');
  const applied = new Set((result.rows as { id: string }[]).map(r => r.id));

  // Get all migration files
  const migrations = getMigrations();

  // Apply pending migrations
  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      console.log(`Applying migration: ${migration.name}`);

      // Split by semicolon and execute each statement
      const statements = migration.sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await db.execute(statement);
      }

      // Record migration
      await db.execute(
        'INSERT INTO __migrations (id, name, applied_at) VALUES (?, ?, ?)',
        [migration.name, migration.name, new Date().toISOString()]
      );

      console.log(`Migration ${migration.name} applied successfully`);
    }
  }

  console.log('All migrations up to date');
}
