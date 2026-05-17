import type { PluginAction } from './types'

export const pinAction: PluginAction = {
  id: 'pin',
  title: 'Pin to sidebar',
  description: 'Keep this tab visible in the sidebar',
  aliases: ['bookmark'],
  handler: async (ctx) => {
    ctx.pin()
    return ctx.pinned ? 'Already pinned' : 'Pinned'
  },
}

export const unpinAction: PluginAction = {
  id: 'unpin',
  title: 'Unpin from sidebar',
  description: 'Remove this tab from the sidebar',
  aliases: ['unbookmark'],
  handler: async (ctx) => {
    ctx.unpin()
    return ctx.pinned ? 'Unpinned' : 'Not pinned'
  },
}

export const standardActions: PluginAction[] = [pinAction, unpinAction]
