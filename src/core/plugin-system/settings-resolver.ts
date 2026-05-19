import { appContext } from '../context';
import type { PluginSettings } from './types';

const SETTINGS_NS = 'plugin:settings';
const OVERRIDE_NS = 'plugin:settings:override';

export function resolveSettings(pluginId: string, defaults: PluginSettings = {}): PluginSettings {
  const savedKey = `${SETTINGS_NS}:${pluginId}`;
  const overrideKey = `${OVERRIDE_NS}:${pluginId}`;

  const saved = appContext.get<PluginSettings>(savedKey) ?? {};
  const overrides = appContext.get<PluginSettings>(overrideKey) ?? {};

  return { ...defaults, ...saved, ...overrides };
}

export function saveSettings(pluginId: string, settings: PluginSettings): void {
  const key = `${SETTINGS_NS}:${pluginId}`;
  appContext.set(key, { ...appContext.get<PluginSettings>(key), ...settings });
}

export function applySettingsOverride(pluginId: string, overrides: PluginSettings): void {
  const key = `${OVERRIDE_NS}:${pluginId}`;
  const existing = appContext.get<PluginSettings>(key) ?? {};
  appContext.set(key, { ...existing, ...overrides });
}

export function getSettings(pluginId: string): PluginSettings {
  const key = `${SETTINGS_NS}:${pluginId}`;
  return appContext.get<PluginSettings>(key) ?? {};
}

export function clearSettings(pluginId: string): void {
  appContext.remove(`${SETTINGS_NS}:${pluginId}`);
  appContext.remove(`${OVERRIDE_NS}:${pluginId}`);
}
