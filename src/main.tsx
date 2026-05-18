import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createRuntime, getAppWrappers } from './core/runtime';
import { setRuntime } from './core/runtime/instance';
import { fsPlugin } from './plugins/fs';
import { searchPlugin } from './plugins/search';
import { gitPlugin } from './plugins/git';
import { taskPlugin } from './plugins/task';
import { execPlugin } from './plugins/exec';
import { browserPlugin } from './plugins/browser';
import { aiPlugin } from './plugins/ai';
import { helpPlugin } from './plugins/help';
import { actionsPlugin } from './plugins/actions';
import { feedbackPlugin } from './plugins/feedback';
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
  await runtime.init([fsPlugin, searchPlugin, gitPlugin, taskPlugin, execPlugin, browserPlugin, aiPlugin, helpPlugin, actionsPlugin, feedbackPlugin]);
  renderApp();
}

bootstrap();
