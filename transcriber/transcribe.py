import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from loguru import logger


def run(cmd):
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{proc.stderr}")
    return proc.stdout


def probe_duration_seconds(input_path: str) -> float:
    out = run([
        'ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', input_path
    ]).strip()
    try:
        return float(out)
    except Exception:
        return 0.0


def split_audio(input_path: str, chunk_seconds: int, work_dir: str) -> list[str]:
    duration = probe_duration_seconds(input_path)
    if duration <= 0:
        duration = 0
    num_chunks = max(1, math.ceil(duration / float(chunk_seconds))) if chunk_seconds > 0 else 1

    chunk_paths: list[str] = []
    if num_chunks == 1:
        # Convert to wav mono 16k for consistency
        out_path = os.path.join(work_dir, 'chunk_000.wav')
        run(['ffmpeg', '-y', '-i', input_path, '-ac', '1', '-ar', '16000', out_path])
        chunk_paths.append(out_path)
        return chunk_paths

    for idx in range(num_chunks):
        start = idx * chunk_seconds
        out_path = os.path.join(work_dir, f'chunk_{idx:03d}.wav')
        run([
            'ffmpeg', '-y', '-ss', str(start), '-t', str(chunk_seconds), '-i', input_path,
            '-ac', '1', '-ar', '16000', out_path
        ])
        chunk_paths.append(out_path)
    return chunk_paths


def choose_device(device_arg: str) -> str:
    if device_arg and device_arg != 'auto':
        return device_arg
    # simple heuristic: if CUDA_VISIBLE_DEVICES is set or nvidia-smi exists, pick cuda
    if shutil.which('nvidia-smi') is not None:
        return 'cuda'
    return 'cpu'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--chunk-seconds', type=int, default=600)
    parser.add_argument('--model-size', default='small')
    parser.add_argument('--model-path', default=None, help='Local path to a faster-whisper model directory')
    parser.add_argument('--device', default='auto')
    parser.add_argument('--task', default='translate', choices=['transcribe', 'translate'])
    parser.add_argument('--language', default=None, help='ISO 639-1 language code (e.g., en, hi, mr). Omit for autodetect')
    args = parser.parse_args()

    device = choose_device(args.device)

    work_dir = tempfile.mkdtemp(prefix='whisper_chunks_')
    try:
        chunks = split_audio(args.input, args.chunk_seconds, work_dir)
        total = len(chunks)
        print(json.dumps({ 'type': 'init', 'total': total }), flush=True)

        # Lazy import after potential CUDA device selection
        from faster_whisper import WhisperModel

        model_ref = args.model_path if args.model_path else args.model_size
        model = WhisperModel(model_ref, device=device, compute_type="float16" if device == 'cuda' else 'int8')
        all_text: list[str] = []

        for i, chunk_path in enumerate(chunks, start=1):
            segments, info = model.transcribe(
                chunk_path,
                task=args.task,
                language=args.language,
                beam_size=3
            )
            text_parts = [seg.text for seg in segments]
            all_text.append(' '.join(text_parts).strip())
            print(json.dumps({ 'type': 'progress', 'processed': i, 'total': total }), flush=True)

        final_text = '\n'.join(t for t in all_text if t)
        print(json.dumps({ 'type': 'done', 'text': final_text }), flush=True)
    except Exception as e:
        err = str(e)
        print(json.dumps({ 'type': 'error', 'message': err }), flush=True)
        sys.exit(1)
    finally:
        try:
            shutil.rmtree(work_dir, ignore_errors=True)
        except Exception:
            pass


if __name__ == '__main__':
    main()


