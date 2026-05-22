import fs from 'fs-extra';
import path from 'path';
import os from 'os';

async function testAtomicWriteRoundTrip() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lemu-test-atomic-'));
  const filePath = path.join(tmpDir, 'test.txt');

  const { writeAtomic } = await import('../server/fs-atomic');

  // Normal write
  await writeAtomic(filePath, 'hello world');
  const content = await fs.readFile(filePath, 'utf-8');
  if (content !== 'hello world') throw new Error(`Expected 'hello world', got '${content}'`);
  console.log('  PASS: atomic write round-trip');

  // Overwrite
  await writeAtomic(filePath, 'updated content');
  const updated = await fs.readFile(filePath, 'utf-8');
  if (updated !== 'updated content') throw new Error(`Expected 'updated content', got '${updated}'`);
  console.log('  PASS: atomic overwrite');

  // No .lemu-tmp left behind
  const entries = await fs.readdir(tmpDir);
  const tmpFiles = entries.filter(e => e.endsWith('.lemu-tmp'));
  if (tmpFiles.length > 0) throw new Error(`Orphan tmp files: ${tmpFiles.join(', ')}`);
  console.log('  PASS: no orphan tmp files after clean write');

  await fs.remove(tmpDir);
}

async function testOrphanCleanup() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lemu-test-orphan-'));
  const subDir = path.join(tmpDir, 'sub');
  await fs.ensureDir(subDir);

  // Create orphan tmp files
  await fs.writeFile(path.join(tmpDir, 'stray.lemu-tmp'), 'orphan');
  await fs.writeFile(path.join(tmpDir, 'keep.txt'), 'keep me');
  await fs.writeFile(path.join(subDir, 'nested.lemu-tmp'), 'nested orphan');
  await fs.writeFile(path.join(subDir, 'normal.js'), 'ok');

  const { cleanupOrphanTempFiles } = await import('../server/fs-atomic');
  const cleaned = await cleanupOrphanTempFiles(tmpDir);

  if (cleaned.length !== 2) throw new Error(`Expected 2 cleaned files, got ${cleaned.length}: ${cleaned.join(', ')}`);
  console.log('  PASS: orphan cleanup found and removed 2 files');

  // Verify orphans gone, real files remain
  const rootEntries = await fs.readdir(tmpDir);
  if (rootEntries.includes('stray.lemu-tmp')) throw new Error('stray.lemu-tmp not cleaned');
  if (!rootEntries.includes('keep.txt')) throw new Error('keep.txt was removed');

  const subEntries = await fs.readdir(subDir);
  if (subEntries.includes('nested.lemu-tmp')) throw new Error('nested.lemu-tmp not cleaned');
  if (!subEntries.includes('normal.js')) throw new Error('normal.js was removed');

  console.log('  PASS: orphans removed, non-orphan files preserved');

  await fs.remove(tmpDir);
}

async function testInterruptedWrite() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lemu-test-interrupt-'));
  const filePath = path.join(tmpDir, 'target.txt');

  // Simulate crash mid-write: write .lemu-tmp but crash before rename
  const tmp = filePath + '.lemu-tmp';
  await fs.writeFile(tmp, 'crash content', 'utf-8');

  // On recovery, cleanup should remove the orphan
  const { cleanupOrphanTempFiles } = await import('../server/fs-atomic');
  const cleaned = await cleanupOrphanTempFiles(tmpDir);

  if (cleaned.length !== 1) throw new Error(`Expected 1 cleaned orphan, got ${cleaned.length}`);
  console.log('  PASS: interrupted write orphan cleaned');

  // Target file should NOT exist (write never completed)
  if (await fs.pathExists(filePath)) throw new Error('target.txt should not exist after interrupted write');
  console.log('  PASS: target file does not exist after interrupted write');

  // No tmp file left
  if (await fs.pathExists(tmp)) throw new Error('tmp file should have been cleaned');
  console.log('  PASS: no tmp file remains after cleanup');

  await fs.remove(tmpDir);
}

async function main() {
  console.log('\n--- Atomic Write Tests ---\n');
  await testAtomicWriteRoundTrip();
  await testOrphanCleanup();
  await testInterruptedWrite();
  console.log('\nAll atomic write tests passed.\n');
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
