import { forwardRef } from 'react';
import type { AutocompleteItem, CommandExample } from '../core/commands/types';

interface ContextualHelp {
  name: string;
  description: string;
  usage?: string;
  examples?: CommandExample[];
}

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  suggestions: AutocompleteItem[];
  selectedIndex: number;
  onSuggestionClick: (index: number) => void;
  contextualHelp?: ContextualHelp | null;
}

const InputBar = forwardRef<HTMLInputElement, InputBarProps>(
  ({ value, onChange, onKeyDown, suggestions, selectedIndex, onSuggestionClick, contextualHelp }, ref) => {
    const showContextual = contextualHelp && contextualHelp.examples && contextualHelp.examples.length > 0;
    return (
      <div className="input-bar-container">
        {(suggestions.length > 0 || showContextual) && (
          <div className="command-menu">
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
            {showContextual && suggestions.length > 0 && <div className="contextual-help-separator" />}
            {showContextual && (
              <div className="contextual-help">
                <div className="contextual-help-header">
                  <span className="contextual-help-usage">{contextualHelp.usage}</span>
                  <span className="contextual-help-name">/{contextualHelp.name}</span>
                </div>
                <div className="contextual-help-examples">
                  {(contextualHelp.examples || []).map((ex, i) => (
                    <div key={i} className="contextual-help-example">
                      <span className="contextual-help-input">{ex.input}</span>
                      <span className="contextual-help-desc">{ex.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="input-bar">
          <span className="prompt">{value.startsWith('!') || value.startsWith('@') ? value[0] : '>'}</span>
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
          {value && suggestions.length === 0 && !showContextual && (
            <span className="hint">Enter to run</span>
          )}
        </div>
      </div>
    );
  }
);

export default InputBar;
