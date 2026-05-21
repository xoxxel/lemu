import { execSync } from 'child_process';
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
}

interface AiderResult {
  success: boolean;
  patches: Array<{ range: { start: number; end: number }; oldText: string; newText: string }>;
  explanation?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

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
      const oldText = original.slice(start, end);

      const newOffsets = lineOffsets(modified);
      const newStartOffset = newOffsets[hunkOrigStart - 1 + origCount - origCount];
      const newEndOffset = newOffsets[hunkOrigStart - 1 + origCount - origCount + newCount];
      const newText = modified.slice(
        newOffsets[Math.min(hunkOrigStart - 1, newOffsets.length - 1)],
        newOffsets[Math.min(hunkOrigStart - 1 + newCount, newOffsets.length - 1)]
      );

      patches.push({
        range: { start, end: origCount === 0 ? start : end },
        oldText,
        newText,
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

export async function runAider(req: AiderRequest): Promise<AiderResult> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lemu-aider-'));
  const fileName = path.basename(req.filePath);
  const tmpFile = path.join(tmpDir, fileName);

  try {
    await fs.writeFile(tmpFile, req.currentContent, 'utf-8');

    const model = getAiderModel(req.providerId, req.model);
    const env = getAiderEnv(req.providerId);

    const args = [
      '--message', req.instructions,
      '--file', tmpFile,
      '--no-git',
      '--yes',
      '--no-suggest-shell-commands',
      '--no-auto-commits',
      '--model', model,
    ];

    if (req.temperature !== undefined) {
      args.push('--temperature', String(req.temperature));
    }

    let stdout = '';
    let stderr = '';

    try {
      const result = execSync(`npx aider ${args.join(' ')}`, {
        cwd: tmpDir,
        env,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      stdout = result;
    } catch (err) {
      const execErr = err as {
        stdout?: string;
        stderr?: string;
        message: string;
      };
      stdout = execErr.stdout || '';
      stderr = execErr.stderr || execErr.message;
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
    return {
      success: false,
      patches: [],
      error: `Aider error: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    await fs.remove(tmpDir).catch(() => {});
  }
}

export async function checkAiderAvailable(): Promise<boolean> {
  try {
    execSync('npx aider --version', {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}
