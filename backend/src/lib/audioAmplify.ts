import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { inboundTrace } from './inboundTrace.js';

function ffmpegBinary(): string {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) return fromEnv;
  return ffmpegInstaller.path;
}

function parseGainDb(): number {
  const raw = process.env.TTS_AUDIO_GAIN_DB?.trim();
  if (!raw) return 8;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 8;
  return Math.min(18, Math.max(0, n));
}

export function isAudioAmplifyEnabled(): boolean {
  return process.env.TTS_AUDIO_NORMALIZE !== '0';
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBinary(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-500) || `ffmpeg exit ${code}`));
    });
  });
}

/**
 * Aumenta volume do MP3 antes de enviar à Evolution (nota de voz WhatsApp).
 * Requer `ffmpeg` no PATH (mesmo que a Evolution usa para converter áudio).
 */
export async function amplifySpeechMp3(buffer: Buffer): Promise<Buffer> {
  if (!isAudioAmplifyEnabled() || !buffer.length) return buffer;

  const gainDb = parseGainDb();
  const id = randomUUID();
  const inPath = join(tmpdir(), `prestei-tts-in-${id}.mp3`);
  const outPath = join(tmpdir(), `prestei-tts-out-${id}.mp3`);

  try {
    await writeFile(inPath, buffer);
    // loudnorm deixa nível de voz consistente; volume extra compensa MP3 baixo da API + Opus no WhatsApp
    await runFfmpeg([
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      inPath,
      '-af',
      `loudnorm=I=-14:TP=-1.5:LRA=11,volume=${gainDb}dB`,
      '-ar',
      '48000',
      '-ac',
      '1',
      '-c:a',
      'libmp3lame',
      '-q:a',
      '2',
      outPath,
    ]);

    const { readFile } = await import('fs/promises');
    const out = await readFile(outPath);
    inboundTrace('tts.amplify.ok', { gainDb, inBytes: buffer.length, outBytes: out.length });
    return out.length > 0 ? out : buffer;
  } catch (err: unknown) {
    inboundTrace('tts.amplify.skip', {
      reason: err instanceof Error ? err.message : String(err),
    });
    return buffer;
  } finally {
    await Promise.allSettled([unlink(inPath), unlink(outPath)]);
  }
}
