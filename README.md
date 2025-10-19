# Multilingual Audio-to-English Transcription Web App

Self-hosted web app to upload large audio files (Hindi, Marathi, English, Gujarati, etc.) and get English transcription using open-source Whisper (faster-whisper) — no paid APIs.

## Features
- React + Tailwind drag-and-drop upload with progress
- Node.js + Express backend with async job processing
- Python transcriber using faster-whisper and ffmpeg chunking
- Auto language detection, translation to English
- Progress polling: e.g., Processing 3/10 chunks
- Handles large audio files (>100MB)

## Prerequisites
- Node.js 18+
- Python 3.9+
- ffmpeg and ffprobe in PATH
- (Optional) GPU + CUDA for faster inference

## Project Structure

```
backend/
  src/
    server.js
    config.js
    routes/
      transcription.js
    jobs/
      manager.js
    utils/
      ffmpeg.js
  uploads/.gitkeep
frontend/
  src/
    main.jsx
    App.jsx
    api.js
    components/
      UploadArea.jsx
      ProgressBar.jsx
    index.css
  index.html
  vite.config.js
  tailwind.config.js
  postcss.config.js
transcriber/
  transcribe.py
  requirements.txt
.env.example
```

## Environment Variables
Copy `.env.example` to `.env` (root) and adjust as needed.

```
PORT=5001
CLIENT_PORT=5173
UPLOAD_DIR=backend/uploads
CHUNK_SECONDS=600
MODEL_SIZE=medium
DEVICE=auto
NUM_WORKERS=2
```

Notes:
- `DEVICE=auto` lets the Python script choose CUDA if available else CPU.
- `MODEL_SIZE` can be tiny, base, small, medium, large-v3 (ensure enough VRAM/RAM).

## Setup & Run (Windows PowerShell)

1) Install system deps

```powershell
winget install Gyan.FFmpeg
python -m pip install --upgrade pip
```

2) Backend setup

```powershell
cd backend
npm install
cd ..
```

3) Transcriber setup

```powershell
cd transcriber
python -m venv .venv
./.venv/Scripts/Activate.ps1
pip install -r requirements.txt
cd ..
```

4) Frontend setup

```powershell
cd frontend
npm install
cd ..
```

5) Start servers (two terminals)

- Terminal A (backend):
```powershell
$env:$(Get-Content .env | Where-Object {$_ -match "^PORT|^UPLOAD_DIR|^CHUNK_SECONDS|^NUM_WORKERS"} | ForEach-Object {$_ -replace "=","='"} | ForEach-Object {$_ + "'"}) > $null
cd backend
npm run dev
```

- Terminal B (frontend):
```powershell
$env:$(Get-Content .env | Where-Object {$_ -match "^CLIENT_PORT"} | ForEach-Object {$_ -replace "=","='"} | ForEach-Object {$_ + "'"}) > $null
cd frontend
npm run dev
```

- Transcriber Python venv must be activated before starting backend the first time to prime model download.

6) Usage
- Open http://localhost:5173
- Drag and drop audio, see upload progress
- After upload, processing starts; polling shows `Processing x/y`
- When done, copy or download the English text

## Manual Transcriber Usage vs Frontend Flow

- **When you DO NOT run manually**
  - Using the frontend upload flow. The backend automatically spawns `transcriber/transcribe.py` on upload via `createJob()` in `backend/src/jobs/manager.js`. No venv activation needed at runtime.

- **When you MAY run manually**
  - Testing or debugging the transcriber without the web app.
  - Priming first-time model download/caching.
  - Batch/offline processing of a local file.

### Commands (Windows PowerShell)

- **Prerequisites (once)**
```powershell
winget install Gyan.FFmpeg
python -m venv transcriber\.venv
transcriber\.venv\Scripts\Activate.ps1
pip install -r transcriber\requirements.txt
```

- **Manual run (example)**
```powershell
# From repo root
python transcriber\transcribe.py --input "D:\audiooo\harvard.wav" --chunk-seconds 60 --model-size small --device auto
```

- **Optional (CUDA forced or local model path)**
```powershell
python transcriber\transcribe.py --input "D:\audiooo\harvard.wav" --device cuda --model-path "C:\models\faster-whisper\medium"
```

- **Deactivate venv**
```powershell
deactivate
```

## Notes on Large Files
- The backend uses ffmpeg to split long audio into `CHUNK_SECONDS` segments and processes each sequentially in the Python worker, streaming progress back to the backend.
- For very large files, ensure sufficient disk space in `UPLOAD_DIR`.

## Troubleshooting
- Ensure `ffmpeg` and `ffprobe` are in PATH: `ffmpeg -version`, `ffprobe -version`.
- CPU-only will be slow on large models; use `MODEL_SIZE=small` or `base` on CPU.
- For CUDA, ensure compatible PyTorch + CUDA toolkit are installed per PyTorch docs.

## License
MIT


