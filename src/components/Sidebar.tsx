interface SidebarProps {
  cwd: string;
  recentFiles: string[];
  openTabs: string[];
  activeTab: string | null;
  activeTasks: number;
  onTabClick: (tab: string) => void;
}

export default function Sidebar({ cwd, recentFiles, openTabs, activeTab, activeTasks, onTabClick }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">lemu</div>

      <div className="sidebar-cwd">
        <span className="icon">{'>'}</span>
        {cwd}
      </div>

      {openTabs.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Open Tabs</div>
          {openTabs.map((tab) => (
            <div
              key={tab}
              className={`sidebar-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => onTabClick(tab)}
            >
              <span className="icon">\u25C9</span>
              {tab}
            </div>
          ))}
        </div>
      )}

      {recentFiles.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Recent Files</div>
          {recentFiles.map((file) => (
            <div key={file} className="sidebar-item" onClick={() => onTabClick(file)}>
              <span className="icon">\u25CB</span>
              {file}
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-section-title">Active Tasks</div>
        <div className="sidebar-item">
          <span className="icon">\u25A0</span>
          {activeTasks} task{activeTasks !== 1 ? 's' : ''}
        </div>
      </div>
    </aside>
  );
}
