import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use local SQLite for development, Turso for production
export const DB_PATH = process.env.TURSO_DATABASE_URL || `file:${path.resolve(__dirname, '../data/wos.db')}`;
