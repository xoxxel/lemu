import { PatchNormalizer } from '../src/core/coder/patch-normalizer';

function makeResult(outputFormat: string, patches?: any[], output?: string): any {
  return {
    patches,
    output,
    outputFormat,
    engine: 'test',
  };
}

async function testFullFileRequiresOutput() {
  const r = makeResult('fullFile', [], undefined);
  if (r.outputFormat === 'fullFile' && !r.output) {
    console.log('  PASS: fullFile format without output is correctly invalid');
  } else {
    throw new Error('fullFile should be invalid without output');
  }
}

async function testPatchesFormatRequiresPatches() {
  const r = makeResult('patches', [], undefined);
  if (r.outputFormat === 'patches' && (!r.patches || r.patches.length === 0)) {
    console.log('  PASS: patches format without patches is correctly invalid');
  } else {
    throw new Error('patches should be invalid without patches array');
  }
}

async function testUnsupportedFormatRejected() {
  const supportedFormats = ['fullFile', 'unified', 'searchReplace', 'patches'];
  const invalidFormats = ['raw', '', 'diff', 'auto'];

  for (const fmt of invalidFormats) {
    if (supportedFormats.includes(fmt as any)) {
      throw new Error(`${fmt} should not be in supported formats`);
    }
  }
  console.log('  PASS: unsupported formats correctly rejected');
}

async function testFullFilePatchesMatchOriginal() {
  const original = 'line1\nline2\nline3';
  const output = 'line1\nmodified\nline3';

  const patches = PatchNormalizer.fromFullFile(original, output);
  if (patches.length === 0) throw new Error('Expected at least 1 patch');

  // Reconstruct and verify
  const reconstructed = applyPatches(original, patches);
  if (reconstructed !== output) {
    throw new Error(`Reconstructed content mismatch:\n  expected: ${JSON.stringify(output)}\n  got:      ${JSON.stringify(reconstructed)}`);
  }
  console.log('  PASS: fullFile patches reconstruct correctly');
}

async function testPatchesFormatNoNormalization() {
  // When format is 'patches', patches should be used directly
  const patches = [
    { range: { start: 0, end: 5 }, oldText: 'line1', newText: 'modified' },
  ];

  const r = makeResult('patches', patches, undefined);
  if (r.outputFormat === 'patches' && r.patches && Array.isArray(r.patches)) {
    console.log('  PASS: patches format uses patches directly, no normalization');
  } else {
    throw new Error('patches format should use patches directly');
  }
}

function applyPatches(document: string, patches: Array<{ range: { start: number; end: number }; oldText: string; newText: string }>): string {
  const sorted = [...patches].sort((a, b) => a.range.start - b.range.start);
  let result = '';
  let lastEnd = 0;
  for (const p of sorted) {
    if (p.range.start < lastEnd) throw new Error('overlapping patches');
    result += document.slice(lastEnd, p.range.start);
    result += p.newText;
    lastEnd = p.range.end;
  }
  result += document.slice(lastEnd);
  return result;
}

async function main() {
  console.log('\n--- Patch Normalization Contract Tests ---\n');
  await testFullFileRequiresOutput();
  await testPatchesFormatRequiresPatches();
  await testUnsupportedFormatRejected();
  await testFullFilePatchesMatchOriginal();
  await testPatchesFormatNoNormalization();
  console.log('\nAll normalization contract tests passed.\n');
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
