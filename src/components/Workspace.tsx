import { forwardRef } from 'react';
import type { Tab } from '../core/tabs/types';
import { getRuntime } from '../core/runtime/instance';

interface WorkspaceProps {
  activeTab: Tab | null;
}

function renderTabContent(tab: Tab): JSX.Element | null {
  const Component = getRuntime().viewComponentMap[tab.type];
  if (!Component) return <div className="empty-state">No content for this tab type.</div>;
  return <Component state={tab.state ?? {}} />;
}

const Workspace = forwardRef<HTMLDivElement, WorkspaceProps>(
  ({ activeTab }: WorkspaceProps, ref) => {
    return (
      <div className="workspace" ref={ref}>
        <div className="workspace-tab-content">
          {activeTab ? renderTabContent(activeTab) : (
            <div className="welcome">
              <div className="title">lemu</div>
              <div className="subtitle">terminal workspace</div>
              <div className="hint">
                Type any command for the shell, <kbd>/</kbd> for internal commands, or <kbd>@command</kbd> for instant help
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default Workspace;
