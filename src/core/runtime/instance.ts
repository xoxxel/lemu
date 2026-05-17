import type { Runtime } from './index';

let instance: Runtime | null = null;

export function setRuntime(r: Runtime): void {
  instance = r;
}

export function getRuntime(): Runtime {
  if (!instance) throw new Error('Runtime not initialized');
  return instance;
}
