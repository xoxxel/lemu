export type SettingsScope = 'system' | 'workspace' | 'session';

export interface SettingDefinition {
  key: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  defaultValue?: unknown;
  options?: string[];
  category?: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
  defaultValue?: unknown;
  definition?: SettingDefinition;
  source: 'default' | 'user' | 'session';
  scope: SettingsScope;
}

export type SettingsSource = 'default' | 'user' | 'session';

export interface SettingsUIState {
  focusIndex: number;
  editing: boolean;
  editValue: string;
  filter: string;
  scope: SettingsScope;
}
