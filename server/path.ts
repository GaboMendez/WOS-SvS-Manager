import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Data directory: Docker uses /app/data, Render uses /var/data (persistent disk)
const dataDir = process.env.DOCKER
  ? '/app/data'
  : process.env.RENDER
    ? '/var/data'
    : path.resolve(__dirname, '../data');

// Ensure directory exists (for non-Docker environments)
import fs from 'fs';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const DB_PATH = `file:${path.join(dataDir, 'wos-svs-manager.db')}`;
