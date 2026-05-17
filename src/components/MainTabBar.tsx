import type { Tab } from '../core/tabs/types';

interface MainTabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export default function MainTabBar({ tabs, activeTabId, onSelect, onClose }: MainTabBarProps) {
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
