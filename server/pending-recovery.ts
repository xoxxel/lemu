import fs from 'fs-extra';
import path from 'path';

const LEMU_DIR = '.lemu';
const PENDING_FILE = 'pending.json';

export interface PendingEntry {
  transactionId: string;
  filePath: string;
  tmpPath?: string;
  timestamp: number;
  status: 'pending-write' | 'committed';
}

function getPendingPath(workspace: string): string {
  return path.join(workspace, LEMU_DIR, PENDING_FILE);
}

export async function ensurePendingDir(workspace: string): Promise<void> {
  await fs.ensureDir(path.join(workspace, LEMU_DIR));
}

export async function addPendingEntry(workspace: string, entry: PendingEntry): Promise<void> {
  await ensurePendingDir(workspace);
  const p = getPendingPath(workspace);
  let existing: PendingEntry[] = [];
  try {
    const raw = await fs.readFile(p, 'utf-8');
    existing = JSON.parse(raw);
  } catch {}
  existing.push(entry);
  await fs.writeFile(p, JSON.stringify(existing, null, 2), 'utf-8');
}

export async function removePendingEntry(workspace: string, transactionId: string): Promise<void> {
  const p = getPendingPath(workspace);
  try {
    const raw = await fs.readFile(p, 'utf-8');
    const entries: PendingEntry[] = JSON.parse(raw);
    const filtered = entries.filter(e => e.transactionId !== transactionId);
    if (filtered.length === 0) {
      await fs.remove(p).catch(() => {});
    } else {
      await fs.writeFile(p, JSON.stringify(filtered, null, 2), 'utf-8');
    }
  } catch {}
}

export async function getUnresolvedEntries(workspace: string): Promise<PendingEntry[]> {
  const p = getPendingPath(workspace);
  try {
    const raw = await fs.readFile(p, 'utf-8');
    const entries: PendingEntry[] = JSON.parse(raw);
    return entries.filter(e => e.status === 'pending-write');
  } catch {
    return [];
  }
}

export async function clearAllPending(workspace: string): Promise<void> {
  const p = getPendingPath(workspace);
  await fs.remove(p).catch(() => {});
}
