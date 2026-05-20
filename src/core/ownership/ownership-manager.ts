export interface OwnershipState {
  pluginId: string;
  actionId: string;
  tabType: string;
  tabId: string | null;
  acquiredAt: number;
}

export class OwnershipManager {
  private owner: OwnershipState | null = null;

  acquire(pluginId: string, actionId: string, tabType: string, tabId: string | null): boolean {
    if (this.owner) return false;
    this.owner = { pluginId, actionId, tabType, tabId, acquiredAt: Date.now() };
    return true;
  }

  release(pluginId?: string): boolean {
    if (!this.owner) return false;
    if (pluginId && this.owner.pluginId !== pluginId) return false;
    this.owner = null;
    return true;
  }

  getOwner(): OwnershipState | null {
    return this.owner;
  }

  isOwnedBy(pluginId: string): boolean {
    return this.owner?.pluginId === pluginId;
  }

  hasOwner(): boolean {
    return this.owner !== null;
  }

  releaseOnRootTrigger(): void {
    this.owner = null;
  }
}
