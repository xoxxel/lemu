import { useRef, useEffect, useState } from 'react';
import { parseAnsi, stripAnsi } from '../core/terminal/ansi-parser';
import type { AnsiChunk } from '../core/terminal/ansi-parser';

interface TerminalBlockProps {
  data: string[];
  command: string;
  isRunning: boolean;
}

export default function TerminalBlock({ data, command, isRunning }: TerminalBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (contentRef.current && expanded) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [data, expanded]);

  const fullText = data.join('');
  const plainText = stripAnsi(fullText);
  const lines = plainText.split('\n').filter(Boolean);

  if (lines.length === 0 && !isRunning) return null;

  return (
    <div className="terminal-block">
      <div className="terminal-block-header" onClick={() => setExpanded(!expanded)}>
        <span className="terminal-block-arrow">{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className="terminal-block-command">{'> '}{command}</span>
        {isRunning && <span className="terminal-block-spinner">running...</span>}
        <span className="terminal-block-lines">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
      </div>
      {expanded && (
        <div className="terminal-block-content" ref={contentRef}>
          {renderAnsiChunks(parseAnsi(fullText))}
        </div>
      )}
    </div>
  );
}

function renderAnsiChunks(chunks: AnsiChunk[]): JSX.Element[] {
  const elements: JSX.Element[] = [];
  let key = 0;

  for (const chunk of chunks) {
    const style: React.CSSProperties = {};
    if (chunk.bold) style.fontWeight = 'bold';
    if (chunk.dim) style.opacity = 0.7;
    if (chunk.italic) style.fontStyle = 'italic';
    if (chunk.underline) style.textDecoration = 'underline';
    if (chunk.foreground) style.color = chunk.foreground;
    if (chunk.background) style.backgroundColor = chunk.background;

    const lines = chunk.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) elements.push(<br key={`br-${key}`} />);
      if (lines[i]) {
        elements.push(
          <span key={`s-${key++}`} style={Object.keys(style).length ? style : undefined}>
            {lines[i]}
          </span>
        );
      }
    }
  }

  return elements;
}
