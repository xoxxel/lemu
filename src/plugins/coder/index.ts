import type { Plugin } from '../../core/plugin-system/types';
import { coderManifest } from './manifest';
import { coderDefaultSettings, coderSettingsSchema } from './settings';
import { coderCommand } from './coder-command';
import { coderDocs } from './docs';

export const coderPlugin: Plugin = {
  id: 'coder',
  name: 'AI Coder',
  version: '0.1.0',
  description: 'AI-powered code editing — generates edit proposals through the edit pipeline',
  commands: [coderCommand],
  manifest: coderManifest,
  settings: coderDefaultSettings,
  settingsSchema: coderSettingsSchema,
  docs: coderDocs,
};
