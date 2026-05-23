import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(
  process.env.VOICE_CLONES_DIR || path.join(process.cwd(), 'storage', 'voice-clones'),
);

export function voiceCloneDir(userId: string): string {
  return path.join(ROOT, userId);
}

export function voiceCloneSamplePath(userId: string, ext = 'mp3'): string {
  return path.join(voiceCloneDir(userId), `sample.${ext}`);
}

export async function saveVoiceCloneSample(
  userId: string,
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const ext = path.extname(filename).replace(/^\./, '') || 'mp3';
  const dir = voiceCloneDir(userId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = voiceCloneSamplePath(userId, ext);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function readVoiceCloneSample(userId: string): Promise<Buffer | null> {
  const dir = voiceCloneDir(userId);
  try {
    const entries = await fs.readdir(dir);
    const sample = entries.find((f) => f.startsWith('sample.'));
    if (!sample) return null;
    return fs.readFile(path.join(dir, sample));
  } catch {
    return null;
  }
}

export async function deleteVoiceCloneSample(userId: string): Promise<void> {
  try {
    await fs.rm(voiceCloneDir(userId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
