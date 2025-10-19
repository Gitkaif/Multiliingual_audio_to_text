import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHUNK_SECONDS, MODEL_SIZE, DEVICE } from '../config.js';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jobs = new Map();
const results = new Map();

export function getJob(id) {
  return jobs.get(id) || null;
}

export function getJobResult(id) {
  return results.get(id) || '';
}

function resolvePythonBin() {
  // Prefer local venv inside transcriber
  const rootDir = path.resolve(__dirname, '../../..');
  const winVenv = path.join(rootDir, 'transcriber', '.venv', 'Scripts', 'python.exe');
  const nixVenv = path.join(rootDir, 'transcriber', '.venv', 'bin', 'python');
  if (process.platform === 'win32' && fs.existsSync(winVenv)) return winVenv;
  if (fs.existsSync(nixVenv)) return nixVenv;
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  return 'python';
}

export async function createJob(inputPath, originalName = '') {
  const id = nanoid();
  const job = {
    id,
    status: 'queued',
    processedChunks: 0,
    totalChunks: 0,
    message: 'Queued',
    originalName
  };
  jobs.set(id, job);

  const py = resolvePythonBin();
  const scriptPath = path.resolve(__dirname, '../../..', 'transcriber', 'transcribe.py');

  const args = [
    scriptPath,
    '--input', inputPath,
    '--chunk-seconds', String(CHUNK_SECONDS),
    '--model-size', MODEL_SIZE,
    '--device', DEVICE
  ];

  // If a local model directory exists at transcriber/models/<MODEL_SIZE>, prefer it
  const localModelDir = path.resolve(__dirname, '../../..', 'transcriber', 'models', MODEL_SIZE);
  try {
    if (fs.existsSync(localModelDir) && fs.statSync(localModelDir).isDirectory()) {
      args.push('--model-path', localModelDir);
    }
  } catch {}

  const child = spawn(py, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(`[backend] spawn transcriber: ${py} ${args.join(' ')}`);
  job.status = 'processing';
  job.message = 'Starting';

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (data) => {
    const lines = String(data).split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const evt = JSON.parse(line);
        if (evt.type === 'progress') {
          job.processedChunks = evt.processed;
          job.totalChunks = evt.total;
          job.message = `Processing ${evt.processed}/${evt.total}`;
        } else if (evt.type === 'error') {
          job.status = 'failed';
          job.message = evt.message || 'Unknown error';
        } else if (evt.type === 'done') {
          results.set(id, evt.text || '');
          job.status = 'completed';
          job.message = 'Completed';
          try {
            if (inputPath && fs.existsSync(inputPath)) {
              fs.unlinkSync(inputPath);
            }
          } catch {}
        } else if (evt.type === 'init') {
          job.totalChunks = evt.total || 0;
          job.message = 'Initialized';
        }
      } catch (e) {
        // ignore non-JSON lines
      }
    }
  });

  let stderrBuf = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (data) => {
    const s = String(data);
    stderrBuf += s;
    // Keep latest stderr line as a hint, but don't clobber a clearer JSON error message if already set
    if (!job.message || job.message === 'Starting' || /^Processing \d+\/\d+$/.test(job.message)) {
      job.message = s.trim();
    }
  });

  // Surface spawn errors (e.g., missing python executable) directly
  child.on('error', (err) => {
    job.status = 'failed';
    job.message = `Spawn error: ${err?.message || String(err)}`;
  });

  child.on('close', (code) => {
    // Only mark failed on close if the job never reported an explicit error or completion
    if (job.status === 'processing' || job.status === 'queued') {
      job.status = 'failed';
      const tail = stderrBuf.split(/\r?\n/).slice(-4).join(' | ');
      job.message = (tail && tail.trim()) || job.message || `Exited with code ${code}`;
    }
  });

  return id;
}


