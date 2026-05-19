import type { Plugin } from '../../core/plugin-system/types';
import { feedbackManifest } from './manifest';
import { feedbackDefaultSettings, feedbackSettingsSchema } from './settings';

export const feedbackPlugin: Plugin = {
  id: 'feedback',
  name: 'Command Feedback',
  version: '0.1.0',
  description: 'Global command feedback system',
  manifest: feedbackManifest,
  settings: feedbackDefaultSettings,
  settingsSchema: feedbackSettingsSchema,
};
