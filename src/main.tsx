import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createRuntime, getAppWrappers } from './core/runtime';
import { setRuntime } from './core/runtime/instance';
import { discoverPlugins } from './core/plugin-system/plugin-discovery';
import { parseReadmeMetadata, mergeReadmeIntoPlugin } from './core/plugin-system/readme-metadata';
import './styles/global.css';

function renderApp() {
  const wrappers = getAppWrappers() as React.ComponentType<{ children: React.ReactNode }>[];

  let app = <App />;
  for (const Wrapper of wrappers) {
    app = <Wrapper>{app}</Wrapper>;
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {app}
    </React.StrictMode>,
  );
}

async function bootstrap() {
  const runtime = await createRuntime();
  setRuntime(runtime);

  const pluginModules = import.meta.glob('./plugins/*/index.ts', { eager: true });
  const plugins = discoverPlugins(pluginModules);

  const readmeModules = import.meta.glob('./plugins/*/README.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
  for (const [path, raw] of Object.entries(readmeModules)) {
    const meta = parseReadmeMetadata(raw);
    if (!meta) continue;
    const pluginId = path.match(/plugins\/([^/]+)\//)?.[1];
    if (!pluginId) continue;
    const plugin = plugins.find(p => p.id === pluginId);
    if (plugin) {
      mergeReadmeIntoPlugin(plugin, meta);
      console.log(`[BOOT] Merged README metadata for plugin: ${pluginId}`);
    }
  }

  console.log(`[BOOT] Discovered ${plugins.length} plugin(s): ${plugins.map(p => p.id).join(', ')}`);

  await runtime.init(plugins);
  renderApp();
}

bootstrap();
