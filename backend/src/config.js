import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables if a .env exists at project root
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve paths relative to this module location (backend/src)
const BACKEND_ROOT = path.resolve(__dirname, '..');

export const PORT = Number(process.env.PORT || 5001);
export const CHUNK_SECONDS = Number(process.env.CHUNK_SECONDS || 600);
export const MODEL_SIZE = process.env.MODEL_SIZE || 'small';
export const DEVICE = process.env.DEVICE || 'auto';

// Default upload dir to backend/uploads unless overridden
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || path.join(BACKEND_ROOT, 'uploads')
);

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}


