import type { Tab } from '../core/tabs/types';

interface MainTabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  pinnedTabs: Set<string>;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export default function MainTabBar({ tabs, activeTabId, pinnedTabs, onSelect, onClose, onTogglePin }: MainTabBarProps) {
  return (
    <div className="main-tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`main-tab ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => onSelect(tab.id)}
        >
          <span className="main-tab-icon">{tab.icon}</span>
          <span className="main-tab-label">{tab.title}</span>
          <span
            className="main-tab-pin"
            onClick={(e) => { e.stopPropagation(); onTogglePin(tab.id); }}
            title={pinnedTabs.has(tab.id) ? 'Unpin' : 'Pin'}
          >
            {pinnedTabs.has(tab.id) ? '\u2605' : '\u2606'}
          </span>
          {tab.closable && (
            <span className="main-tab-close" onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}>
              &times;
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
