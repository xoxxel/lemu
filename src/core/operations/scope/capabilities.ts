import type { ScopeNodeType, ScopeNode, ScopeCapability } from './types';
import { scopeNodeType } from './types';

export class ScopeCapabilityRegistry {
  private entries = new Map<string, ScopeCapability>();

  register(operationType: string, supportedScopes: ScopeNodeType[]): void {
    this.entries.set(operationType, { operationType, supportedScopes });
  }

  get(operationType: string): ScopeCapability | undefined {
    return this.entries.get(operationType);
  }

  isSupported(operationType: string, scopeType: ScopeNodeType): boolean {
    const cap = this.entries.get(operationType);
    if (!cap) return scopeType === 'document';
    return cap.supportedScopes.includes(scopeType);
  }

  assertSupported(operationType: string, scopeNode: ScopeNode): string | null {
    const cap = this.entries.get(operationType);
    if (!cap) return null;
    const st = scopeNodeType(scopeNode);
    if (!cap.supportedScopes.includes(st)) {
      const allowed = cap.supportedScopes.join(', ');
      return `Operation '${operationType}' does not support scope '${st}'. Supported scopes: ${allowed}`;
    }
    return null;
  }

  getAll(): ScopeCapability[] {
    return Array.from(this.entries.values());
  }

  remove(operationType: string): void {
    this.entries.delete(operationType);
  }
}
