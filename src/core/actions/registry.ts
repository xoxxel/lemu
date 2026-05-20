import type { PluginAction } from './types'

export class ActionRegistry {
  private perType = new Map<string, PluginAction[]>()
  private global: PluginAction[] = []

  register(type: string, action: PluginAction) {
    const exists = (arr: PluginAction[]) => arr.some(a => a.id === action.id)
    if (type === '*') {
      if (exists(this.global)) return
      this.global.push(action)
      return
    }
    const list = this.perType.get(type) || []
    if (exists(list)) return
    list.push(action)
    this.perType.set(type, list)
  }

  /** All actions registered for a type INCLUDING global. Use only when merging is correct. */
  getForType(type: string): PluginAction[] {
    const typeActions = this.perType.get(type) || []
    return [...this.global, ...typeActions]
  }

  /** Only global/system actions (type = '*'). Never includes scoped actions. */
  getGlobal(): PluginAction[] {
    return [...this.global]
  }

  /** Only actions registered for this specific type. Never includes global actions. */
  getScoped(type: string): PluginAction[] {
    return [...(this.perType.get(type) || [])]
  }

  /** Search global scope first, then type-specific. Use only when fallthrough is correct. */
  findByTypeAndId(type: string, id: string): PluginAction | undefined {
    const typeAction = this.perType.get(type)?.find(a => a.id === id)
    if (typeAction) return typeAction
    return this.global.find(a => a.id === id)
  }

  /** Only search global scope. Never falls through to scoped. */
  findGlobal(id: string): PluginAction | undefined {
    return this.global.find(a => a.id === id)
  }

  /** Only search scoped actions for the given type. Never falls through to global. */
  findScoped(type: string, id: string): PluginAction | undefined {
    return this.perType.get(type)?.find(a => a.id === id)
  }
}
