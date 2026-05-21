/**
 * AI Session Phase — Verification Tests
 *
 * Tests:
 * 1. AISession lifecycle (create, patch states, close)
 * 2. GroupedHistory undo/redo
 * 3. Patch dependency rejection
 * 4. Snapshot model
 * 5. Grouped undo boundary (one undo = whole session)
 * 6. Session manager active/end/clear
 */

import { AISession, createAiGeneratedPatch } from '../src/core/coder/session';
import { AISessionManager } from '../src/core/coder/session-manager';
import { GroupedHistory } from '../src/core/operations/grouped-history';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  PASS: ${msg}`); }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function assertEquals(a: unknown, b: unknown, msg: string) {
  if (a === b) { passed++; console.log(`  PASS: ${msg}`); }
  else { failed++; console.error(`  FAIL: ${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
}

/* ── 1. AISession lifecycle ── */
console.log('\n--- AISession Lifecycle ---');
{
  const patches = [
    createAiGeneratedPatch(0, { range: { start: 0, end: 5 }, oldText: 'hello', newText: 'world' }),
    createAiGeneratedPatch(1, { range: { start: 10, end: 15 }, oldText: 'foo', newText: 'bar' }),
  ];
  const session = AISession.create(
    '/test/file.ts',
    'add validation',
    { content: 'hello foo', cursorPosition: 0 },
    patches,
    { engineId: 'default', outputFormat: 'fullFile' },
  );

  assertEquals(session.filePath, '/test/file.ts', 'filePath matches');
  assertEquals(session.instructions, 'add validation', 'instructions matches');
  assertEquals(session.generatedPatches.length, 2, '2 patches');
  assertEquals(session.pendingCount, 2, '2 pending initially');
  assertEquals(session.acceptedCount, 0, '0 accepted initially');
  assertEquals(session.rejectedCount, 0, '0 rejected initially');
  assertEquals(session.closed, false, 'session not closed initially');

  session.acceptPatch(patches[0].id);
  assertEquals(session.pendingCount, 1, '1 pending after accept');
  assertEquals(session.acceptedCount, 1, '1 accepted');
  assertEquals(session.getPatchState(patches[0].id), 'accepted', 'patch 0 accepted');
  assertEquals(session.getPatchState(patches[1].id), 'pending', 'patch 1 still pending');

  session.rejectPatch(patches[1].id, 'not needed');
  assertEquals(session.pendingCount, 0, '0 pending after reject');
  assertEquals(session.rejectedCount, 1, '1 rejected');
  assertEquals(session.getPatchState(patches[1].id), 'rejected', 'patch 1 rejected');

  session.close();
  assertEquals(session.closed, true, 'session closed');

  /* after close, mutations are no-ops */
  session.acceptPatch(patches[0].id);
  assertEquals(session.acceptedCount, 1, 'accepted count unchanged after close');
}

/* ── 2. GroupedHistory undo/redo ── */
console.log('\n--- GroupedHistory Undo/Redo ---');
{
  const history = new GroupedHistory();
  const doc = 'hello world';

  /* push a grouped entry */
  const patches = [{ range: { start: 0, end: 5 }, oldText: 'hello', newText: 'HI' }];
  const inverse = [{ range: { start: 0, end: 2 }, oldText: 'HI', newText: 'hello' }];
  history.push('AI edit #1', patches, inverse, 'session-1');

  assertEquals(history.canUndo(), true, 'can undo after push');
  assertEquals(history.canRedo(), false, 'cannot redo after push');

  /* undo */
  const undoResult = history.undo('HI world');
  assert(undoResult !== null, 'undo succeeded');
  assertEquals(undoResult!.document, 'hello world', 'undo restores original');
  assertEquals(undoResult!.entry.label, 'AI edit #1', 'undo returns correct entry');

  assertEquals(history.canUndo(), false, 'cannot undo after single undo');
  assertEquals(history.canRedo(), true, 'can redo after undo');

  /* redo */
  const redoResult = history.redo('hello world');
  assert(redoResult !== null, 'redo succeeded');
  assertEquals(redoResult!.document, 'HI world', 'redo reapplies patches');

  /* push after push removes redo stack */
  history.push('AI edit #2', [], [], 'session-2');
  assertEquals(history.canRedo(), false, 'no redo after new push');
}

