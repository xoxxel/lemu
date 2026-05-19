import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const calculatorDefaultSettings: PluginSettings = {
  precision: 12,
  exponentialThreshold: 1e15,
  smallThreshold: 1e-6,
};

export const calculatorSettingsSchema: PluginSettingsSchema = {
  precision: {
    type: 'number',
    label: 'Computation precision',
    description: 'Number of significant digits for results',
  },
  exponentialThreshold: {
    type: 'number',
    label: 'Exponential notation threshold',
    description: 'Values above this use exponential notation',
  },
};
