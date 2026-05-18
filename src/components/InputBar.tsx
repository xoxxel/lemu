import { forwardRef, useRef, useEffect } from 'react';
import type { AutocompleteItem } from '../core/commands/types';

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  suggestions: AutocompleteItem[];
  selectedIndex: number;
  onSuggestionClick: (index: number) => void;
  hint?: string | null;
  modeLabel?: string | null;
}

const InputBar = forwardRef<HTMLInputElement, InputBarProps>(
  ({ value, onChange, onKeyDown, suggestions, selectedIndex, onSuggestionClick, hint, modeLabel }, ref) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!menuRef.current || selectedIndex < 0) return;
      const child = menuRef.current.children[selectedIndex] as HTMLElement | undefined;
      if (child) {
        child.scrollIntoView({ block: 'nearest' });
      }
    }, [selectedIndex]);

    const promptChar = value.startsWith('/') || value.startsWith('!') ? '>' : value.startsWith('@') ? '@' : value.startsWith(':') ? ':' : '>';

    return (
      <div className="input-bar-container">
        {suggestions.length > 0 && (
          <div ref={menuRef} className="command-menu">
            {suggestions.map((item, idx) => (
              <div
                key={item.value}
                className={`command-menu-item ${item.type === 'help' ? 'cmd-help' : ''} ${idx === selectedIndex ? 'selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSuggestionClick(idx);
                }}
              >
                {item.type === 'help' ? (
                  <>
                    <span className="cmd-usage">{item.value}</span>
                    {item.description && <span className="cmd-desc">{item.description}</span>}
                    <span className="cmd-type">usage</span>
                  </>
                ) : (
                  <>
                    <span className="cmd-name">{item.value}</span>
                    {item.description && <span className="cmd-desc">{item.description}</span>}
                    {item.type && <span className="cmd-type">{item.type}</span>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="input-bar">
          <span className="prompt">{promptChar}</span>
          {modeLabel && (
            <span className="mode-label">{modeLabel}</span>
          )}
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={value ? '' : "Type / to browse commands..."}
            spellCheck={false}
            autoFocus
          />
          {value && suggestions.length === 0 && (
            <span className="hint">{hint ?? 'Enter to run'}</span>
          )}
        </div>
      </div>
    );
  }
);

export default InputBar;
