import type { PluginAction } from './types'

export class ActionRegistry {
  private perType = new Map<string, PluginAction[]>()
  private global: PluginAction[] = []

  register(type: string, action: PluginAction) {
    if (type === '*') {
      this.global.push(action)
      return
    }
    const list = this.perType.get(type) || []
    list.push(action)
    this.perType.set(type, list)
  }

  getForType(type: string): PluginAction[] {
    const typeActions = this.perType.get(type) || []
    return [...this.global, ...typeActions]
  }

  findByTypeAndId(type: string, id: string): PluginAction | undefined {
    const typeAction = this.perType.get(type)?.find(a => a.id === id)
    if (typeAction) return typeAction
    return this.global.find(a => a.id === id)
  }

  getAllForType(type: string): PluginAction[] {
    return [...this.global, ...(this.perType.get(type) || [])]
  }
}
