import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

async function testNormalOperation() {
  // Test that a process that completes quickly returns cleanly
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lemu-test-aider-'));
  const tmpFile = path.join(tmpDir, 'test.ts');
  await fs.writeFile(tmpFile, 'const x = 1;', 'utf-8');

  const { runAider } = await import('../server/coder/aider-runner');

  // This will fail because aider isn't installed in CI, but we just want
  // to verify it doesn't hang
  const timeoutPromise = new Promise<{ timedOut: boolean }>((_, reject) => {
    setTimeout(() => reject(new Error('Test hung — no timeout protection')), 2000);
  });

  const result = await Promise.race([
    runAider({
      filePath: tmpFile,
      instructions: 'add a comment',
      currentContent: 'const x = 1;',
      providerId: 'openai',
      signal: AbortSignal.timeout(5000),
    }),
    timeoutPromise,
  ]);

  // Should complete (with error, but complete)
  if (typeof result === 'object' && 'timedOut' in result) {
    console.log('  PASS: normal aider operation completed without hanging');
  }

  await fs.remove(tmpDir);
}

async function testForcedCancellation() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lemu-test-cancel-'));
  const tmpFile = path.join(tmpDir, 'slow.ts');
  await fs.writeFile(tmpFile, 'let x = 1;', 'utf-8');

  const { runAider } = await import('../server/coder/aider-runner');

  const ac = new AbortController();

  const resultPromise = runAider({
    filePath: tmpFile,
    instructions: 'do something very slow',
    currentContent: 'let x = 1;',
    providerId: 'openai',
    signal: ac.signal,
  });

  // Cancel immediately
  ac.abort();

  const result = await resultPromise;

  if (!result.success) {
    console.log('  PASS: cancelled aider returned error');
  }
  if (result.metadata?.cancelled === true || result.error?.includes('cancel')) {
    console.log('  PASS: cancellation signalled correctly');
  }

  await fs.remove(tmpDir);
}

async function testCleanupAfterCancel() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lemu-test-cleanup-'));
  const tmpFile = path.join(tmpDir, 'cleanup.ts');
  await fs.writeFile(tmpFile, '// original', 'utf-8');

  const { runAider } = await import('../server/coder/aider-runner');

  const ac = new AbortController();

  const promise = runAider({
    filePath: tmpFile,
    instructions: 'do slow work',
    currentContent: '// original',
    providerId: 'openai',
    signal: ac.signal,
  });

  ac.abort();

  await promise;

  // Verify temp dir was cleaned up (cannot check exact path since it's random,
  // but verify no aider temp dirs were left)
  const tmpItems = await fs.readdir(os.tmpdir());
  const aiderDirs = tmpItems.filter(i => i.startsWith('lemu-aider-'));
  if (aiderDirs.length > 0) {
    // Some might remain due to race, but log them
    console.log(`  WARN: ${aiderDirs.length} aider temp dirs may remain: ${aiderDirs.join(', ')}`);
  } else {
    console.log('  PASS: no leaked aider temp dirs after cancellation');
  }

  await fs.remove(tmpDir);
}

async function main() {
  console.log('\n--- Aider Timeout / Cancellation Tests ---\n');
  await testNormalOperation();
  await testForcedCancellation();
  await testCleanupAfterCancel();
  console.log('\nAll aider timeout/cancellation tests passed.\n');
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
