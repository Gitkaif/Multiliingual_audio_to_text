import express from 'express';
import multer from 'multer';
import path from 'path';
import { ensureUploadDir, UPLOAD_DIR } from '../config.js';
import { createJob, getJob, getJobResult } from '../jobs/manager.js';

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '') || '.wav';
    cb(null, unique + ext);
  }
});

const upload = multer({ storage });

const router = express.Router();

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const jobId = await createJob(req.file.path, req.file.originalname);
    res.json({ jobId });
  } catch (err) {
    console.error('[upload] error', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

router.get('/status/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({
    status: job.status,
    processedChunks: job.processedChunks,
    totalChunks: job.totalChunks,
    message: job.message || null
  });
});

router.get('/result/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (job.status !== 'completed') return res.status(202).json({ status: job.status });
  const result = getJobResult(req.params.id);
  res.json({ text: result });
});

export default router;


