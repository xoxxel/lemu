import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

interface AiderRequest {
  filePath: string;
  instructions: string;
  currentContent: string;
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface AiderResult {
  success: boolean;
  patches: Array<{ range: { start: number; end: number }; oldText: string; newText: string }>;
  explanation?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  timedOut?: boolean;
}

const AIDER_TIMEOUT_MS = 90_000;
const SIGKILL_GRACE_MS = 5_000;

const lineOffsets = (text: string): number[] => {
  const offsets: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') offsets.push(i + 1);
  }
  offsets.push(text.length);
  return offsets;
};

function computePatchesFromDiff(original: string, modified: string): Array<{ range: { start: number; end: number }; oldText: string; newText: string }> {
  if (original === modified) return [];

  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const m = origLines.length;
  const n = modLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (origLines[i] === modLines[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const patches: Array<{ range: { start: number; end: number }; oldText: string; newText: string }> = [];
  const offsets = lineOffsets(original);
  let i = 0, j = 0;
  let origLineNum = 1, newLineNum = 1;

  while (i < m || j < n) {
    if (i < m && j < n && origLines[i] === modLines[j]) {
      i++; j++; origLineNum++; newLineNum++;
      continue;
    }
    const hunkOrigStart = origLineNum;
    let origCount = 0, newCount = 0;
    while (i < m && j < n && origLines[i] !== modLines[j]) {
      const takeOrig = j === n || (i < m && (j === n || dp[i + 1][j] >= dp[i][j + 1]));
      if (takeOrig) { i++; origLineNum++; origCount++; }
      else { j++; newLineNum++; newCount++; }
    }
    while (i < m && (j === n || dp[i + 1][j] >= dp[i][j + 1])) {
      i++; origLineNum++; origCount++;
    }
    while (j < n && (i === m || dp[i][j + 1] > dp[i + 1][j])) {
      j++; newLineNum++; newCount++;
    }
    if (origCount > 0 || newCount > 0) {
      const start = offsets[hunkOrigStart - 1];
      const end = offsets[hunkOrigStart - 1 + origCount];
      const newOffsetsRaw = lineOffsets(modified);
      const newStartIdx = Math.min(newCount > 0 ? hunkOrigStart - 1 : offsets.length - 1, newOffsetsRaw.length - 1);
      const newEndIdx = Math.min(hunkOrigStart - 1 + newCount, newOffsetsRaw.length - 1);
      patches.push({
        range: { start, end: origCount === 0 ? start : end },
        oldText: original.slice(start, end),
        newText: newCount > 0 ? modified.slice(newOffsetsRaw[newStartIdx], newOffsetsRaw[newEndIdx]) : '',
      });
    }
  }
  return patches;
}

function getAiderEnv(providerId?: string): Record<string, string> {
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  const apiKey = process.env.VITE_LEMU_AI_API_KEY || '';
  const endpoint = process.env.VITE_LEMU_AI_ENDPOINT || '';
  if (providerId === 'openai' || !providerId) {
    if (apiKey) env.OPENAI_API_KEY = apiKey;
    if (endpoint) env.OPENAI_API_BASE = endpoint;
  }
  if (providerId === 'anthropic') {
    if (apiKey) env.ANTHROPIC_API_KEY = apiKey;
  }
  return env;
}

function getAiderModel(providerId?: string, model?: string): string {
  if (model) return model;
  if (providerId === 'ollama') return 'ollama/qwen2.5-coder:7b';
  if (providerId === 'anthropic') return 'claude-sonnet-4-20250514';
  return 'gpt-4o';
}

function runAiderProcess(
  tmpFile: string,
  instructions: string,
  model: string,
  env: Record<string, string>,
  cwd: string,
  temperature?: number,
): { promise: Promise<{ stdout: string; stderr: string; timedOut: boolean }>; cancel(): void } {
  const args = [
    'aider',
    '--message', instructions,
    '--file', tmpFile,
    '--no-git',
    '--yes',
    '--no-suggest-shell-commands',
    '--no-auto-commits',
    '--model', model,
  ];
  if (temperature !== undefined) args.push('--temperature', String(temperature));

  let child = spawn('npx', args, {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let timedOut = false;
  let killed = false;
  let stdout = '';
  let stderr = '';

  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    killed = true;
    child.kill('SIGTERM');
    setTimeout(() => {
      try { if (!child.killed) child.kill('SIGKILL'); } catch {}
    }, SIGKILL_GRACE_MS);
  }, AIDER_TIMEOUT_MS);

  const promise = new Promise<{ stdout: string; stderr: string; timedOut: boolean }>((resolve) => {
    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('error', () => {
      clearTimeout(timeoutHandle);
      resolve({ stdout, stderr, timedOut });
    });

    child.on('exit', () => {
      clearTimeout(timeoutHandle);
      resolve({ stdout, stderr, timedOut });
    });
  });

  return {
    promise,
    cancel() {
      if (!killed) {
        killed = true;
        clearTimeout(timeoutHandle);
        child.kill('SIGTERM');
        setTimeout(() => {
          try { if (!child.killed) child.kill('SIGKILL'); } catch {}
        }, SIGKILL_GRACE_MS);
      }
    },
  };
}

export async function runAider(req: AiderRequest): Promise<AiderResult> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lemu-aider-'));
  const fileName = path.basename(req.filePath);
  const tmpFile = path.join(tmpDir, fileName);

  let cancelled = false;

  try {
    await fs.writeFile(tmpFile, req.currentContent, 'utf-8');

    const model = getAiderModel(req.providerId, req.model);
    const env = getAiderEnv(req.providerId);

    const { promise, cancel } = runAiderProcess(
      tmpFile, req.instructions, model, env, tmpDir, req.temperature,
    );

    if (req.signal) {
      req.signal.addEventListener('abort', cancel, { once: true });
    }

    const { stdout, stderr, timedOut } = await promise;

    if (req.signal?.aborted) {
      cancelled = true;
      return {
        success: false,
        patches: [],
        error: 'Aider cancelled by user',
        timedOut: false,
        metadata: { cancelled: true },
      };
    }

    if (timedOut) {
      return {
        success: false,
        patches: [],
        error: `Aider timed out after ${AIDER_TIMEOUT_MS / 1000}s`,
        timedOut: true,
        metadata: { model, providerId: req.providerId || 'openai', timeout: AIDER_TIMEOUT_MS },
      };
    }

    /* ── Single-file audit: verify only the expected file was modified ── */
    const tmpFiles = await fs.readdir(tmpDir);
    const unexpectedFiles = tmpFiles.filter(f => f !== fileName && f !== '.aider');
    if (unexpectedFiles.length > 0) {
      return {
        success: false,
        patches: [],
        error: `Aider created/modified unexpected file(s): ${unexpectedFiles.join(', ')}. Only single-file edits are allowed.`,
        metadata: { model, providerId: req.providerId || 'openai', rejectedMutation: 'multi-file' },
      };
    }

    const modified = await fs.readFile(tmpFile, 'utf-8');
    const patches = computePatchesFromDiff(req.currentContent, modified);

    return {
      success: patches.length > 0,
      patches,
      explanation: stdout.slice(0, 2000),
      metadata: {
        model,
        providerId: req.providerId || 'openai',
        stderr: stderr.slice(0, 500),
      },
    };
  } catch (err) {
    if (cancelled) {
      return { success: false, patches: [], error: 'Aider cancelled', timedOut: false };
    }
    return {
      success: false,
      patches: [],
      error: `Aider error: ${err instanceof Error ? err.message : String(err)}`,
      timedOut: false,
    };
  } finally {
    await fs.remove(tmpDir).catch(() => {});
  }
}

export async function checkAiderAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['aider', '--version'], {
      stdio: 'pipe',
      timeout: 10000,
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve(false);
    }, 10000);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
