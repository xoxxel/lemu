import type { Plugin } from '../../core/plugin-system/types';
import type { PluginContext } from '../../core/plugin-system';
import { coderManifest } from './manifest';
import { coderDefaultSettings, coderSettingsSchema } from './settings';
import { coderCommand } from './coder-command';
import { coderDocs } from './docs';

function syncSettingsToContext(ctx: PluginContext): void {
  const appCtx = ctx.context;
  const settings = ctx.getSettings<typeof coderDefaultSettings>();
  const s = settings || coderDefaultSettings;
  appCtx.set('coder:engine', s.engine);
  appCtx.set('coder:provider', s.provider);
  appCtx.set('coder:model', s.model);
  appCtx.set('coder:temperature', s.temperature);
  appCtx.set('coder:maxTokens', s.maxTokens);
  appCtx.set('coder:includeContext', s.includeContext);
}

export const coderPlugin: Plugin = {
  id: 'coder',
  name: 'AI Coder',
  version: '0.2.0',
  description: 'AI-powered code editing — generates edit proposals through the edit pipeline',
  commands: [coderCommand],
  manifest: coderManifest,
  settings: coderDefaultSettings,
  settingsSchema: coderSettingsSchema,
  docs: coderDocs,

  async onReady(ctx: PluginContext): Promise<void> {
    syncSettingsToContext(ctx);
  },
};
