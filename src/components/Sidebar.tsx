interface PinnedEntry {
  id: string;
  title: string;
}

interface SidebarProps {
  cwd: string;
  pinnedTabs: PinnedEntry[];
  onPinnedTabClick: (id: string) => void;
}

export default function Sidebar({ cwd, pinnedTabs, onPinnedTabClick }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">lemu</div>

      <div className="sidebar-cwd">
        <span className="icon">{'>'}</span>
        {cwd}
      </div>

      {pinnedTabs.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Pinned</div>
          {pinnedTabs.map((entry) => (
            <div
              key={entry.id}
              className="sidebar-item"
              onClick={() => onPinnedTabClick(entry.id)}
            >
              <span className="icon">{'\u25CB'}</span>
              <span className="sidebar-item-label">{entry.title}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
