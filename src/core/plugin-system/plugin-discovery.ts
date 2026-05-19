import type { Plugin } from './types';

function isPluginObject(value: unknown): value is Plugin {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string'
  );
}

export function discoverPlugins(modules: Record<string, unknown>): Plugin[] {
  const plugins: Plugin[] = [];

  for (const [path, mod] of Object.entries(modules)) {
    const exports = mod as Record<string, unknown>;
    let found = false;
    for (const [exportName, value] of Object.entries(exports)) {
      if (isPluginObject(value)) {
        plugins.push(value);
        console.log(`[PLUGIN-LOADER] Loaded plugin: ${value.id} (${path}#${exportName})`);
        found = true;
      }
    }
    if (!found) {
      console.warn(`[PLUGIN-LOADER] No valid Plugin export in ${path}`);
    }
  }

  return plugins;
}
