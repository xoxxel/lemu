export interface ActionContext {
  tabId: string | null
  tabType: string | null
  tabState: Record<string, unknown>
  query: string
  pinned: boolean
  pin: () => void
  unpin: () => void
  addTab?: (type: string, title: string, state?: Record<string, unknown>) => string | undefined
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
