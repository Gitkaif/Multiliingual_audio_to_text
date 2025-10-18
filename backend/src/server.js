import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import transcriptionRouter from './routes/transcription.js';
import { PORT } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: '*'}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', transcriptionRouter);

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});


