import type { CodingResult, CoderEngine } from '../src/core/coder/types';

class MockOwnershipManager {
  owner: { pluginId: string } | null = null;

  acquire(pluginId: string): boolean {
    if (this.owner) return false;
    this.owner = { pluginId };
    return true;
  }

  release(pluginId?: string): boolean {
    if (!this.owner) return false;
    if (pluginId && this.owner.pluginId !== pluginId) return false;
    this.owner = null;
    return true;
  }

  hasOwner(): boolean { return this.owner !== null; }
  isOwnedBy(pluginId: string): boolean { return this.owner?.pluginId === pluginId; }
  getOwner() { return this.owner; }
}

async function testOwnershipReleasedOnSuccess() {
  const ownership = new MockOwnershipManager();

  let owned = false;
  try {
    ownership.acquire('coder', 'coder-command', '', null);
    owned = true;
    // simulate success path
    ownership.release('coder');
    owned = false;
  } finally {
    if (owned) {
      try { ownership.release('coder'); } catch {}
    }
  }

  if (ownership.hasOwner()) throw new Error('Ownership leaked after success');
  console.log('  PASS: ownership released on success');
}

async function testOwnershipReleasedOnException() {
  const ownership = new MockOwnershipManager();

  let owned = false;
  try {
    ownership.acquire('coder', 'coder-command', '', null);
    owned = true;
    // simulate exception before release
    throw new Error('simulated failure');
  } catch {
    // caught
  } finally {
    if (owned) {
      try { ownership.release('coder'); } catch {}
    }
  }

  if (ownership.hasOwner()) throw new Error('Ownership leaked after exception');
  console.log('  PASS: ownership released on exception');
}

async function testOwnershipReleasedOnRejectedPromise() {
  const ownership = new MockOwnershipManager();

  let owned = false;
  try {
    ownership.acquire('coder', 'coder-command', '', null);
    owned = true;
    await Promise.reject(new Error('rejected promise'));
  } catch {
    // caught
  } finally {
    if (owned) {
      try { ownership.release('coder'); } catch {}
    }
  }

  if (ownership.hasOwner()) throw new Error('Ownership leaked after rejected promise');
  console.log('  PASS: ownership released on rejected promise');
}

async function testOwnershipNotLeakedOnEarlyReturn() {
  const ownership = new MockOwnershipManager();

  let owned = false;
  let earlyExit = true;

  try {
    // simulate early return before acquire
    if (earlyExit) {
      // do nothing — just skip acquire
    } else {
      ownership.acquire('coder', 'coder-command', '', null);
      owned = true;
    }
  } finally {
    if (owned) {
      try { ownership.release('coder'); } catch {}
    }
  }

  if (ownership.hasOwner()) throw new Error('Ownership should not be held');
  console.log('  PASS: ownership not acquired on early return');
}

async function main() {
  console.log('\n--- Ownership Cleanup Tests ---\n');
  await testOwnershipReleasedOnSuccess();
  await testOwnershipReleasedOnException();
  await testOwnershipReleasedOnRejectedPromise();
  await testOwnershipNotLeakedOnEarlyReturn();
  console.log('\nAll ownership cleanup tests passed.\n');
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
