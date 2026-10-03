import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In Docker, data is stored at /app/data/wos.db
const dataDir = process.env.DOCKER ? '/app/data' : path.resolve(__dirname, '../data');
export const DB_PATH = `file:${path.join(dataDir, 'wos.db')}`;
