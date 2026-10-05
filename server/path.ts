import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check for Turso (libSQL) remote database - takes precedence over local storage
// Both env vars must be set, plus USE_TURSO=1 to enable (for production/remote only)
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const USE_TURSO = process.env.USE_TURSO === '1';

let DB_PATH: string;

if (TURSO_DATABASE_URL && TURSO_AUTH_TOKEN && USE_TURSO) {
  // Use Turso remote database - data persists across deploys
  DB_PATH = TURSO_DATABASE_URL;
} else {
  // Local SQLite file storage
  // Docker uses /app/data, Render uses /var/data (requires persistent disk)
  const dataDir = process.env.DOCKER
    ? '/app/data'
    : process.env.RENDER
      ? '/var/data'
      : path.resolve(__dirname, '../data');

  // Ensure directory exists (for non-Docker environments)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  DB_PATH = `file:${path.join(dataDir, 'wos-svs-manager.db')}`;
}

// Export Turso auth token if set (used by db.ts for remote connections)
export const DB_AUTH_TOKEN = TURSO_AUTH_TOKEN;
export { DB_PATH };
