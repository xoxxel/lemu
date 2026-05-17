import { forwardRef } from 'react';
import type { AutocompleteItem } from '../core/commands/types';

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  suggestions: AutocompleteItem[];
  selectedIndex: number;
  onSuggestionClick: (index: number) => void;
}

const InputBar = forwardRef<HTMLInputElement, InputBarProps>(
  ({ value, onChange, onKeyDown, suggestions, selectedIndex, onSuggestionClick }, ref) => {
    return (
      <div className="input-bar-container">
        {suggestions.length > 0 && (
          <div className="command-menu">
            {suggestions.map((item, idx) => (
              <div
                key={item.value}
                className={`command-menu-item ${idx === selectedIndex ? 'selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSuggestionClick(idx);
                }}
              >
                <span className="cmd-name">{item.value}</span>
                {item.description && <span className="cmd-desc">{item.description}</span>}
                {item.type && <span className="cmd-type">{item.type}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="input-bar">
          <span className="prompt">{value.startsWith('!') ? '!' : '>'}</span>
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
            <span className="hint">Enter to run</span>
          )}
        </div>
      </div>
    );
  }
);

export default InputBar;