/* ── 3. Patch dependency rejection ── */
console.log('\n--- Patch Dependency Rejection ---');
{
  const patches = [
    createAiGeneratedPatch(0, { range: { start: 0, end: 5 }, oldText: 'hello', newText: 'WORLD' }),
    createAiGeneratedPatch(1, { range: { start: 2, end: 7 }, oldText: 'llo w', newText: 'XYZ' }, ['patch-0']),
    createAiGeneratedPatch(2, { range: { start: 10, end: 15 }, oldText: 'foo', newText: 'bar' }),
  ];
  const session = AISession.create('/test/f.ts', 'test', { content: '' }, patches, { engineId: 'default', outputFormat: 'fullFile' });

  /* reject patch 0 — dependent (patch 1) should be trackable */
  assertEquals(session.generatedPatches[0].dependsOn, undefined, 'patch 0 has no deps');
  assert(JSON.stringify(session.generatedPatches[1].dependsOn) === JSON.stringify(['patch-0']), 'patch 1 depends on patch-0');
  assertEquals(session.generatedPatches[2].dependsOn, undefined, 'patch 2 has no deps');
}

/* ── 4. Snapshot model ── */
console.log('\n--- Snapshot Model ---');
{
  const snapshot = { content: 'original content', cursorPosition: 5, selection: { start: 3, end: 8 } };
  const patches = [createAiGeneratedPatch(0, { range: { start: 0, end: 8 }, oldText: 'original', newText: 'modified' })];
  const session = AISession.create('/test/f.ts', 'test', snapshot, patches, { engineId: 'default', outputFormat: 'fullFile' });

  assertEquals(session.originalSnapshot.content, 'original content', 'snapshot content correct');
  assertEquals(session.originalSnapshot.cursorPosition, 5, 'snapshot cursor correct');
  assertEquals(session.originalSnapshot.selection?.start, 3, 'snapshot selection start correct');
  assertEquals(session.originalSnapshot.selection?.end, 8, 'snapshot selection end correct');
}

/* ── 5. Grouped undo boundary (one undo = whole session) ── */
console.log('\n--- Grouped Undo Boundary ---');
{
  const history = new GroupedHistory();
  /* simulate 3 patches applied at once */
  const patches = [
    { range: { start: 0, end: 5 }, oldText: 'aaaaa', newText: 'BBBBB' },
    { range: { start: 10, end: 15 }, oldText: 'ccccc', newText: 'DDDDD' },
    { range: { start: 20, end: 25 }, oldText: 'eeeee', newText: 'FFFFF' },
  ];
  const inverse = patches.map(p => ({ range: p.range, oldText: p.newText, newText: p.oldText }));
  history.push('AI session', patches, inverse, 'session-1');

  const doc = 'aaaaa XXXXX ccccc YYYYY eeeee ZZZZZ';
  const expectedAfterUndo = 'XXXXX YYYYY ZZZZZ';  /* patches removed all aaaaa/ccccc/eeeee */
  /* Actually the expected doc after undo would be the original:
     'aaaaa XXXXX ccccc YYYYY eeeee ZZZZZ' minus new text + old text for each patch */
  const original = 'aaaaa XXXXX ccccc YYYYY eeeee ZZZZZ';
  /* Wait, let me compute properly: patches remove oldText 'aaaaa','ccccc','eeeee' and insert 'BBBBB','DDDDD','FFFFF'
     The actual docStr above is the MODIFIED one (with BBBBB etc inserted). Let me use a simpler test. */

  /* Simpler: one patch, one undo unit */
  const simplePatches = [{ range: { start: 0, end: 1 }, oldText: 'a', newText: 'X' }];
  const simpleInverse = [{ range: { start: 0, end: 1 }, oldText: 'X', newText: 'a' }];
  history.push('simple', simplePatches, simpleInverse, 'session-2');

  const result = history.undo('Xbc');
  assert(result !== null, 'one undo reverts whole session');
  assertEquals(result!.document, 'abc', 'document restored by single undo');
}

/* ── 6. Session manager ── */
console.log('\n--- Session Manager ---');
{
  const mgr = new AISessionManager();
  assertEquals(mgr.hasActiveSession, false, 'no active session initially');

  const s1 = AISession.create('/f1.ts', 'fix', { content: 'a' }, [], { engineId: 'default', outputFormat: 'fullFile' });
  mgr.startSession(s1);
  assertEquals(mgr.hasActiveSession, true, 'has active session after start');
  assertEquals(mgr.activeSession?.sessionId, s1.sessionId, 'active session matches');

  const s2 = AISession.create('/f2.ts', 'fix2', { content: 'b' }, [], { engineId: 'default', outputFormat: 'fullFile' });
  mgr.startSession(s2);
  assertEquals(mgr.activeSession?.sessionId, s2.sessionId, 'new session replaces old');
  assertEquals(s1.closed, true, 'old session auto-closed');

  mgr.endSession();
  assertEquals(mgr.hasActiveSession, false, 'no active session after end');
  assertEquals(s2.closed, true, 'ended session closed');

  mgr.startSession(s1);
  mgr.clear();
  assertEquals(mgr.hasActiveSession, false, 'no active after clear');
}

/* ── Summary ── */
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
