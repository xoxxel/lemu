export interface ActionContext {
  tabId: string | null
  tabType: string | null
  tabState: Record<string, unknown>
  pinned: boolean
  pin: () => void
  unpin: () => void
}

export interface PluginAction {
  id: string
  title?: string
  description?: string
  aliases?: string[]
  /** Optional view-type restriction; '*' or omitted means all types */
  type?: string
  handler: (ctx: ActionContext) => string | Promise<string>
}
